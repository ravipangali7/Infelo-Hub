from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from core.models import PaymentRequest, SystemWithdrawal, SystemSetting
from core.models import PaymentRequestType, PaymentRequestStatus, SystemWithdrawalStatus
from core.models import User, Transaction, TransactionType, TransactionStatus, TransactionFor
from core.serializers import PaymentRequestSerializer, SystemWithdrawalSerializer
from django.db.models import Q, F
from core.api_utils import error_response, paginate_queryset, filter_queryset_date_range
from core.admin_summary import payment_request_summary, system_withdrawal_summary

WITHDRAWAL_ORDER_FIELDS = ['id', 'amount', 'status', 'created_at', 'updated_at']
SYSTEM_WITHDRAWAL_ORDER_FIELDS = ['id', 'amount', 'status', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def withdrawal_list(request):
    if request.method == 'POST':
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['type'] = PaymentRequestType.WITHDRAW
        serializer = PaymentRequestSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    qs = PaymentRequest.objects.filter(type=PaymentRequestType.WITHDRAW).select_related('user', 'payout_account')
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
        qs, request, PaymentRequestSerializer, {'request': request}, WITHDRAWAL_ORDER_FIELDS,
        summary_builder=payment_request_summary,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def withdrawal_detail(request, pk):
    try:
        pr = PaymentRequest.objects.select_related('user', 'payout_account').get(pk=pk, type=PaymentRequestType.WITHDRAW)
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
def withdrawal_approve(request, pk):
    try:
        with transaction.atomic():
            pr = PaymentRequest.objects.select_for_update().get(pk=pk, type=PaymentRequestType.WITHDRAW)
            if pr.status == PaymentRequestStatus.APPROVED:
                serializer = PaymentRequestSerializer(pr, context={'request': request})
                return Response(serializer.data)
            if pr.status == PaymentRequestStatus.REJECTED:
                return error_response('Rejected withdrawal cannot be approved.', status.HTTP_409_CONFLICT, code='INVALID_STATE')
            user = User.objects.select_for_update().get(pk=pr.user_id)
            wallet = (pr.withdrawal_wallet_type or 'earning').lower()
            if wallet == 'topup':
                if user.topup_wallet < pr.amount:
                    return error_response('Insufficient top-up wallet balance for approval.', status.HTTP_409_CONFLICT, code='LIMIT_VIOLATION')
            else:
                if user.earning_wallet < pr.amount:
                    return error_response('Insufficient earning wallet balance for approval.', status.HTTP_409_CONFLICT, code='LIMIT_VIOLATION')
            pr.status = PaymentRequestStatus.APPROVED
            pr.reject_reason = ''
            pr.paid_date_time = timezone.now()
            pr.save(update_fields=['status', 'reject_reason', 'paid_date_time', 'updated_at'])
            if wallet == 'topup':
                user.topup_wallet -= pr.amount
                user.save(update_fields=['topup_wallet', 'updated_at'])
            else:
                user.earning_wallet -= pr.amount
                user.save(update_fields=['earning_wallet', 'updated_at'])
            SystemSetting.objects.update(balance=F('balance') - pr.amount)
            ledger = Transaction.objects.select_for_update().filter(payment_request=pr).first()
            if ledger:
                ledger.status = TransactionStatus.SUCCESS
                ledger.remarks = f'Withdrawal approved #{pr.pk}'
                ledger.save(update_fields=['status', 'remarks', 'updated_at'])
            else:
                Transaction.objects.create(
                    user=user, amount=pr.amount, transaction_type=TransactionType.DEDUCTED,
                    transaction_for=TransactionFor.WITHDRAWAL, status=TransactionStatus.SUCCESS, is_system=True,
                    remarks=f'Withdrawal approved #{pr.pk}',
                )
    except PaymentRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PaymentRequestSerializer(pr, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def withdrawal_reject(request, pk):
    try:
        pr = PaymentRequest.objects.get(pk=pk, type=PaymentRequestType.WITHDRAW)
    except PaymentRequest.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if pr.status == PaymentRequestStatus.APPROVED:
        return error_response('Approved withdrawal cannot be rejected.', status.HTTP_409_CONFLICT, code='INVALID_STATE')
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


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def system_withdrawal_list(request):
    if request.method == 'POST':
        serializer = SystemWithdrawalSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    qs = SystemWithdrawal.objects.all()
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, SystemWithdrawalSerializer, {'request': request}, SYSTEM_WITHDRAWAL_ORDER_FIELDS,
        summary_builder=system_withdrawal_summary,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def system_withdrawal_detail(request, pk):
    try:
        sw = SystemWithdrawal.objects.get(pk=pk)
    except SystemWithdrawal.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        for key in ['remarks', 'reject_reason', 'amount']:
            if key in request.data:
                setattr(sw, key, request.data[key])
        sw.save()
    if request.method == 'DELETE':
        sw.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = SystemWithdrawalSerializer(sw, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def system_withdrawal_approve(request, pk):
    try:
        sw = SystemWithdrawal.objects.get(pk=pk)
    except SystemWithdrawal.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if sw.status == SystemWithdrawalStatus.APPROVED:
        serializer = SystemWithdrawalSerializer(sw, context={'request': request})
        return Response(serializer.data)
    with transaction.atomic():
        setting = SystemSetting.objects.select_for_update().first()
        if setting and setting.balance < sw.amount:
            return error_response('Insufficient system balance for approval.', status.HTTP_409_CONFLICT, code='LIMIT_VIOLATION')
        sw.status = SystemWithdrawalStatus.APPROVED
        sw.reject_reason = ''
        sw.save()
        SystemSetting.objects.update(balance=F('balance') - sw.amount)
    serializer = SystemWithdrawalSerializer(sw, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def system_withdrawal_reject(request, pk):
    try:
        sw = SystemWithdrawal.objects.get(pk=pk)
    except SystemWithdrawal.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    reason = request.data.get('reason', request.data.get('reject_reason', ''))
    sw.status = SystemWithdrawalStatus.REJECTED
    sw.reject_reason = reason
    sw.save()
    serializer = SystemWithdrawalSerializer(sw, context={'request': request})
    return Response(serializer.data)
