from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, F, Sum
from django.db import transaction as db_transaction
from decimal import Decimal

from core.models import (
    Sales, SalesItem, Product, Vendor, SystemSetting,
    Transaction, TransactionType, TransactionFor, TransactionStatus,
    PaymentStatus, ReceivedRecord,
)
from core.sales_rewards import try_credit_sales_rewards
from core.serializers import SalesSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range, error_response
from core.admin_summary import sales_summary

SALES_ORDER_FIELDS = ['id', 'total', 'status', 'payment_status', 'created_at', 'updated_at']
STOCK_RESTORING_STATUSES = {'cancelled', 'rejected'}


def _check_stock(items_data):
    """Return an error message if any item's requested quantity exceeds available stock, else None."""
    product_ids = [int(item['product']) for item in items_data]
    products = {p.pk: p for p in Product.objects.filter(pk__in=product_ids)}
    for item in items_data:
        product = products.get(int(item['product']))
        if product is None:
            return f'Product {item["product"]} not found.'
        qty = int(item.get('quantity', 1))
        if product.stock < qty:
            return f'Insufficient stock for "{product.name}": available {product.stock}, requested {qty}.'
    return None


def _create_sales_items(sale, items_data):
    """Create SalesItem records, deduct product stock, and return computed subtotal. Wallet credits run via try_credit_sales_rewards when paid+delivered."""
    subtotal = Decimal('0')

    for item in items_data:
        price = Decimal(str(item.get('selling_price', 0)))
        qty = int(item.get('quantity', 1))
        total = price * qty
        subtotal += total
        reward_val = item.get('reward')
        if reward_val is not None and reward_val != '':
            reward_val = Decimal(str(reward_val))
        else:
            reward_val = None
        SalesItem.objects.create(
            sales=sale,
            product_id=item['product'],
            selling_price=price,
            quantity=qty,
            total=total,
            referred_by_id=item.get('referred_by') or None,
            reward=reward_val,
        )
        Product.objects.filter(pk=item['product']).update(stock=F('stock') - qty)

    return subtotal


def _restore_sales_items_stock(items_qs):
    """Add back stock for existing sale items (called before deletion or on cancel/reject)."""
    for item in items_qs:
        Product.objects.filter(pk=item.product_id).update(stock=F('stock') + item.quantity)


