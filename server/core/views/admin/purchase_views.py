from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, F, Sum
from django.db import transaction as db_transaction
from decimal import Decimal

from core.models import (
    Purchase, PurchaseItem, PaidRecord, Product, Vendor, User, SystemSetting,
    Transaction, TransactionType, TransactionFor, TransactionStatus,
    DiscountType, PaymentStatus,
)
from core.serializers import PurchaseSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import purchase_summary

PURCHASE_ORDER_FIELDS = ['id', 'total', 'created_at', 'updated_at']


def _create_purchase_items(purchase, items_data):
    """Create PurchaseItem records, add to product stock, and return computed subtotal."""
    subtotal = Decimal('0')
    for item in items_data:
        price = Decimal(str(item.get('purchasing_price', 0)))
        qty = int(item.get('quantity', 1))
        total = price * qty
        subtotal += total
        PurchaseItem.objects.create(
            purchase=purchase,
            product_id=item['product'],
            purchasing_price=price,
            quantity=qty,
            total=total,
        )
        Product.objects.filter(pk=item['product']).update(stock=F('stock') + qty)
    return subtotal


def _reverse_purchase_items_stock(items_qs):
    """Deduct stock for existing purchase items (called before deletion)."""
    for item in items_qs:
        Product.objects.filter(pk=item.product_id).update(
            stock=F('stock') - item.quantity,
        )


def _credit_purchase_rewards(purchase, items_data):
    """Credit buying rewards to the purchase's user for reward-enabled products."""
    if not purchase.user_id:
        return
    product_ids = [int(item['product']) for item in items_data]
    products = {
        p.pk: p
        for p in Product.objects.filter(pk__in=product_ids, is_purchase_reward=True)
    }
    if not products:
        return

    total_reward = Decimal('0')
    for item in items_data:
        product = products.get(int(item['product']))
        if not product or product.purchase_reward <= 0:
            continue
        qty = int(item.get('quantity', 1))
        price = Decimal(str(item.get('purchasing_price', 0)))
        if product.purchase_reward_type == DiscountType.PERCENTAGE:
            reward = (price * product.purchase_reward / Decimal('100')) * qty
        else:
            reward = product.purchase_reward * qty
        total_reward += reward

    if total_reward > 0:
        user = User.objects.select_for_update().get(pk=purchase.user_id)
        user.earning_wallet = (user.earning_wallet or Decimal('0')) + total_reward
        user.save(update_fields=['earning_wallet', 'updated_at'])
        Transaction.objects.create(
            user=user,
            amount=total_reward,
            transaction_type=TransactionType.ADDED,
            transaction_for=TransactionFor.BUYING_REWARD,
            status=TransactionStatus.SUCCESS,
            is_system=True,
            remarks=f'Purchase reward for purchase #{purchase.pk}',
        )


