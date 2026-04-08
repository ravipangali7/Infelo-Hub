"""Transactional push + inbox: wire domain events to notification_delivery."""

from __future__ import annotations

import logging
from decimal import Decimal

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.models import (
    Campaign,
    CampaignStatus,
    CampaignSubmission,
    KycStatus,
    PaymentRequest,
    PaymentRequestStatus,
    PaymentRequestType,
    PaymentStatus,
    PayoutAccount,
    PayoutAccountStatus,
    Product,
    Sales,
    SalesStatus,
    SubmissionStatus,
    SystemSetting,
    Transaction,
    TransactionFor,
    TransactionStatus,
    TransactionType,
    User,
    UserStatus,
)
from core.notification_delivery import deliver_push, format_money, staff_recipient_users

logger = logging.getLogger(__name__)


def _system_setting() -> SystemSetting | None:
    return SystemSetting.objects.order_by('-id').first()


def _payment_status_label(value: str) -> str:
    return dict(PaymentStatus.choices).get(value, value.replace('_', ' ').title())


def _pr_status_label(value: str) -> str:
    return dict(PaymentRequestStatus.choices).get(value, value)


def _sales_status_label(value: str) -> str:
    return dict(SalesStatus.choices).get(value, value)


def _wallet_type_label(wt: str) -> str:
    w = (wt or 'earning').lower()
    return 'Top-up wallet' if w == 'topup' else 'Earning wallet'


def _payout_method_label(pr: PaymentRequest) -> str:
    if pr.payout_account_id:
        try:
            return pr.payout_account.get_payment_method_display()
        except Exception:
            pass
    return 'your payout method'


def _mask_payout_account(acc: PayoutAccount) -> str:
    if acc.payment_method == 'bank' and acc.bank_account_no:
        n = acc.bank_account_no
        return f"****{n[-4:]}" if len(n) > 4 else "****"
    if acc.phone:
        return acc.phone[-4:].rjust(len(acc.phone), '*')
    return "verified"


# --- PaymentRequest ---


