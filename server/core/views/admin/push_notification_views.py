from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from core.models import PushNotification, User
from core.serializers import PushNotificationSerializer, PushNotificationListSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range, flatten_multipart_data, build_absolute_uri
from core.admin_summary import count_only_summary
from core.firebase_fcm import ensure_firebase_app, send_push_to_token

PN_ORDER_FIELDS = ['id', 'title', 'created_at', 'updated_at']


def _push_notification_writable_data(request):
    """
    flatten_multipart_data collapses duplicate keys to a single scalar (last value),
    but receiver_ids must stay a list for PrimaryKeyRelatedField(many=True).
    """
    data = flatten_multipart_data(request.data)
    rd = request.data
    if hasattr(rd, 'getlist') and 'receiver_ids' in rd:
        data['receiver_ids'] = rd.getlist('receiver_ids')
    elif 'receiver_ids' in data:
        val = data['receiver_ids']
        if val is not None and not isinstance(val, (list, tuple)):
            data['receiver_ids'] = [val]
    return data


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def push_notification_list_create(request):
    # Nested @api_view handlers must receive Django HttpRequest, not DRF Request (see banner_list_create).
    raw_request = request._request
    if request.method == 'POST':
        return push_notification_create(raw_request)
    return push_notification_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def push_notification_list(request):
    qs = PushNotification.objects.annotate(receivers_count_annotated=Count('receivers'))
    search = (request.query_params.get('search') or '').strip()
    if search and search.lower() != 'undefined':
        qs = qs.filter(title__icontains=search)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs,
        request,
        PushNotificationListSerializer,
        {'request': request},
        PN_ORDER_FIELDS,
        default_order='-created_at',
        summary_builder=count_only_summary,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def push_notification_create(request):
    data = _push_notification_writable_data(request)
    serializer = PushNotificationSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def push_notification_detail_update_delete(request, pk):
    if request.method == 'GET':
        try:
            obj = PushNotification.objects.prefetch_related('receivers__package').get(pk=pk)
        except PushNotification.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PushNotificationSerializer(obj, context={'request': request})
        return Response(serializer.data)
    try:
        obj = PushNotification.objects.get(pk=pk)
    except PushNotification.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        data = _push_notification_writable_data(request)
        serializer = PushNotificationSerializer(obj, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def push_notification_resolve_phones(request):
    """Map a list of phone strings to user ids (exact match after strip)."""
    raw = request.data.get('phones')
    if raw is None:
        return Response({'detail': 'phones is required (list of strings).'}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(raw, str):
        parts = [p.strip() for p in raw.replace(',', '\n').splitlines() if p.strip()]
    elif isinstance(raw, list):
        parts = [str(p).strip() for p in raw if str(p).strip()]
    else:
        return Response({'detail': 'phones must be a list or string.'}, status=status.HTTP_400_BAD_REQUEST)
    if not parts:
        return Response({'user_ids': [], 'missing': []})

    users = User.objects.filter(phone__in=parts).values('id', 'phone')
    by_phone = {u['phone']: u['id'] for u in users}
    user_ids = []
    missing = []
    for p in parts:
        if p in by_phone:
            uid = by_phone[p]
            if uid not in user_ids:
                user_ids.append(uid)
        else:
            missing.append(p)
    return Response({'user_ids': user_ids, 'missing': missing})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def push_notification_send_chunk(request, pk):
    """Send FCM to a slice of receivers (by stable user id order)."""
    if not ensure_firebase_app():
        return Response(
            {'detail': 'Firebase is not configured. Set FIREBASE_CREDENTIALS_PATH to a valid service account JSON file.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    try:
        notification = PushNotification.objects.get(pk=pk)
    except PushNotification.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    try:
        offset = int(request.data.get('offset', 0))
        limit = int(request.data.get('limit', 25))
    except (TypeError, ValueError):
        return Response({'detail': 'offset and limit must be integers.'}, status=status.HTTP_400_BAD_REQUEST)
    if offset < 0 or limit < 1 or limit > 100:
        return Response({'detail': 'Invalid offset/limit.'}, status=status.HTTP_400_BAD_REQUEST)

    total = notification.receivers.count()
    ids = list(
        notification.receivers.order_by('id').values_list('id', flat=True)[offset : offset + limit]
    )
    users = User.objects.filter(id__in=ids).order_by('id')

    image_url = None
    if notification.image:
        image_url = build_absolute_uri(request, notification.image.url)

    failures = []
    success_count = 0
    failure_count = 0
    processed = 0

    for user in users:
        processed += 1
        tok = (user.fcm_token or '').strip()
        if not tok:
            failure_count += 1
            failures.append({'user_id': user.id, 'phone': user.phone, 'error': 'No FCM token'})
            continue
        err = send_push_to_token(
            token=tok,
            title=notification.title,
            body=notification.message,
            image_url=image_url,
            data={'type': 'push_notification', 'push_id': str(notification.id)},
        )
        if err:
            failure_count += 1
            failures.append({'user_id': user.id, 'phone': user.phone, 'error': err})
        else:
            success_count += 1

    return Response({
        'total': total,
        'offset': offset,
        'limit': limit,
        'processed': processed,
        'success_count': success_count,
        'failure_count': failure_count,
        'failures': failures[:50],
    })
