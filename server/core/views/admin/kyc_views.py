from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from core.models import User
from core.models import KycStatus
from core.serializers import UserKycListSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import kyc_queue_summary

KYC_ORDER_FIELDS = ['id', 'phone', 'name', 'kyc_status', 'created_at']


@api_view(['GET'])
@permission_classes([IsAdminUser])
def kyc_list(request):
    qs = User.objects.select_related('package').filter(kyc_status__in=[KycStatus.PENDING, KycStatus.APPROVED, KycStatus.REJECTED])
    kyc_filter = request.query_params.get('kyc_status')
    if kyc_filter:
        qs = qs.filter(kyc_status=kyc_filter)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(phone__icontains=search) | Q(name__icontains=search) | Q(username__icontains=search)
        if search.isdigit():
            q |= Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, UserKycListSerializer, {'request': request}, KYC_ORDER_FIELDS,
        summary_builder=kyc_queue_summary,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def kyc_approve(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    user.kyc_status = KycStatus.APPROVED
    user.kyc_reject_reason = ''
    user.save()
    from core.serializers import UserSerializer
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def kyc_reject(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    reason = request.data.get('reason', request.data.get('reject_reason', ''))
    user.kyc_status = KycStatus.REJECTED
    user.kyc_reject_reason = reason
    user.save()
    from core.serializers import UserSerializer
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)
