from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.serializers import UserSerializer
from core.models import KycStatus
from core.notification_delivery import deliver_push


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def kyc_status(request):
    user = request.user
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def kyc_submit(request):
    user = request.user
    front_uploaded = bool(request.FILES.get('kyc_document_front'))
    back_uploaded = bool(request.FILES.get('kyc_document_back'))
    if front_uploaded:
        user.kyc_document_front = request.FILES['kyc_document_front']
    if back_uploaded:
        user.kyc_document_back = request.FILES['kyc_document_back']
    user.save()
    # Resubmission after rejection: full new upload moves user back to pending review
    if (
        user.kyc_status == KycStatus.REJECTED
        and front_uploaded
        and back_uploaded
    ):
        user.kyc_status = KycStatus.PENDING
        user.kyc_reject_reason = ''
        user.save()
    user.refresh_from_db()
    if (
        (front_uploaded or back_uploaded)
        and user.kyc_document_front
        and user.kyc_document_back
        and user.kyc_status == KycStatus.PENDING
    ):
        deliver_push(
            key='ADMIN_A3',
            context={
                'user_name': user.name or user.phone,
                'user_phone': user.phone,
            },
            staff_only=True,
            payload={'user_id': user.pk},
        )
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def kyc_status_submit(request):
    raw_request = request._request
    if request.method == 'POST':
        return kyc_submit(raw_request)
    return kyc_status(raw_request)
