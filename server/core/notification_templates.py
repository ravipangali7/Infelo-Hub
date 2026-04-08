"""
Single source of truth for transactional push / inbox copy.
Edit messages here only. Keys: USER_01–USER_29, ADMIN_A1–ADMIN_A11.
Use str.format named placeholders; callers must supply all required fields.
"""

from __future__ import annotations

from typing import Any

# Each value: {"title": str, "body": str} with named format placeholders.
NOTIFICATION_TEMPLATES: dict[str, dict[str, str]] = {
    # --- User: deposits & withdrawals ---
    "USER_01": {
        "title": "Withdrawal update",
        "body": "Your withdrawal of {amount} ({wallet_type}) is {status}. Request #{request_id}.",
    },
    "USER_02": {
        "title": "Withdrawal approved",
        "body": "{amount} has been approved for payout to {payout_method_label}.",
    },
    "USER_03": {
        "title": "Withdrawal not approved",
        "body": "Your withdrawal #{request_id} was rejected. Reason: {reject_reason}",
    },
    "USER_04": {
        "title": "Deposit update",
        "body": "Your deposit of {amount} is {status}. Request #{request_id}.",
    },
    "USER_05": {
        "title": "Deposit confirmed",
        "body": "{amount} has been added to your {balance_label}.",
    },
    "USER_06": {
        "title": "Deposit declined",
        "body": "Deposit #{request_id} was not approved. Reason: {reject_reason}",
    },
    # --- User: wallet earning ---
    "USER_07": {
        "title": "Earning added",
        "body": "{amount} was added to your earning wallet: {reason_label}.",
    },
    # --- User: KYC ---
    "USER_08": {
        "title": "KYC update",
        "body": "Your verification is now {kyc_status}.",
    },
    "USER_09": {
        "title": "Identity verified",
        "body": "Your KYC is approved. You can use full wallet and payout features.",
    },
    "USER_10": {
        "title": "KYC needs attention",
        "body": "Verification was not approved. {kyc_reject_reason} Please resubmit if needed.",
    },
    # --- User: payout account ---
    "USER_11": {
        "title": "Payout method update",
        "body": "Your {payment_method} account is {status}.",
    },
    "USER_12": {
        "title": "Payout method ready",
        "body": "{payment_method} ({masked_detail}) is approved for withdrawals.",
    },
    "USER_13": {
        "title": "Payout method declined",
        "body": "Your payout account was rejected. {reject_reason}",
    },
    # --- User: orders (Sales) ---
    "USER_14": {
        "title": "Order #{order_id} update",
        "body": "Your order is now {order_status}. Total {total}.",
    },
    "USER_15": {
        "title": "On the way",
        "body": "Order #{order_id} has been shipped.",
    },
    "USER_16": {
        "title": "Delivered",
        "body": "Order #{order_id} was delivered. Thank you for shopping with us.",
    },
    "USER_17": {
        "title": "Order #{order_id}",
        "body": "Your order was {order_status}.{optional_reason}",
    },
    # --- User: campaign submission ---
    "USER_18": {
        "title": "Campaign submission update",
        "body": "{campaign_name}: your submission is {submission_status}.",
    },
    "USER_19": {
        "title": "Submission approved",
        "body": "{campaign_name} — approved.{reward_summary}",
    },
    "USER_20": {
        "title": "Submission needs changes",
        "body": "{campaign_name} — not approved. {reject_reason}",
    },
    # --- User: payment / account / package / misc ---
    "USER_21": {
        "title": "Payment issue",
        "body": "Payment for order #{order_id} failed. Please try again or use another method.",
    },
    "USER_22": {
        "title": "Payment received",
        "body": "{amount} received for order #{order_id}.",
    },
    "USER_23": {
        "title": "Wallet notice",
        "body": "Your wallet is {frozen_state}.{admin_note}",
    },
    "USER_24": {
        "title": "Account update",
        "body": "Your account is {user_status}.{reason}",
    },
    "USER_25": {
        "title": "Membership update",
        "body": "{package_name} — {amount} {action}.",
    },
    "USER_26": {
        "title": "Referral reward",
        "body": "{amount} from referral {referred_user_mask}.",
    },
    "USER_27": {
        "title": "{campaign_name}",
        "body": "Campaign status is now {campaign_status}.",
    },
    "USER_28": {
        "title": "Stock update",
        "body": "{product_name} has {stock_remaining} left.",
    },
    "USER_29": {
        "title": "Wallet adjustment",
        "body": "{amount} {deducted_or_credited}: {remarks}",
    },
    # --- Admin ---
    "ADMIN_A1": {
        "title": "New deposit request",
        "body": "{user_name} ({user_phone}) — {amount}. Request #{request_id}.",
    },
    "ADMIN_A2": {
        "title": "New withdrawal request",
        "body": "{user_name} — {amount} from {wallet_type}. #{request_id}.",
    },
    "ADMIN_A3": {
        "title": "KYC to review",
        "body": "{user_name} ({user_phone}) submitted KYC documents.",
    },
    "ADMIN_A4": {
        "title": "New payout account",
        "body": "{user_name} added {payment_method} — pending approval.",
    },
    "ADMIN_A5": {
        "title": "New order",
        "body": "Order #{order_id} — {total} from {customer_label}.",
    },
    "ADMIN_A6": {
        "title": "New campaign submission",
        "body": "{user_name} submitted {campaign_name}.",
    },
    "ADMIN_A7": {
        "title": "Low stock alert",
        "body": "After order #{order_id}, low stock: {product_details} (threshold {threshold}).",
    },
    "ADMIN_A8": {
        "title": "Queue summary",
        "body": "{pending_deposits} deposits, {pending_withdrawals} withdrawals, {pending_kyc} KYC pending.",
    },
    "ADMIN_A9": {
        "title": "High-value request",
        "body": "{type_label} {amount} from {user_name} — #{request_id}.",
    },
    "ADMIN_A10": {
        "title": "Order cancelled",
        "body": "Order #{order_id} — {order_status}.",
    },
    "ADMIN_A11": {
        "title": "Payment failed",
        "body": "Order #{order_id} — payment failed.",
    },
}

NOTIFICATION_KEYS = frozenset(NOTIFICATION_TEMPLATES.keys())


class NotificationTemplateError(KeyError):
    """Missing or unknown notification template key."""


def render_notification(key: str, **context: Any) -> tuple[str, str]:
    """
    Format title and body for a template key. Raises NotificationTemplateError
    if key is unknown or a placeholder is missing.
    """
    if key not in NOTIFICATION_TEMPLATES:
        raise NotificationTemplateError(f"Unknown notification key: {key!r}")
    spec = NOTIFICATION_TEMPLATES[key]
    try:
        title = spec["title"].format(**context)
        body = spec["body"].format(**context)
    except KeyError as e:
        raise NotificationTemplateError(
            f"Missing context for {key!r}: {e!s}"
        ) from e
    return title, body
