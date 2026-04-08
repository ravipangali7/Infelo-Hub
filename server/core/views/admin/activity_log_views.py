from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db.models import Q
from django.utils import timezone
from core.models import ActivityLogs
from core.serializers import ActivityLogsSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import activity_log_summary
import re

ACTIVITY_LOG_ORDER_FIELDS = ['id', 'event_name', 'created_at', 'event_timestamp']


def _parse_user_agent(ua: str) -> dict:
    """Extract device_type, os_name, os_version, browser_name, browser_version from UA string."""
    result = {
        'device_type': 'desktop',
        'os_name': '',
        'os_version': '',
        'browser_name': '',
        'browser_version': '',
    }
    if not ua:
        return result

    ua_lower = ua.lower()

    # Device type
    if any(x in ua_lower for x in ['mobile', 'android', 'iphone', 'ipod']):
        result['device_type'] = 'mobile'
    elif 'tablet' in ua_lower or 'ipad' in ua_lower:
        result['device_type'] = 'tablet'

    # OS detection
    os_patterns = [
        ('Windows NT 10.0', 'Windows', '10'),
        ('Windows NT 6.3', 'Windows', '8.1'),
        ('Windows NT 6.1', 'Windows', '7'),
        ('Android', 'Android', ''),
        ('iPhone OS', 'iOS', ''),
        ('Mac OS X', 'macOS', ''),
        ('Linux', 'Linux', ''),
    ]
    for pattern, os_name, os_ver in os_patterns:
        if pattern.lower() in ua_lower:
            result['os_name'] = os_name
            if not os_ver:
                m = re.search(rf'{re.escape(pattern.split()[0])} ([\d_.]+)', ua, re.IGNORECASE)
                result['os_version'] = (m.group(1).replace('_', '.') if m else '')
            else:
                result['os_version'] = os_ver
            break

    # Browser detection (order matters — check Edge/Chrome before generic)
    browser_patterns = [
        (r'Edg/([\d.]+)', 'Edge'),
        (r'OPR/([\d.]+)', 'Opera'),
        (r'Firefox/([\d.]+)', 'Firefox'),
        (r'SamsungBrowser/([\d.]+)', 'Samsung Browser'),
        (r'Chrome/([\d.]+)', 'Chrome'),
        (r'Safari/([\d.]+)', 'Safari'),
    ]
    for pattern, browser_name in browser_patterns:
        m = re.search(pattern, ua)
        if m:
            result['browser_name'] = browser_name
            result['browser_version'] = m.group(1)
            break

    return result


def _build_log_kwargs(data: dict, user, is_guest: bool, ua_info: dict) -> dict:
    """Convert a raw event dict into ActivityLogs field kwargs."""
    return {
        'user': user,
        'is_guest': is_guest,
        'platform': (data.get('platform') or '')[:50],
        'session_id': (data.get('session_id') or '')[:255],
        'session_number': data.get('session_number') or None,
        'event_name': (data.get('event_name') or '')[:255],
        'event_timestamp': timezone.now(),
        'event_value': (data.get('event_value') or '')[:255],
        'event_properties': data.get('event_properties') or {},
        'page_url': (data.get('page_url') or '')[:200],
        'page_path': (data.get('page_path') or '')[:500],
        'page_title': (data.get('page_title') or '')[:255],
        'referrer_url': (data.get('referrer_url') or '')[:200],
        'scroll_depth': data.get('scroll_depth') or None,
        'time_on_page': data.get('time_on_page') or None,
        'clicks_count': int(data.get('clicks_count') or 0),
        'timezone': (data.get('timezone') or '')[:50],
        'device_type': ua_info['device_type'],
        'os_name': ua_info['os_name'],
        'os_version': ua_info['os_version'],
        'browser_name': ua_info['browser_name'],
        'browser_version': ua_info['browser_version'],
    }


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def track_event(request):
    """
    Public tracking endpoint — accepts a single event OR a batch via the `events` key.
    No auth classes so an expired/invalid token never causes a 401 redirect.
    User identity is resolved manually from the Authorization header.
    All DB writes are fire-and-forget: if the DB is busy the event is silently dropped.
    """
    ua = request.META.get('HTTP_USER_AGENT', '')
    ua_info = _parse_user_agent(ua)

    # Resolve user from token without raising
    user = None
    is_guest = True
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Token '):
        token_key = auth_header.split(' ', 1)[1].strip()
        try:
            from rest_framework.authtoken.models import Token as AuthToken
            auth_token = AuthToken.objects.select_related('user').get(key=token_key)
            user = auth_token.user
            is_guest = False
        except Exception:
            pass

    payload = request.data
    # Support both single-event and batched { events: [...] } payloads
    events = payload.get('events') if isinstance(payload, dict) else None
    if events and isinstance(events, list):
        # Batch path — build all objects then bulk_create in one write
        objs = []
        for evt in events[:50]:  # cap at 50 events per batch
            if not isinstance(evt, dict):
                continue
            name = (evt.get('event_name') or '').strip()
            if not name:
                continue
            kwargs = _build_log_kwargs(evt, user, is_guest, ua_info)
            objs.append(ActivityLogs(**kwargs))
        if objs:
            try:
                ActivityLogs.objects.bulk_create(objs, ignore_conflicts=True)
            except Exception:
                pass
    else:
        # Single-event path (legacy / sendBeacon fallback)
        name = (payload.get('event_name') or '').strip() if isinstance(payload, dict) else ''
        if name:
            kwargs = _build_log_kwargs(payload, user, is_guest, ua_info)
            try:
                ActivityLogs.objects.create(**kwargs)
            except Exception:
                pass

    return Response({'detail': 'ok'}, status=http_status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def activity_log_list(request):
    qs = ActivityLogs.objects.select_related('user')
    platform = request.query_params.get('platform')
    if platform:
        qs = qs.filter(platform=platform)
    is_guest = request.query_params.get('is_guest')
    if is_guest is not None:
        qs = qs.filter(is_guest=is_guest.lower() == 'true')
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(event_name__icontains=search) | Q(page_path__icontains=search) | Q(page_title__icontains=search)
        if search.isdigit():
            q |= Q(pk=int(search)) | Q(user_id=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, ActivityLogsSerializer, {'request': request}, ACTIVITY_LOG_ORDER_FIELDS,
        summary_builder=activity_log_summary,
    )