def _auto_update_sales_payment_status(sale):
    """Set sale.payment_status based on sum of linked ReceivedRecords."""
    received_total = (
        ReceivedRecord.objects.filter(sales=sale)
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    new_status = PaymentStatus.PAID if received_total >= sale.total else PaymentStatus.PENDING
    if sale.payment_status != new_status:
        sale.payment_status = new_status
        sale.save(update_fields=['payment_status', 'updated_at'])


def _auto_create_received_record_if_paid(sale):
    """
    Bug 6 fix: when payment_status is set to 'paid' directly, auto-create a ReceivedRecord
    for the remaining unpaid amount so the ReceivedRecord ledger stays consistent with
    payment_status. Also creates a DEDUCTED transaction for the linked user.
    """
    if sale.payment_status != PaymentStatus.PAID:
        return
    received_total = (
        ReceivedRecord.objects.filter(sales=sale)
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    remaining = sale.total - received_total
    if remaining <= 0:
        return

    record = ReceivedRecord.objects.create(
        name=f'Auto-payment for Sale #{sale.pk}',
        amount=remaining,
        vendor_id=sale.vendor_id,
        user_id=sale.user_id,
        payment_method=sale.payment_method or '',
        sales=sale,
    )

    SystemSetting.objects.update(balance=F('balance') + record.amount)

    if sale.user_id:
        Transaction.objects.create(
            user_id=sale.user_id,
            amount=remaining,
            transaction_type=TransactionType.DEDUCTED,
            transaction_for=TransactionFor.RECEIVED,
            status=TransactionStatus.SUCCESS,
            is_system=True,
            remarks=f'Auto-payment for Sale #{sale.pk} (received record #{record.pk})',
        )

    try_credit_sales_rewards(sale.pk)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def sales_list(request):
    if request.method == 'POST':
        with db_transaction.atomic():
            items_data = request.data.get('items', [])
            discount = Decimal(str(request.data.get('discount', 0)))
            shipping_charge = Decimal(str(request.data.get('shipping_charge', 0)))

            stock_error = _check_stock(items_data)
            if stock_error:
                return Response({'detail': stock_error}, status=status.HTTP_400_BAD_REQUEST)

            sale = Sales(
                vendor_id=request.data.get('vendor') or None,
                user_id=request.data.get('user') or None,
                address_id=request.data.get('address') or None,
                discount_type=request.data.get('discount_type', ''),
                discount=discount,
                shipping_charge=shipping_charge,
                status=request.data.get('status', 'pending'),
                payment_status=request.data.get('payment_status', 'pending'),
                payment_method=request.data.get('payment_method', ''),
            )
            sale.subtotal = Decimal('0')
            sale.total = Decimal('0')
            sale.save()

            subtotal = _create_sales_items(sale, items_data)
            sale.subtotal = subtotal
            sale.total = max(Decimal('0'), subtotal - discount + shipping_charge)
            sale.save()

            if sale.vendor_id:
                Vendor.objects.filter(pk=sale.vendor_id).update(receivable=F('receivable') + sale.total)

            # Bug 6 fix: auto-create ReceivedRecord when payment_status is set to 'paid' at creation
            if sale.payment_status == PaymentStatus.PAID:
                _auto_create_received_record_if_paid(sale)

            try_credit_sales_rewards(sale.pk)

        serializer = SalesSerializer(
            Sales.objects.select_related('vendor', 'user', 'address').prefetch_related('items__product').get(pk=sale.pk),
            context={'request': request},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = Sales.objects.select_related('vendor', 'user', 'address').prefetch_related('items')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    payment_status = request.query_params.get('payment_status')
    if payment_status:
        qs = qs.filter(payment_status=payment_status)
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    vendor_id = request.query_params.get('vendor')
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(user__phone__icontains=search) | Q(user__name__icontains=search) | Q(vendor__name__icontains=search)
        if search.isdigit():
            q |= Q(pk=int(search)) | Q(user_id=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, SalesSerializer, {'request': request}, SALES_ORDER_FIELDS,
        summary_builder=sales_summary,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def sales_detail(request, pk):
    try:
        s = Sales.objects.select_related('vendor', 'user', 'address').prefetch_related('items__product').get(pk=pk)
    except Sales.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        with db_transaction.atomic():
            old_total = s.total
            old_vendor_id = s.vendor_id
            old_status = s.status
            old_payment_status = s.payment_status
            items_data = request.data.get('items')

            if 'vendor' in request.data:
                s.vendor_id = request.data['vendor'] or None
            if 'user' in request.data:
                s.user_id = request.data['user'] or None
            if 'address' in request.data:
                s.address_id = request.data['address'] or None
            if 'discount_type' in request.data:
                s.discount_type = request.data['discount_type']
            if 'status' in request.data:
                s.status = request.data['status']
            if 'payment_status' in request.data:
                s.payment_status = request.data['payment_status']
            if 'payment_method' in request.data:
                s.payment_method = request.data['payment_method']
            discount = Decimal(str(request.data.get('discount', s.discount)))
            shipping_charge = Decimal(str(request.data.get('shipping_charge', s.shipping_charge)))
            s.discount = discount
            s.shipping_charge = shipping_charge

            if items_data is not None:
                if old_status not in STOCK_RESTORING_STATUSES:
                    _restore_sales_items_stock(s.items.all())
                s.items.all().delete()

                if s.status not in STOCK_RESTORING_STATUSES:
                    stock_error = _check_stock(items_data)
                    if stock_error:
                        return Response({'detail': stock_error}, status=status.HTTP_400_BAD_REQUEST)
                    subtotal = _create_sales_items(s, items_data)
                else:
                    subtotal = Decimal('0')
                    for item in items_data:
                        price = Decimal(str(item.get('selling_price', 0)))
                        qty = int(item.get('quantity', 1))
                        total = price * qty
                        subtotal += total
                        SalesItem.objects.create(
                            sales=s,
                            product_id=item['product'],
                            selling_price=price,
                            quantity=qty,
                            total=total,
                            referred_by_id=item.get('referred_by') or None,
                            reward=item.get('reward') or None,
                        )
                s.subtotal = subtotal
                s.total = max(Decimal('0'), subtotal - discount + shipping_charge)
            elif 'status' in request.data:
                new_status = request.data['status']
                if old_status not in STOCK_RESTORING_STATUSES and new_status in STOCK_RESTORING_STATUSES:
                    _restore_sales_items_stock(s.items.all())
                    # Bug 8 fix: decrement vendor receivable when sale is cancelled/rejected
                    if s.vendor_id:
                        Vendor.objects.filter(pk=s.vendor_id).update(receivable=F('receivable') - s.total)
                elif old_status in STOCK_RESTORING_STATUSES and new_status not in STOCK_RESTORING_STATUSES:
                    stock_error = _check_stock(
                        [{'product': i.product_id, 'quantity': i.quantity} for i in s.items.all()]
                    )
                    if stock_error:
                        return Response({'detail': stock_error}, status=status.HTTP_400_BAD_REQUEST)
                    for item in s.items.all():
                        Product.objects.filter(pk=item.product_id).update(stock=F('stock') - item.quantity)
                    # Bug 8 fix: restore vendor receivable when sale is un-cancelled/un-rejected
                    if s.vendor_id:
                        Vendor.objects.filter(pk=s.vendor_id).update(receivable=F('receivable') + s.total)

            s.save()
            new_total = s.total
            new_vendor_id = s.vendor_id

            # Only adjust vendor receivable for total/vendor changes when status didn't change
            # (status changes already handled the receivable adjustment above)
            status_changed = 'status' in request.data and request.data['status'] != old_status
            if not status_changed or items_data is not None:
                if old_vendor_id and old_vendor_id == new_vendor_id:
                    diff = new_total - old_total
                    if diff != 0:
                        Vendor.objects.filter(pk=old_vendor_id).update(receivable=F('receivable') + diff)
                elif old_vendor_id and old_vendor_id != new_vendor_id:
                    Vendor.objects.filter(pk=old_vendor_id).update(receivable=F('receivable') - old_total)
                    if new_vendor_id:
                        Vendor.objects.filter(pk=new_vendor_id).update(receivable=F('receivable') + new_total)
                elif not old_vendor_id and new_vendor_id:
                    Vendor.objects.filter(pk=new_vendor_id).update(receivable=F('receivable') + new_total)

            # Bug 7 fix: recalculate payment_status from ReceivedRecords after total changes
            if items_data is not None and 'payment_status' not in request.data:
                s.refresh_from_db()
                _auto_update_sales_payment_status(s)

            # Bug 6 fix: auto-create ReceivedRecord when payment_status is changed to 'paid'
            new_payment_status = request.data.get('payment_status')
            if new_payment_status == PaymentStatus.PAID and old_payment_status != PaymentStatus.PAID:
                s.refresh_from_db()
                _auto_create_received_record_if_paid(s)

            try_credit_sales_rewards(s.pk)

        serializer = SalesSerializer(
            Sales.objects.select_related('vendor', 'user', 'address').prefetch_related('items__product').get(pk=pk),
            context={'request': request},
        )
        return Response(serializer.data)

    if request.method == 'DELETE':
        with db_transaction.atomic():
            if s.vendor_id:
                Vendor.objects.filter(pk=s.vendor_id).update(receivable=F('receivable') - s.total)
            if s.status not in STOCK_RESTORING_STATUSES:
                _restore_sales_items_stock(s.items.all())
            s.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SalesSerializer(s, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def sales_status_update(request, pk):
    try:
        s = Sales.objects.prefetch_related('items').get(pk=pk)
    except Sales.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status and new_status != s.status:
        old_status = s.status
        with db_transaction.atomic():
            if old_status not in STOCK_RESTORING_STATUSES and new_status in STOCK_RESTORING_STATUSES:
                _restore_sales_items_stock(s.items.all())
                # Bug 8 fix: decrement vendor receivable when sale is cancelled/rejected
                if s.vendor_id:
                    Vendor.objects.filter(pk=s.vendor_id).update(receivable=F('receivable') - s.total)
            elif old_status in STOCK_RESTORING_STATUSES and new_status not in STOCK_RESTORING_STATUSES:
                stock_error = _check_stock(
                    [{'product': i.product_id, 'quantity': i.quantity} for i in s.items.all()]
                )
                if stock_error:
                    return Response({'detail': stock_error}, status=status.HTTP_400_BAD_REQUEST)
                for item in s.items.all():
                    Product.objects.filter(pk=item.product_id).update(stock=F('stock') - item.quantity)
                # Bug 8 fix: restore vendor receivable when sale is un-cancelled/un-rejected
                if s.vendor_id:
                    Vendor.objects.filter(pk=s.vendor_id).update(receivable=F('receivable') + s.total)
            s.status = new_status
            s.save()
            try_credit_sales_rewards(s.pk)

    serializer = SalesSerializer(s, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def sales_detail_get(request, pk):
    return sales_detail(request._request, pk)
