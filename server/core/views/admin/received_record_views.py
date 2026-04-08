from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import F, Sum
from django.db import transaction as db_transaction
from decimal import Decimal

from core.models import (
    ReceivedRecord, Vendor, User, Sales, SystemSetting,
    Transaction, TransactionType, TransactionFor, TransactionStatus,
    PaymentStatus,
)
from core.sales_rewards import try_credit_sales_rewards
from core.serializers import ReceivedRecordSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import paid_received_summary

RECEIVED_RECORD_ORDER_FIELDS = ['id', 'name', 'amount', 'created_at', 'updated_at']


def _auto_update_sales_payment_status(sale):
    """Set sale.payment_status based on sum of all linked ReceivedRecords."""
    received_total = (
        ReceivedRecord.objects.filter(sales=sale)
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    new_status = PaymentStatus.PAID if received_total >= sale.total else PaymentStatus.PENDING
    if sale.payment_status != new_status:
        sale.payment_status = new_status
        sale.save(update_fields=['payment_status', 'updated_at'])


def _create_user_received_transaction(user_id, amount, record_pk, name):
    """Create a DEDUCTED transaction for the user when admin records receiving payment from them."""
    Transaction.objects.create(
        user_id=user_id,
        amount=amount,
        transaction_type=TransactionType.DEDUCTED,
        transaction_for=TransactionFor.RECEIVED,
        status=TransactionStatus.SUCCESS,
        is_system=True,
        remarks=f'Received record #{record_pk}: {name}',
    )


def _reverse_user_received_transaction(user_id, amount, record_pk, name):
    """Create an ADDED reversal transaction when a ReceivedRecord is deleted or its user/amount changes."""
    Transaction.objects.create(
        user_id=user_id,
        amount=amount,
        transaction_type=TransactionType.ADDED,
        transaction_for=TransactionFor.RECEIVED,
        status=TransactionStatus.SUCCESS,
        is_system=True,
        remarks=f'Reversal of received record #{record_pk}: {name}',
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def received_record_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return received_record_create(raw_request)
    return received_record_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def received_record_list(request):
    qs = ReceivedRecord.objects.select_related('vendor', 'user', 'sales')
    vendor_id = request.query_params.get('vendor')
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    payment_method = request.query_params.get('payment_method')
    if payment_method:
        qs = qs.filter(payment_method=payment_method)
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(name__icontains=search)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, ReceivedRecordSerializer, {'request': request}, RECEIVED_RECORD_ORDER_FIELDS,
        summary_builder=paid_received_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def received_record_detail(request, pk):
    try:
        obj = ReceivedRecord.objects.select_related('vendor', 'user', 'sales').get(pk=pk)
    except ReceivedRecord.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ReceivedRecordSerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def received_record_create(request):
    serializer = ReceivedRecordSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with db_transaction.atomic():
        obj = serializer.save()

        if obj.vendor_id:
            Vendor.objects.filter(pk=obj.vendor_id).update(receivable=F('receivable') - obj.amount)

        # Bug 1 fix: user paid money TO admin — transaction is DEDUCTED, not ADDED
        if obj.user_id:
            _create_user_received_transaction(obj.user_id, obj.amount, obj.pk, obj.name)

        SystemSetting.objects.update(balance=F('balance') + obj.amount)

        if obj.sales_id:
            sale = Sales.objects.select_for_update().get(pk=obj.sales_id)
            _auto_update_sales_payment_status(sale)
            try_credit_sales_rewards(sale.pk)

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def received_record_update(request, pk):
    try:
        obj = ReceivedRecord.objects.select_related('sales').get(pk=pk)
    except ReceivedRecord.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    old_amount = obj.amount
    old_vendor_id = obj.vendor_id
    old_user_id = obj.user_id
    old_name = obj.name

    serializer = ReceivedRecordSerializer(obj, data=request.data, partial=True, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with db_transaction.atomic():
        obj = serializer.save()
        new_amount = obj.amount
        new_vendor_id = obj.vendor_id
        new_user_id = obj.user_id

        # Adjust vendor receivable
        if old_vendor_id and old_vendor_id == new_vendor_id:
            diff = old_amount - new_amount
            if diff != 0:
                Vendor.objects.filter(pk=old_vendor_id).update(receivable=F('receivable') + diff)
        elif old_vendor_id and old_vendor_id != new_vendor_id:
            Vendor.objects.filter(pk=old_vendor_id).update(receivable=F('receivable') + old_amount)
            if new_vendor_id:
                Vendor.objects.filter(pk=new_vendor_id).update(receivable=F('receivable') - new_amount)
        elif not old_vendor_id and new_vendor_id:
            Vendor.objects.filter(pk=new_vendor_id).update(receivable=F('receivable') - new_amount)

        # Bug 2 fix: reverse old user transaction and create updated one
        if old_user_id:
            _reverse_user_received_transaction(old_user_id, old_amount, obj.pk, old_name)
        if new_user_id:
            _create_user_received_transaction(new_user_id, new_amount, obj.pk, obj.name)

        balance_diff = new_amount - old_amount
        if balance_diff != 0:
            SystemSetting.objects.update(balance=F('balance') + balance_diff)

        if obj.sales_id:
            sale = Sales.objects.select_for_update().get(pk=obj.sales_id)
            _auto_update_sales_payment_status(sale)
            try_credit_sales_rewards(sale.pk)

    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def received_record_delete(request, pk):
    try:
        obj = ReceivedRecord.objects.select_related('sales').get(pk=pk)
    except ReceivedRecord.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    with db_transaction.atomic():
        vendor_id = obj.vendor_id
        amount = obj.amount
        user_id = obj.user_id
        name = obj.name
        sale = obj.sales

        obj.delete()

        if vendor_id:
            Vendor.objects.filter(pk=vendor_id).update(receivable=F('receivable') + amount)

        # Bug 3 fix: reverse the DEDUCTED transaction created at ReceivedRecord creation
        if user_id:
            _reverse_user_received_transaction(user_id, amount, pk, name)

        SystemSetting.objects.update(balance=F('balance') - amount)

        if sale:
            sale.refresh_from_db()
            _auto_update_sales_payment_status(sale)
            try_credit_sales_rewards(sale.pk)

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def received_record_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return received_record_detail(raw_request, pk)
    if request.method == 'PATCH':
        return received_record_update(raw_request, pk)
    return received_record_delete(raw_request, pk)
