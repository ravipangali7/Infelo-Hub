"""Create inbox rows and send FCM for transactional notifications."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Iterable

from django.contrib.auth import get_user_model

from core.firebase_fcm import ensure_firebase_app, send_push_to_token
from core.models import PushNotification
from core.notification_templates import render_notification

logger = logging.getLogger(__name__)
User = get_user_model()


def format_money(value: Decimal | float | int | str | None) -> str:
    if value is None:
        return "0.00"
    if isinstance(value, Decimal):
        return f"{value.quantize(Decimal('0.01')):.2f}"
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return str(value)


def staff_recipient_users():
    return User.objects.filter(is_staff=True, is_active=True)


def deliver_push(
    *,
    key: str,
    context: dict[str, Any],
    receiver_users: Iterable[User] | None = None,
    receiver_ids: Iterable[int] | None = None,
    staff_only: bool = False,
    payload: dict[str, Any] | None = None,
    skip_fcm: bool = False,
) -> PushNotification | None:
    """
    Render template `key`, persist PushNotification, attach receivers, send FCM.

    - If staff_only=True: receivers = all active staff (for admin alerts).
    - Else: receiver_users or receiver_ids must yield at least one user.

    Returns the created PushNotification, or None if there are no receivers.
    """
    title, body = render_notification(key, **context)
    receivers_qs = None
    if staff_only:
        receivers_qs = staff_recipient_users()
        if not receivers_qs.exists():
            logger.warning("deliver_push %s: no staff users to notify", key)
            return None
    else:
        if receiver_users is not None:
            users = list(receiver_users)
        elif receiver_ids is not None:
            users = list(User.objects.filter(pk__in=list(receiver_ids)))
        else:
            raise ValueError("deliver_push requires receiver_users, receiver_ids, or staff_only=True")
        users = [u for u in users if u is not None]
        if not users:
            return None
        receivers_qs = User.objects.filter(pk__in={u.pk for u in users})

    pn = PushNotification.objects.create(
        title=title[:255],
        message=body,
        kind=key[:64] if key else "",
        payload=dict(payload or {}),
    )
    pn.receivers.set(receivers_qs)

    if skip_fcm or not ensure_firebase_app():
        if not skip_fcm:
            logger.debug("FCM not configured; inbox row %s created without push", pn.pk)
        return pn

    image_url = None
    base_data = {
        "type": "transactional",
        "kind": key,
        "push_id": str(pn.pk),
    }
    for rk, rv in (payload or {}).items():
        if rk not in base_data:
            base_data[rk] = str(rv) if rv is not None else ""

    for user in pn.receivers.all().only("id", "fcm_token"):
        tok = (user.fcm_token or "").strip()
        if not tok:
            continue
        err = send_push_to_token(
            token=tok,
            title=title[:255],
            body=body,
            image_url=image_url,
            data=base_data,
        )
        if err:
            logger.warning("FCM fail user=%s push=%s: %s", user.pk, pn.pk, err)

    return pn
