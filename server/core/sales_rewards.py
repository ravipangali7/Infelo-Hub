"""Deferred settlement of affiliate and buyer purchase rewards on sales (paid + delivered)."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.models import (
    DiscountType,
    PaymentStatus,
    Sales,
    SalesItem,
    SalesStatus,
    Transaction,
    TransactionFor,
    TransactionStatus,
    TransactionType,
    User,
    UserStatus,
)


def compute_affiliate_reward(product, selling_price: Decimal, qty: int) -> Decimal:
    if not product or not getattr(product, "is_affiliation", False):
        return Decimal("0")
    raw = product.affiliation_reward or Decimal("0")
    if raw <= 0:
        return Decimal("0")
    rt = (product.affiliation_reward_type or "").strip()
    if rt == DiscountType.PERCENTAGE:
        return (selling_price * raw / Decimal("100") * Decimal(qty)).quantize(Decimal("0.01"))
    return (raw * Decimal(qty)).quantize(Decimal("0.01"))


def compute_purchase_reward_amount(product, selling_price: Decimal, qty: int) -> Decimal:
    if not product or not getattr(product, "is_purchase_reward", False):
        return Decimal("0")
    raw = product.purchase_reward or Decimal("0")
    if raw <= 0:
        return Decimal("0")
    rt = (product.purchase_reward_type or "").strip()
    if rt == DiscountType.PERCENTAGE:
        return (selling_price * raw / Decimal("100") * Decimal(qty)).quantize(Decimal("0.01"))
    return (raw * Decimal(qty)).quantize(Decimal("0.01"))


def try_credit_sales_rewards(sale_id: int) -> None:
    """
    Credit affiliate (from SalesItem.referred_by + reward) and buyer purchase rewards once per line
    when sale uses deferred settlement and is both paid and delivered.
    """
    with transaction.atomic():
        sale = Sales.objects.select_for_update().get(pk=sale_id)
        if not sale.deferred_reward_settlement:
            return
        if sale.payment_status != PaymentStatus.PAID:
            return
        if sale.status != SalesStatus.DELIVERED:
            return

        items = list(
            SalesItem.objects.filter(sales=sale, rewards_credited_at__isnull=True).select_related(
                "product", "referred_by"
            )
        )
        now = timezone.now()
        for item in items:
            product = item.product

            if item.referred_by_id and item.reward is not None and item.reward > 0:
                ref = User.objects.select_for_update().get(pk=item.referred_by_id)
                if ref.status == UserStatus.ACTIVE:
                    amt = item.reward
                    ref.earning_wallet = (ref.earning_wallet or Decimal("0")) + amt
                    ref.save(update_fields=["earning_wallet", "updated_at"])
                    Transaction.objects.create(
                        user=ref,
                        amount=amt,
                        transaction_type=TransactionType.ADDED,
                        transaction_for=TransactionFor.EARNING,
                        status=TransactionStatus.SUCCESS,
                        is_system=True,
                        remarks=f"Referral reward for sale #{sale.pk}",
                    )

            if sale.user_id and product:
                buyer_amt = compute_purchase_reward_amount(
                    product, item.selling_price, item.quantity
                )
                if buyer_amt > 0:
                    buyer = User.objects.select_for_update().get(pk=sale.user_id)
                    buyer.earning_wallet = (buyer.earning_wallet or Decimal("0")) + buyer_amt
                    buyer.save(update_fields=["earning_wallet", "updated_at"])
                    Transaction.objects.create(
                        user=buyer,
                        amount=buyer_amt,
                        transaction_type=TransactionType.ADDED,
                        transaction_for=TransactionFor.BUYING_REWARD,
                        status=TransactionStatus.SUCCESS,
                        is_system=True,
                        remarks=f"Purchase reward for sale #{sale.pk} (product: {product.name})",
                    )

            item.rewards_credited_at = now
            item.save(update_fields=["rewards_credited_at", "updated_at"])
