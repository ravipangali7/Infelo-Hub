from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from core.models import PayoutAccount
from core.models import PayoutAccountStatus
from core.serializers import PayoutAccountSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import payout_account_summary

PAYOUT_ACCOUNT_ORDER_FIELDS = ['id', 'payment_method', 'status', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def payout_account_list(request):
    if request.method == 'POST':
        serializer = PayoutAccountSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    qs = PayoutAccount.objects.select_related('user')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(user__phone__icontains=search) | Q(user__name__icontains=search) | Q(bank_account_no__icontains=search)
        if search.isdigit():
            q |= Q(user_id=int(search)) | Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, PayoutAccountSerializer, {'request': request}, PAYOUT_ACCOUNT_ORDER_FIELDS,
        summary_builder=payout_account_summary,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def payout_account_detail(request, pk):
    try:
        acc = PayoutAccount.objects.select_related('user').get(pk=pk)
    except PayoutAccount.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        serializer = PayoutAccountSerializer(acc, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    if request.method == 'DELETE':
        acc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = PayoutAccountSerializer(acc, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def payout_account_approve(request, pk):
    try:
        acc = PayoutAccount.objects.get(pk=pk)
    except PayoutAccount.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    acc.status = PayoutAccountStatus.APPROVED
    acc.reject_reason = ''
    acc.save()
    serializer = PayoutAccountSerializer(acc, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def payout_account_reject(request, pk):
    try:
        acc = PayoutAccount.objects.get(pk=pk)
    except PayoutAccount.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    reason = str(request.data.get('reason', request.data.get('reject_reason', '')) or '').strip()
    if not reason:
        return Response({'detail': 'Reject reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
    acc.status = PayoutAccountStatus.REJECTED
    acc.reject_reason = reason
    acc.save()
    serializer = PayoutAccountSerializer(acc, context={'request': request})
    return Response(serializer.data)
