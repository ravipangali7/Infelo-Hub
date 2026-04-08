import json
from decimal import Decimal, InvalidOperation
from typing import Optional

import requests
from core.models import SmsLog, SystemSetting


SMS_SEND_URL = "https://samayasms.com.np/smsapi/index"
SMS_BALANCE_URL_TEMPLATE = "https://samayasms.com.np/miscapi/{api_key}/getBalance/true/"


def _sms_send_ok(response, payload) -> bool:
    """Samaya returns JSON with response_code (e.g. 200 ok, 403 error) even when HTTP is 200."""
    if not response.ok:
        return False
    if not isinstance(payload, dict):
        return True
    code = payload.get("response_code")
    if code is None:
        return True
    try:
        return int(code) == 200
    except (TypeError, ValueError):
        return False


def send_sms(phone: str, message: str, purpose: str) -> SmsLog:
    setting = SystemSetting.objects.order_by("-id").first()
    api_key = (setting.sms_api_key if setting else "") or ""
    sender_id = (setting.sms_sender_id if setting else "") or "SMSBit"
    if not api_key:
        return SmsLog.objects.create(
            phone=phone,
            purpose=purpose,
            message=message,
            status="failed",
            response_payload={"detail": "SMS API key is not configured"},
        )

    params = {
        "key": api_key,
        "contacts": phone,
        "senderid": sender_id,
        "msg": message,
        "responsetype": "json",
    }
    try:
        resp = requests.get(SMS_SEND_URL, params=params, timeout=15)
        payload = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"raw": resp.text}
        status_text = "success" if _sms_send_ok(resp, payload) else "failed"
    except Exception as exc:
        payload = {"detail": str(exc)}
        status_text = "failed"

    return SmsLog.objects.create(
        phone=phone,
        purpose=purpose,
        message=message,
        status=status_text,
        response_payload=payload,
    )


def _sms_balance_display_value(payload) -> Optional[str]:
    """Best-effort label for provider JSON / text responses."""
    if payload is None:
        return None
    # Samaya getBalance: [{"ROUTE_ID":...,"BALANCE":9}, ...]
    if isinstance(payload, list):
        totals = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            b = item.get("BALANCE")
            if b is None:
                b = item.get("balance")
            if b is not None and b != "":
                try:
                    if isinstance(b, (int, float)):
                        totals.append(float(b))
                    else:
                        totals.append(float(Decimal(str(b).replace(",", ""))))
                except (TypeError, ValueError, InvalidOperation):
                    pass
        if totals:
            t = sum(totals)
            return str(int(t)) if t == int(t) else str(t)
        return None
    if isinstance(payload, dict):
        if payload.get("detail") is not None and len(payload) <= 2:
            return None
        for key in (
            "BALANCE", "balance", "Balance", "credit", "Credit", "remain", "smsbalance",
            "SmsBalance", "SMSBalance", "data",
        ):
            v = payload.get(key)
            if v is not None and v != "":
                return str(v)
        if "raw" in payload:
            raw = str(payload.get("raw") or "").strip()
            if raw.startswith("[") or raw.startswith("{"):
                try:
                    inner = _sms_balance_display_value(json.loads(raw))
                    if inner is not None:
                        return inner
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass
            return raw[:160] if raw else None
        if len(payload) == 1:
            return str(next(iter(payload.values())))
    elif isinstance(payload, (int, float)):
        return str(int(payload)) if isinstance(payload, float) and payload.is_integer() else str(payload)
    elif isinstance(payload, str):
        s = payload.strip()
        if not s:
            return None
        if s.startswith("[") or s.startswith("{"):
            try:
                return _sms_balance_display_value(json.loads(s))
            except (json.JSONDecodeError, TypeError):
                pass
        return s
    return None


def get_sms_balance() -> dict:
    setting = SystemSetting.objects.order_by("-id").first()
    api_key = (setting.sms_api_key if setting else "") or ""
    if not api_key:
        return {
            "configured": False,
            "balance": None,
            "balance_display": None,
            "response": {"detail": "SMS API key is not configured"},
        }

    try:
        url = SMS_BALANCE_URL_TEMPLATE.format(api_key=api_key)
        resp = requests.get(url, timeout=15)
        payload = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"raw": resp.text}
        display = _sms_balance_display_value(payload)
        return {
            "configured": True,
            "balance": payload,
            "balance_display": display,
            "response": payload,
        }
    except Exception as exc:
        return {
            "configured": True,
            "balance": None,
            "balance_display": None,
            "response": {"detail": str(exc)},
        }
