from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import F, Sum
from django.db import transaction as db_transaction
from decimal import Decimal

from core.models import (
    PaidRecord, Vendor, User, Purchase, SystemSetting,
    Transaction, TransactionType, TransactionFor, TransactionStatus,
    PaymentStatus,
)
from core.serializers import PaidRecordSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import paid_received_summary

PAID_RECORD_ORDER_FIELDS = ['id', 'name', 'amount', 'created_at', 'updated_at']


def _auto_update_purchase_payment_status(purchase):
    """Set purchase.payment_status based on sum of all linked PaidRecords."""
    paid_total = (
        PaidRecord.objects.filter(purchase=purchase)
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    new_status = PaymentStatus.PAID if paid_total >= purchase.total else PaymentStatus.PENDING
    if purchase.payment_status != new_status:
        purchase.payment_status = new_status
        purchase.save(update_fields=['payment_status', 'updated_at'])


def _create_user_paid_transaction(user_id, amount, record_pk, name):
    """Create a DEDUCTED transaction for the user when admin records a paid record."""
    Transaction.objects.create(
        user_id=user_id,
        amount=amount,
        transaction_type=TransactionType.DEDUCTED,
        transaction_for=TransactionFor.PAID,
        status=TransactionStatus.SUCCESS,
        is_system=True,
        remarks=f'Paid record #{record_pk}: {name}',
    )


def _reverse_user_paid_transaction(user_id, amount, record_pk, name):
    """Create an ADDED reversal transaction when a PaidRecord is deleted or its user/amount changes."""
    Transaction.objects.create(
        user_id=user_id,
        amount=amount,
        transaction_type=TransactionType.ADDED,
        transaction_for=TransactionFor.PAID,
        status=TransactionStatus.SUCCESS,
        is_system=True,
        remarks=f'Reversal of paid record #{record_pk}: {name}',
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def paid_record_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return paid_record_create(raw_request)
    return paid_record_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def paid_record_list(request):
    qs = PaidRecord.objects.select_related('vendor', 'user', 'purchase')
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
        qs, request, PaidRecordSerializer, {'request': request}, PAID_RECORD_ORDER_FIELDS,
        summary_builder=paid_received_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def paid_record_detail(request, pk):
    try:
        obj = PaidRecord.objects.select_related('vendor', 'user', 'purchase').get(pk=pk)
    except PaidRecord.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PaidRecordSerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def paid_record_create(request):
    serializer = PaidRecordSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with db_transaction.atomic():
        obj = serializer.save()

        if obj.vendor_id:
            Vendor.objects.filter(pk=obj.vendor_id).update(payable=F('payable') - obj.amount)

        if obj.user_id:
            _create_user_paid_transaction(obj.user_id, obj.amount, obj.pk, obj.name)

        SystemSetting.objects.update(balance=F('balance') - obj.amount)

        if obj.purchase_id:
            purchase = Purchase.objects.select_for_update().get(pk=obj.purchase_id)
            _auto_update_purchase_payment_status(purchase)

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def paid_record_update(request, pk):
    try:
        obj = PaidRecord.objects.select_related('purchase').get(pk=pk)
    except PaidRecord.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    old_amount = obj.amount
    old_vendor_id = obj.vendor_id
    old_user_id = obj.user_id
    old_name = obj.name

    serializer = PaidRecordSerializer(obj, data=request.data, partial=True, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with db_transaction.atomic():
        obj = serializer.save()
        new_amount = obj.amount
        new_vendor_id = obj.vendor_id
        new_user_id = obj.user_id

        # Adjust vendor payable
        if old_vendor_id and old_vendor_id == new_vendor_id:
            diff = old_amount - new_amount
            if diff != 0:
                Vendor.objects.filter(pk=old_vendor_id).update(payable=F('payable') + diff)
        elif old_vendor_id and old_vendor_id != new_vendor_id:
            Vendor.objects.filter(pk=old_vendor_id).update(payable=F('payable') + old_amount)
            if new_vendor_id:
                Vendor.objects.filter(pk=new_vendor_id).update(payable=F('payable') - new_amount)
        elif not old_vendor_id and new_vendor_id:
            Vendor.objects.filter(pk=new_vendor_id).update(payable=F('payable') - new_amount)

        # Bug 4 fix: reverse old user DEDUCTED transaction and create updated one
        if old_user_id:
            _reverse_user_paid_transaction(old_user_id, old_amount, obj.pk, old_name)
        if new_user_id:
            _create_user_paid_transaction(new_user_id, new_amount, obj.pk, obj.name)

        balance_diff = old_amount - new_amount
        if balance_diff != 0:
            SystemSetting.objects.update(balance=F('balance') + balance_diff)

        if obj.purchase_id:
            purchase = Purchase.objects.select_for_update().get(pk=obj.purchase_id)
            _auto_update_purchase_payment_status(purchase)

    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def paid_record_delete(request, pk):
    try:
        obj = PaidRecord.objects.select_related('purchase').get(pk=pk)
    except PaidRecord.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    with db_transaction.atomic():
        vendor_id = obj.vendor_id
        amount = obj.amount
        user_id = obj.user_id
        name = obj.name
        purchase = obj.purchase

        obj.delete()

        if vendor_id:
            Vendor.objects.filter(pk=vendor_id).update(payable=F('payable') + amount)

        # Bug 5 fix: reverse the DEDUCTED transaction created at PaidRecord creation
        if user_id:
            _reverse_user_paid_transaction(user_id, amount, pk, name)

        SystemSetting.objects.update(balance=F('balance') + amount)

        if purchase:
            purchase.refresh_from_db()
            _auto_update_purchase_payment_status(purchase)

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def paid_record_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return paid_record_detail(raw_request, pk)
    if request.method == 'PATCH':
        return paid_record_update(raw_request, pk)
    return paid_record_delete(raw_request, pk)
