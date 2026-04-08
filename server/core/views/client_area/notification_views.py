from django.db.models import Prefetch
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from core.models import PushNotification, PushNotificationUserStatus
from core.serializers import ClientPushNotificationInboxSerializer


def _inbox_queryset(user):
    status_qs = PushNotificationUserStatus.objects.filter(user=user)
    return (
        PushNotification.objects.filter(receivers=user)
        .distinct()
        .order_by('-created_at')
        .prefetch_related(Prefetch('user_statuses', queryset=status_qs))
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    qs = _inbox_queryset(request.user)
    unread_only = request.query_params.get('unread_only', '').lower() in ('1', 'true', 'yes')
    read_ids = PushNotificationUserStatus.objects.filter(user=request.user).values_list(
        'push_notification_id', flat=True
    )
    if unread_only:
        qs = qs.exclude(pk__in=read_ids)
    ser = ClientPushNotificationInboxSerializer(qs, many=True, context={'request': request})
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    read_ids = PushNotificationUserStatus.objects.filter(user=request.user).values_list(
        'push_notification_id', flat=True
    )
    n = PushNotification.objects.filter(receivers=request.user).exclude(pk__in=read_ids).distinct().count()
    return Response({'unread_count': n})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_all_read(request):
    user = request.user
    now = timezone.now()
    ids = (
        PushNotification.objects.filter(receivers=user)
        .values_list('id', flat=True)
        .distinct()
    )
    for nid in ids:
        obj, _ = PushNotificationUserStatus.objects.get_or_create(
            user=user,
            push_notification_id=nid,
            defaults={'read_at': now},
        )
        obj.read_at = now
        obj.save(update_fields=['read_at'])
    return Response({'detail': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_all_unread(request):
    PushNotificationUserStatus.objects.filter(user=request.user).delete()
    return Response({'detail': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_read(request, pk):
    user = request.user
    try:
        push = PushNotification.objects.get(pk=pk, receivers=user)
    except PushNotification.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    now = timezone.now()
    obj, _ = PushNotificationUserStatus.objects.get_or_create(
        user=user,
        push_notification=push,
        defaults={'read_at': now},
    )
    obj.read_at = now
    obj.save(update_fields=['read_at'])
    return Response({'detail': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_unread(request, pk):
    user = request.user
    if not PushNotification.objects.filter(pk=pk, receivers=user).exists():
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    PushNotificationUserStatus.objects.filter(user=user, push_notification_id=pk).delete()
    return Response({'detail': 'ok'})
