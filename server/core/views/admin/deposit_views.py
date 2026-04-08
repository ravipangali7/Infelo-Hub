from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, F
from django.db import transaction
from core.models import PaymentRequest, SystemSetting
from core.models import PaymentRequestType, PaymentRequestStatus
from core.models import Transaction, TransactionType, TransactionStatus, TransactionFor
from core.serializers import PaymentRequestSerializer
from django.utils import timezone
from core.api_utils import error_response, paginate_queryset, filter_queryset_date_range
from core.admin_summary import payment_request_summary

DEPOSIT_ORDER_FIELDS = ['id', 'amount', 'status', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def deposit_list(request):
    if request.method == 'POST':
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['type'] = PaymentRequestType.DEPOSIT
        serializer = PaymentRequestSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    qs = PaymentRequest.objects.filter(type=PaymentRequestType.DEPOSIT).select_related('user', 'payout_account')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = (
            Q(user__phone__icontains=search)
            | Q(user__name__icontains=search)
            | Q(user__username__icontains=search)
            | Q(payment_transaction_id__icontains=search)
        )
        if search.isdigit():
            q |= Q(user_id=int(search)) | Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, PaymentRequestSerializer, {'request': request}, DEPOSIT_ORDER_FIELDS,
        summary_builder=payment_request_summary,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def deposit_detail(request, pk):
    try:
        pr = PaymentRequest.objects.select_related('user', 'payout_account').get(pk=pk, type=PaymentRequestType.DEPOSIT)
    except PaymentRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        serializer = PaymentRequestSerializer(pr, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    if request.method == 'DELETE':
        pr.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = PaymentRequestSerializer(pr, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def deposit_approve(request, pk):
    try:
        with transaction.atomic():
            pr = PaymentRequest.objects.select_for_update().get(pk=pk, type=PaymentRequestType.DEPOSIT)
            if pr.status == PaymentRequestStatus.APPROVED:
                serializer = PaymentRequestSerializer(pr, context={'request': request})
                return Response(serializer.data)
            if pr.status == PaymentRequestStatus.REJECTED:
                return error_response('Rejected deposit cannot be approved.', status.HTTP_409_CONFLICT, code='INVALID_STATE')
            pr.status = PaymentRequestStatus.APPROVED
            pr.reject_reason = ''
            pr.paid_date_time = timezone.now()
            pr.save(update_fields=['status', 'reject_reason', 'paid_date_time', 'updated_at'])
            user = pr.user
            user.topup_wallet += pr.amount
            user.save(update_fields=['topup_wallet', 'updated_at'])
            SystemSetting.objects.update(balance=F('balance') + pr.amount)
            ledger = Transaction.objects.select_for_update().filter(payment_request=pr).first()
            if ledger:
                ledger.status = TransactionStatus.SUCCESS
                ledger.remarks = f'Deposit approved #{pr.pk}'
                ledger.save(update_fields=['status', 'remarks', 'updated_at'])
            else:
                Transaction.objects.create(
                    user=user, amount=pr.amount, transaction_type=TransactionType.ADDED,
                    transaction_for=TransactionFor.DEPOSIT, status=TransactionStatus.SUCCESS, is_system=True,
                    remarks=f'Deposit approved #{pr.pk}',
                )
    except PaymentRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PaymentRequestSerializer(pr, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def deposit_reject(request, pk):
    try:
        pr = PaymentRequest.objects.get(pk=pk, type=PaymentRequestType.DEPOSIT)
    except PaymentRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if pr.status == PaymentRequestStatus.APPROVED:
        return error_response('Approved deposit cannot be rejected.', status.HTTP_409_CONFLICT, code='INVALID_STATE')
    reason = request.data.get('reason', request.data.get('reject_reason', ''))
    pr.status = PaymentRequestStatus.REJECTED
    pr.reject_reason = reason
    pr.save()
    ledger = Transaction.objects.filter(payment_request=pr).first()
    if ledger:
        ledger.status = TransactionStatus.FAILED
        ledger.save(update_fields=['status', 'updated_at'])
    serializer = PaymentRequestSerializer(pr, context={'request': request})
    return Response(serializer.data)
