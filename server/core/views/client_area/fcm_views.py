from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fcm_token_register(request):
    """Store FCM device token on the authenticated user. Optional phone must match."""
    token = (request.data.get('fcm_token') or '').strip()
    if not token:
        return Response(
            {'detail': 'fcm_token is required.', 'errors': {'fcm_token': ['This field is required.']}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    phone = (request.data.get('phone') or '').strip()
    if phone and phone != request.user.phone:
        return Response(
            {'detail': 'Phone does not match the authenticated user.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    request.user.fcm_token = token
    request.user.save(update_fields=['fcm_token', 'updated_at'])
    return Response({'detail': 'FCM token saved.'})