def _auto_update_purchase_payment_status(purchase):
    """Set purchase.payment_status based on sum of linked PaidRecords."""
    paid_total = (
        PaidRecord.objects.filter(purchase=purchase)
        .aggregate(total=Sum('amount'))['total']
        or Decimal('0')
    )
    new_status = PaymentStatus.PAID if paid_total >= purchase.total else PaymentStatus.PENDING
    if purchase.payment_status != new_status:
        purchase.payment_status = new_status
        purchase.save(update_fields=['payment_status', 'updated_at'])


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def purchase_list(request):
    if request.method == 'POST':
        with db_transaction.atomic():
            items_data = request.data.get('items', [])
            data = {k: v for k, v in request.data.items() if k != 'items'}
            discount = Decimal(str(data.get('discount', 0)))
            auto_create_paid_record = str(data.get('auto_create_paid_record', '')).lower() in ('1', 'true', 'yes', 'on')
            paid_record_name = (data.get('paid_record_name') or '').strip()
            paid_record_payment_method = (data.get('paid_record_payment_method') or '').strip()
            paid_record_remarks = (data.get('paid_record_remarks') or '').strip()

            if auto_create_paid_record and (not paid_record_name or not paid_record_payment_method):
                return Response(
                    {'detail': 'Paid record name and payment method are required when auto create is enabled.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            purchase = Purchase(
                vendor_id=data.get('vendor') or None,
                user_id=data.get('user') or None,
                discount_type=data.get('discount_type', ''),
                discount=discount,
                payment_status=PaymentStatus.PENDING,
            )
            purchase.subtotal = Decimal('0')
            purchase.total = Decimal('0')
            purchase.save()

            subtotal = _create_purchase_items(purchase, items_data)
            purchase.subtotal = subtotal
            purchase.total = max(Decimal('0'), subtotal - discount)
            purchase.save()

            if purchase.vendor_id:
                Vendor.objects.filter(pk=purchase.vendor_id).update(payable=F('payable') + purchase.total)

            if auto_create_paid_record:
                paid_record = PaidRecord.objects.create(
                    name=paid_record_name,
                    amount=purchase.total,
                    vendor_id=purchase.vendor_id,
                    user_id=purchase.user_id,
                    payment_method=paid_record_payment_method,
                    remarks=paid_record_remarks,
                    purchase=purchase,
                )
                if purchase.vendor_id:
                    Vendor.objects.filter(pk=purchase.vendor_id).update(payable=F('payable') - paid_record.amount)
                SystemSetting.objects.update(balance=F('balance') - paid_record.amount)
                if purchase.user_id:
                    user = User.objects.select_for_update().get(pk=purchase.user_id)
                    Transaction.objects.create(
                        user=user,
                        amount=paid_record.amount,
                        transaction_type=TransactionType.DEDUCTED,
                        transaction_for=TransactionFor.PAID,
                        status=TransactionStatus.SUCCESS,
                        is_system=True,
                        remarks=f'Payment for purchase #{purchase.pk}',
                    )
                purchase.payment_status = PaymentStatus.PAID
                purchase.save(update_fields=['payment_status', 'updated_at'])

            _credit_purchase_rewards(purchase, items_data)

        serializer = PurchaseSerializer(
            Purchase.objects.prefetch_related('items__product').get(pk=purchase.pk),
            context={'request': request},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = Purchase.objects.select_related('vendor', 'user').prefetch_related('items')
    vendor_id = request.query_params.get('vendor')
    if vendor_id:
        qs = qs.filter(vendor_id=vendor_id)
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(vendor__name__icontains=search) | Q(user__phone__icontains=search) | Q(user__name__icontains=search)
        if search.isdigit():
            q |= Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, PurchaseSerializer, {'request': request}, PURCHASE_ORDER_FIELDS,
        summary_builder=purchase_summary,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def purchase_detail(request, pk):
    try:
        p = Purchase.objects.select_related('vendor', 'user').prefetch_related('items__product').get(pk=pk)
    except Purchase.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        with db_transaction.atomic():
            old_total = p.total
            old_vendor_id = p.vendor_id
            items_data = request.data.get('items')

            if 'vendor' in request.data:
                p.vendor_id = request.data['vendor'] or None
            if 'user' in request.data:
                p.user_id = request.data['user'] or None
            if 'discount_type' in request.data:
                p.discount_type = request.data['discount_type']
            discount = Decimal(str(request.data.get('discount', p.discount)))
            p.discount = discount

            if items_data is not None:
                _reverse_purchase_items_stock(p.items.all())
                p.items.all().delete()
                subtotal = _create_purchase_items(p, items_data)
                p.subtotal = subtotal
                p.total = max(Decimal('0'), subtotal - discount)
            p.save()

            new_total = p.total
            new_vendor_id = p.vendor_id

            if old_vendor_id and old_vendor_id == new_vendor_id:
                diff = new_total - old_total
                if diff != 0:
                    Vendor.objects.filter(pk=old_vendor_id).update(payable=F('payable') + diff)
            elif old_vendor_id and old_vendor_id != new_vendor_id:
                Vendor.objects.filter(pk=old_vendor_id).update(payable=F('payable') - old_total)
                if new_vendor_id:
                    Vendor.objects.filter(pk=new_vendor_id).update(payable=F('payable') + new_total)
            elif not old_vendor_id and new_vendor_id:
                Vendor.objects.filter(pk=new_vendor_id).update(payable=F('payable') + new_total)

            _auto_update_purchase_payment_status(p)

        p.refresh_from_db()
        serializer = PurchaseSerializer(
            Purchase.objects.prefetch_related('items__product').get(pk=pk),
            context={'request': request},
        )
        return Response(serializer.data)

    if request.method == 'DELETE':
        with db_transaction.atomic():
            if p.vendor_id:
                Vendor.objects.filter(pk=p.vendor_id).update(payable=F('payable') - p.total)
            _reverse_purchase_items_stock(p.items.all())
            p.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = PurchaseSerializer(p, context={'request': request})
    return Response(serializer.data)