@receiver(pre_save, sender=PaymentRequest)
def _pr_presave(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._txn_pr_old = PaymentRequest.objects.get(pk=instance.pk)
        except PaymentRequest.DoesNotExist:
            instance._txn_pr_old = None
    else:
        instance._txn_pr_old = None


@receiver(post_save, sender=PaymentRequest)
def _pr_postsave(sender, instance: PaymentRequest, created, **kwargs):
    if kwargs.get('raw'):
        return
    setting = _system_setting()
    high_thr = (setting.high_value_payment_threshold or Decimal('0')) if setting else Decimal('0')
    amt = format_money(instance.amount)

    if created:
        ctx_base = {
            'user_name': instance.user.name or instance.user.phone,
            'user_phone': instance.user.phone,
            'amount': amt,
            'request_id': str(instance.pk),
            'wallet_type': _wallet_type_label(instance.withdrawal_wallet_type),
        }
        if instance.type == PaymentRequestType.DEPOSIT:
            deliver_push(
                key='ADMIN_A1',
                context=ctx_base,
                staff_only=True,
                payload={'request_id': instance.pk, 'type': 'deposit'},
            )
        else:
            deliver_push(
                key='ADMIN_A2',
                context=ctx_base,
                staff_only=True,
                payload={'request_id': instance.pk, 'type': 'withdraw'},
            )
        if high_thr > 0 and (instance.amount or Decimal('0')) >= high_thr:
            deliver_push(
                key='ADMIN_A9',
                context={
                    'type_label': 'Deposit' if instance.type == PaymentRequestType.DEPOSIT else 'Withdrawal',
                    'amount': amt,
                    'user_name': ctx_base['user_name'],
                    'request_id': str(instance.pk),
                },
                staff_only=True,
                payload={'request_id': instance.pk},
            )
        return

    old = getattr(instance, '_txn_pr_old', None)
    if old is None or old.status == instance.status:
        return

    user = instance.user
    st = _pr_status_label(instance.status)

    if instance.type == PaymentRequestType.WITHDRAW:
        if instance.status == PaymentRequestStatus.APPROVED:
            deliver_push(
                key='USER_02',
                context={
                    'amount': amt,
                    'payout_method_label': _payout_method_label(instance),
                },
                receiver_users=[user],
                payload={'request_id': instance.pk},
            )
        elif instance.status == PaymentRequestStatus.REJECTED:
            deliver_push(
                key='USER_03',
                context={
                    'request_id': str(instance.pk),
                    'reject_reason': (instance.reject_reason or 'No reason given.'),
                },
                receiver_users=[user],
                payload={'request_id': instance.pk},
            )
        else:
            deliver_push(
                key='USER_01',
                context={
                    'amount': amt,
                    'wallet_type': _wallet_type_label(instance.withdrawal_wallet_type),
                    'status': st,
                    'request_id': str(instance.pk),
                },
                receiver_users=[user],
                payload={'request_id': instance.pk},
            )
    elif instance.type == PaymentRequestType.DEPOSIT:
        if instance.status == PaymentRequestStatus.APPROVED:
            deliver_push(
                key='USER_05',
                context={'amount': amt, 'balance_label': 'top-up wallet'},
                receiver_users=[user],
                payload={'request_id': instance.pk},
            )
        elif instance.status == PaymentRequestStatus.REJECTED:
            deliver_push(
                key='USER_06',
                context={
                    'request_id': str(instance.pk),
                    'reject_reason': (instance.reject_reason or 'No reason given.'),
                },
                receiver_users=[user],
                payload={'request_id': instance.pk},
            )
        else:
            deliver_push(
                key='USER_04',
                context={
                    'amount': amt,
                    'status': st,
                    'request_id': str(instance.pk),
                },
                receiver_users=[user],
                payload={'request_id': instance.pk},
            )


# --- User (KYC, wallet freeze, account status, package) ---


@receiver(pre_save, sender=User)
def _user_presave(sender, instance: User, **kwargs):
    if instance.pk:
        try:
            instance._txn_user_old = User.objects.get(pk=instance.pk)
        except User.DoesNotExist:
            instance._txn_user_old = None
    else:
        instance._txn_user_old = None


@receiver(post_save, sender=User)
def _user_postsave(sender, instance: User, created, **kwargs):
    if kwargs.get('raw'):
        return
    if created:
        return
    old: User | None = getattr(instance, '_txn_user_old', None)
    if old is None:
        return

    if old.kyc_status != instance.kyc_status:
        if instance.kyc_status == 'approved':
            deliver_push(
                key='USER_09',
                context={},
                receiver_users=[instance],
                payload={'user_id': instance.pk},
            )
        elif instance.kyc_status == 'rejected':
            deliver_push(
                key='USER_10',
                context={'kyc_reject_reason': (instance.kyc_reject_reason or 'Please check requirements.')},
                receiver_users=[instance],
                payload={'user_id': instance.pk},
            )
        else:
            deliver_push(
                key='USER_08',
                context={'kyc_status': dict(KycStatus.choices).get(instance.kyc_status, instance.kyc_status)},
                receiver_users=[instance],
                payload={'user_id': instance.pk},
            )

    if old.is_wallet_freeze != instance.is_wallet_freeze:
        frozen = 'frozen' if instance.is_wallet_freeze else 'unfrozen'
        deliver_push(
            key='USER_23',
            context={'frozen_state': frozen, 'admin_note': ''},
            receiver_users=[instance],
            payload={'user_id': instance.pk},
        )

    if old.status != instance.status:
        deliver_push(
            key='USER_24',
            context={
                'user_status': dict(UserStatus.choices).get(instance.status, instance.status),
                'reason': '',
            },
            receiver_users=[instance],
            payload={'user_id': instance.pk},
        )

    old_pkg = old.package_id
    new_pkg = instance.package_id
    if old_pkg != new_pkg and instance.package_id:
        pkg = instance.package
        name = pkg.name if pkg else 'Package'
        pamt = format_money(pkg.amount) if pkg else '0.00'
        deliver_push(
            key='USER_25',
            context={'package_name': name, 'amount': pamt, 'action': 'updated'},
            receiver_users=[instance],
            payload={'user_id': instance.pk, 'package_id': instance.package_id},
        )


# --- PayoutAccount ---


@receiver(pre_save, sender=PayoutAccount)
def _pa_presave(sender, instance: PayoutAccount, **kwargs):
    if instance.pk:
        try:
            instance._txn_pa_old = PayoutAccount.objects.get(pk=instance.pk)
        except PayoutAccount.DoesNotExist:
            instance._txn_pa_old = None
    else:
        instance._txn_pa_old = None


@receiver(post_save, sender=PayoutAccount)
def _pa_postsave(sender, instance: PayoutAccount, created, **kwargs):
    if kwargs.get('raw'):
        return
    if created:
        deliver_push(
            key='ADMIN_A4',
            context={
                'user_name': instance.user.name or instance.user.phone,
                'payment_method': instance.get_payment_method_display(),
            },
            staff_only=True,
            payload={'payout_account_id': instance.pk},
        )
        return

    old: PayoutAccount | None = getattr(instance, '_txn_pa_old', None)
    if old is None or old.status == instance.status:
        return

    user = instance.user
    pm = instance.get_payment_method_display()
    st = dict(PayoutAccountStatus.choices).get(instance.status, instance.status)

    if instance.status == PayoutAccountStatus.APPROVED:
        deliver_push(
            key='USER_12',
            context={'payment_method': pm, 'masked_detail': _mask_payout_account(instance)},
            receiver_users=[user],
            payload={'payout_account_id': instance.pk},
        )
    elif instance.status == PayoutAccountStatus.REJECTED:
        deliver_push(
            key='USER_13',
            context={'reject_reason': (instance.reject_reason or 'No reason given.')},
            receiver_users=[user],
            payload={'payout_account_id': instance.pk},
        )
    else:
        deliver_push(
            key='USER_11',
            context={'payment_method': pm, 'status': st},
            receiver_users=[user],
            payload={'payout_account_id': instance.pk},
        )


# --- Sales ---


@receiver(pre_save, sender=Sales)
def _sales_presave(sender, instance: Sales, **kwargs):
    if instance.pk:
        try:
            instance._txn_sales_old = Sales.objects.get(pk=instance.pk)
        except Sales.DoesNotExist:
            instance._txn_sales_old = None
    else:
        instance._txn_sales_old = None


def _low_stock_after_delivered(sale: Sales) -> None:
    setting = _system_setting()
    threshold = int(setting.low_stock_threshold or 0) if setting else 5
    if threshold <= 0:
        return
    product_ids = list(sale.items.values_list('product_id', flat=True))
    if not product_ids:
        return
    products = list(Product.objects.filter(pk__in=product_ids))
    low = [p for p in products if int(p.stock or 0) <= threshold]
    if not low:
        return
    parts = [f"{p.name}: {p.stock}" for p in low]
    deliver_push(
        key='ADMIN_A7',
        context={
            'order_id': str(sale.pk),
            'product_details': '; '.join(parts),
            'threshold': str(threshold),
        },
        staff_only=True,
        payload={'order_id': sale.pk},
    )


@receiver(post_save, sender=Sales)
def _sales_postsave(sender, instance: Sales, created, **kwargs):
    if kwargs.get('raw'):
        return
    tot = format_money(instance.total)

    if created:
        cust = ''
        if instance.user_id:
            u = instance.user
            cust = (u.name or u.phone) if u else str(instance.user_id)
        deliver_push(
            key='ADMIN_A5',
            context={
                'order_id': str(instance.pk),
                'total': tot,
                'customer_label': cust or 'Guest',
            },
            staff_only=True,
            payload={'order_id': instance.pk},
        )
        if instance.user_id:
            deliver_push(
                key='USER_14',
                context={
                    'order_id': str(instance.pk),
                    'order_status': _sales_status_label(instance.status),
                    'total': tot,
                },
                receiver_users=[instance.user],
                payload={'order_id': instance.pk},
            )
        return

    old: Sales | None = getattr(instance, '_txn_sales_old', None)
    if old is None:
        return

    if old.status != instance.status:
        if instance.status == SalesStatus.SHIPPED:
            key, ctx = 'USER_15', {'order_id': str(instance.pk)}
        elif instance.status == SalesStatus.DELIVERED:
            key, ctx = 'USER_16', {'order_id': str(instance.pk)}
            _low_stock_after_delivered(instance)
        elif instance.status in (SalesStatus.CANCELLED, SalesStatus.REJECTED):
            key = 'USER_17'
            ctx = {
                'order_id': str(instance.pk),
                'order_status': _sales_status_label(instance.status),
                'optional_reason': '',
            }
            if staff_recipient_users().exists():
                deliver_push(
                    key='ADMIN_A10',
                    context={
                        'order_id': str(instance.pk),
                        'order_status': _sales_status_label(instance.status),
                    },
                    staff_only=True,
                    payload={'order_id': instance.pk},
                )
        else:
            key = 'USER_14'
            ctx = {
                'order_id': str(instance.pk),
                'order_status': _sales_status_label(instance.status),
                'total': tot,
            }
        deliver_push(
            key=key,
            context=ctx,
            receiver_users=[instance.user] if instance.user_id else [],
            payload={'order_id': instance.pk},
        )

    if old.payment_status != instance.payment_status and instance.user_id:
        if instance.payment_status == PaymentStatus.PAID:
            deliver_push(
                key='USER_22',
                context={'amount': tot, 'order_id': str(instance.pk)},
                receiver_users=[instance.user],
                payload={'order_id': instance.pk},
            )
        elif instance.payment_status == PaymentStatus.FAILED:
            deliver_push(
                key='USER_21',
                context={'order_id': str(instance.pk)},
                receiver_users=[instance.user],
                payload={'order_id': instance.pk},
            )
            deliver_push(
                key='ADMIN_A11',
                context={'order_id': str(instance.pk)},
                staff_only=True,
                payload={'order_id': instance.pk},
            )


# --- CampaignSubmission ---


@receiver(pre_save, sender=CampaignSubmission)
def _cs_presave(sender, instance: CampaignSubmission, **kwargs):
    if instance.pk:
        try:
            instance._txn_cs_old = CampaignSubmission.objects.get(pk=instance.pk)
        except CampaignSubmission.DoesNotExist:
            instance._txn_cs_old = None
    else:
        instance._txn_cs_old = None


@receiver(post_save, sender=CampaignSubmission)
def _cs_postsave(sender, instance: CampaignSubmission, created, **kwargs):
    if kwargs.get('raw'):
        return
    camp_name = instance.campaign.name if instance.campaign_id else 'Campaign'

    if created:
        deliver_push(
            key='ADMIN_A6',
            context={
                'user_name': instance.user.name or instance.user.phone,
                'campaign_name': camp_name,
            },
            staff_only=True,
            payload={'submission_id': instance.pk},
        )
        return

    old: CampaignSubmission | None = getattr(instance, '_txn_cs_old', None)
    if old is None or old.status == instance.status:
        return

    if instance.status == SubmissionStatus.REJECTED:
        deliver_push(
            key='USER_20',
            context={
                'campaign_name': camp_name,
                'reject_reason': (instance.reject_reason or 'No reason given.'),
            },
            receiver_users=[instance.user],
            payload={'submission_id': instance.pk},
        )
    elif instance.status == SubmissionStatus.APPROVED:
        # USER_19 sent from campaign_submission_rewards when reward applied
        pass
    else:
        deliver_push(
            key='USER_18',
            context={
                'campaign_name': camp_name,
                'submission_status': dict(SubmissionStatus.choices).get(instance.status, instance.status),
            },
            receiver_users=[instance.user],
            payload={'submission_id': instance.pk},
        )


# --- Campaign (status change → participants) ---


@receiver(pre_save, sender=Campaign)
def _camp_presave(sender, instance: Campaign, **kwargs):
    if instance.pk:
        try:
            instance._txn_camp_old = Campaign.objects.get(pk=instance.pk)
        except Campaign.DoesNotExist:
            instance._txn_camp_old = None
    else:
        instance._txn_camp_old = None


@receiver(post_save, sender=Campaign)
def _camp_postsave(sender, instance: Campaign, created, **kwargs):
    if kwargs.get('raw'):
        return
    if created:
        return
    old: Campaign | None = getattr(instance, '_txn_camp_old', None)
    if old is None or old.status == instance.status:
        return

    st_label = dict(CampaignStatus.choices).get(instance.status, instance.status)
    user_ids = (
        CampaignSubmission.objects.filter(campaign=instance)
        .values_list('user_id', flat=True)
        .distinct()
    )
    for uid in user_ids:
        deliver_push(
            key='USER_27',
            context={'campaign_name': instance.name, 'campaign_status': st_label},
            receiver_ids=[uid],
            payload={'campaign_id': instance.pk},
        )


# --- Transaction ---


@receiver(post_save, sender=Transaction)
def _txn_postsave(sender, instance: Transaction, created, **kwargs):
    if kwargs.get('raw'):
        return
    if not created:
        return
    if instance.status != TransactionStatus.SUCCESS:
        return
    user = instance.user

    if instance.transaction_for == TransactionFor.SYSTEM_WITHDRAWAL:
        word = 'Deducted' if instance.transaction_type == TransactionType.DEDUCTED else 'Credited'
        deliver_push(
            key='USER_29',
            context={
                'amount': format_money(instance.amount),
                'deducted_or_credited': word.lower(),
                'remarks': (instance.remarks or '').strip() or '—',
            },
            receiver_users=[user],
            payload={'transaction_id': instance.pk},
        )
        return

    if instance.transaction_type != TransactionType.ADDED:
        return

    tf = (instance.transaction_for or '').strip()
    if tf == TransactionFor.TASK_REWARD:
        return
    if tf == TransactionFor.DEPOSIT:
        return

    remarks = (instance.remarks or '')
    if tf == TransactionFor.EARNING and 'referral' in remarks.lower():
        deliver_push(
            key='USER_26',
            context={
                'amount': format_money(instance.amount),
                'referred_user_mask': 'referral',
            },
            receiver_users=[user],
            payload={'transaction_id': instance.pk},
        )
        return

    if tf in (TransactionFor.EARNING, TransactionFor.BUYING_REWARD, TransactionFor.PACKAGE):
        for_val = instance.get_transaction_for_display() if hasattr(instance, 'get_transaction_for_display') else tf
        deliver_push(
            key='USER_07',
            context={
                'amount': format_money(instance.amount),
                'reason_label': for_val,
            },
            receiver_users=[user],
            payload={'transaction_id': instance.pk},
        )
