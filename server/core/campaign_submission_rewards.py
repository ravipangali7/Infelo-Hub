"""Credit user earning wallet when a campaign submission is approved (once per submission)."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core.models import (
    CampaignSubmission,
    CommissionType,
    SubmissionStatus,
    Transaction,
    TransactionFor,
    TransactionStatus,
    TransactionType,
    User,
)
from core.notification_delivery import deliver_push, format_money


def compute_campaign_reward_amount(campaign) -> Decimal:
    """Flat `commission` is in currency units; percentage uses linked product `selling_price` as base."""
    raw = campaign.commission if campaign.commission is not None else Decimal("0")
    ct = (campaign.commission_type or "").strip()
    if ct == CommissionType.PERCENTAGE:
        base = Decimal("0")
        if campaign.product_id:
            base = campaign.product.selling_price or Decimal("0")
        return (base * raw / Decimal("100")).quantize(Decimal("0.01"))
    return raw.quantize(Decimal("0.01"))


def _credit_earning_wallet_once(submission: CampaignSubmission, amount: Decimal) -> bool:
    """
    If amount > 0 and this submission was never credited, add to user's earning wallet and create a ledger row.
    Mutates submission.reward_credited_at in memory; caller must save submission.
    Returns True if a credit was applied.
    """
    if amount <= 0 or submission.reward_credited_at is not None:
        return False
    user = User.objects.select_for_update().get(pk=submission.user_id)
    user.earning_wallet = (user.earning_wallet or Decimal("0")) + amount
    user.save(update_fields=["earning_wallet", "updated_at"])
    Transaction.objects.create(
        user=user,
        amount=amount,
        transaction_type=TransactionType.ADDED,
        transaction_for=TransactionFor.TASK_REWARD,
        status=TransactionStatus.SUCCESS,
        is_system=True,
        remarks=f"Campaign reward submission #{submission.pk} (campaign #{submission.campaign_id})",
    )
    submission.reward_credited_at = timezone.now()
    return True


def approve_submission_with_reward(submission_pk: int) -> CampaignSubmission:
    """
    Approve submission if not already approved; credit campaign reward at most once.
    Safe to call multiple times (idempotent for wallet and status).
    """
    with transaction.atomic():
        s = CampaignSubmission.objects.select_for_update().select_related(
            "campaign",
            "campaign__product",
        ).get(pk=submission_pk)
        amount = compute_campaign_reward_amount(s.campaign)

        if s.status == SubmissionStatus.APPROVED:
            if _credit_earning_wallet_once(s, amount):
                s.save(update_fields=["reward_credited_at", "updated_at"])
            return s

        s.status = SubmissionStatus.APPROVED
        s.reject_reason = ""
        credited = _credit_earning_wallet_once(s, amount)
        update_fields = ["status", "reject_reason", "updated_at"]
        if credited:
            update_fields.append("reward_credited_at")
        s.save(update_fields=update_fields)
        reward_summary = f" Reward: {format_money(amount)}." if amount > 0 else ""
        deliver_push(
            key="USER_19",
            context={
                "campaign_name": s.campaign.name,
                "reward_summary": reward_summary,
            },
            receiver_ids=[s.user_id],
            payload={"submission_id": s.pk, "campaign_id": s.campaign_id},
        )
        return s
