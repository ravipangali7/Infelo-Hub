from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction as db_transaction
from decimal import Decimal

from core.models import (
    Sales, Product, Address, ShippingCharge, User,
    Transaction, TransactionType, TransactionFor, TransactionStatus,
    PaymentMethod, PaymentStatus, UserStatus,
)
from core.sales_rewards import compute_affiliate_reward, try_credit_sales_rewards
from core.serializers import SalesSerializer
from core.views.admin.sales_views import _check_stock, _create_sales_items


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def order_list(request):
    if request.method == 'POST':
        return _create_order(request)

    qs = Sales.objects.filter(user=request.user).select_related('vendor', 'address').prefetch_related('items').order_by('-created_at')
    serializer = SalesSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


def _create_order(request):
    items_data_raw = request.data.get('items', [])
    address_id = request.data.get('address')
    payment_method = request.data.get('payment_method', '')

    if not items_data_raw:
        return Response({'detail': 'Order must contain at least one item.'}, status=status.HTTP_400_BAD_REQUEST)

    if not address_id:
        return Response({'detail': 'Delivery address is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate address belongs to requesting user
    try:
        address = Address.objects.get(pk=address_id, user=request.user)
    except Address.DoesNotExist:
        return Response({'detail': 'Address not found.'}, status=status.HTTP_400_BAD_REQUEST)

    # Enrich items_data with current selling prices
    product_ids = [int(item['product']) for item in items_data_raw]
    products_map = {p.pk: p for p in Product.objects.filter(pk__in=product_ids, is_active=True)}

    raw_affiliate = request.data.get('affiliate_user_id')
    affiliate_user_id = None
    if raw_affiliate is not None and raw_affiliate != '':
        try:
            affiliate_user_id = int(raw_affiliate)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid affiliate_user_id.'}, status=status.HTTP_400_BAD_REQUEST)
        if affiliate_user_id == request.user.pk:
            return Response({'detail': 'Invalid affiliate attribution.'}, status=status.HTTP_400_BAD_REQUEST)
        if not User.objects.filter(pk=affiliate_user_id, status=UserStatus.ACTIVE).exists():
            return Response({'detail': 'Invalid affiliate user.'}, status=status.HTTP_400_BAD_REQUEST)

    items_data = []
    for raw in items_data_raw:
        pid = int(raw['product'])
        product = products_map.get(pid)
        if not product:
            return Response({'detail': f'Product {pid} not found or inactive.'}, status=status.HTTP_400_BAD_REQUEST)
        qty = int(raw.get('quantity', 1))
        price = Decimal(str(product.selling_price))
        row = {
            'product': pid,
            'quantity': qty,
            'selling_price': str(product.selling_price),
        }
        if affiliate_user_id and product.is_affiliation:
            aff_amt = compute_affiliate_reward(product, price, qty)
            if aff_amt > 0:
                row['referred_by'] = affiliate_user_id
                row['reward'] = str(aff_amt)
        items_data.append(row)

    stock_error = _check_stock(items_data)
    if stock_error:
        return Response({'detail': stock_error}, status=status.HTTP_400_BAD_REQUEST)

    # Determine shipping charge from address city
    shipping_charge = Decimal('0')
    if address.city_id:
        try:
            sc = ShippingCharge.objects.get(city_id=address.city_id)
            shipping_charge = sc.charge
        except ShippingCharge.DoesNotExist:
            pass

    # Compute totals before entering the atomic block so we can validate wallet balance
    subtotal = sum(
        Decimal(str(products_map[int(item['product'])].selling_price)) * item['quantity']
        for item in items_data
    )
    order_total = max(Decimal('0'), subtotal + shipping_charge)

    # Bug 9 fix: validate wallet balance before creating the order
    is_wallet_payment = payment_method == PaymentMethod.WALLET
    if is_wallet_payment:
        user = User.objects.select_for_update().get(pk=request.user.pk)
        if (user.topup_wallet or Decimal('0')) < order_total:
            return Response(
                {'detail': 'Insufficient wallet balance to complete this order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    with db_transaction.atomic():
        # Re-lock user inside atomic block for wallet deduction
        if is_wallet_payment:
            user = User.objects.select_for_update().get(pk=request.user.pk)
            if (user.topup_wallet or Decimal('0')) < order_total:
                return Response(
                    {'detail': 'Insufficient wallet balance to complete this order.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        sale = Sales(
            user=request.user,
            address=address,
            discount_type='',
            discount=Decimal('0'),
            shipping_charge=shipping_charge,
            status='pending',
            payment_status='pending',
            payment_method=payment_method,
            subtotal=Decimal('0'),
            total=Decimal('0'),
        )
        sale.save()

        subtotal = _create_sales_items(sale, items_data)
        sale.subtotal = subtotal
        sale.total = max(Decimal('0'), subtotal + shipping_charge)
        sale.save()

        # Bug 9 fix: deduct topup_wallet and create ORDER transaction for wallet payments
        if is_wallet_payment:
            user.topup_wallet = (user.topup_wallet or Decimal('0')) - sale.total
            user.save(update_fields=['topup_wallet', 'updated_at'])
            Transaction.objects.create(
                user=request.user,
                amount=sale.total,
                transaction_type=TransactionType.DEDUCTED,
                transaction_for=TransactionFor.ORDER,
                status=TransactionStatus.SUCCESS,
                is_system=True,
                remarks=f'Wallet payment for order #{sale.pk}',
            )
            # Mark order as paid immediately when wallet payment succeeds
            sale.payment_status = PaymentStatus.PAID
            sale.save(update_fields=['payment_status', 'updated_at'])

        try_credit_sales_rewards(sale.pk)

    serializer = SalesSerializer(
        Sales.objects.select_related('vendor', 'address').prefetch_related('items').get(pk=sale.pk),
        context={'request': request},
    )
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, pk):
    try:
        s = Sales.objects.filter(user=request.user).select_related('vendor', 'address').prefetch_related('items__product').get(pk=pk)
    except Sales.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = SalesSerializer(s, context={'request': request})
    return Response(serializer.data)
