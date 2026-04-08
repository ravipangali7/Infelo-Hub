"""Firebase Admin initialization and single-device FCM send."""
import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)
_app_initialized = False


def ensure_firebase_app():
    """Initialize firebase_admin once if credentials path is configured."""
    global _app_initialized
    if _app_initialized:
        return True
    path = (getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None) or '').strip()
    if not path or not os.path.isfile(path):
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _app_initialized = True
            return True
        firebase_admin.initialize_app(credentials.Certificate(path))
        _app_initialized = True
        return True
    except Exception as e:
        logger.exception('Firebase init failed: %s', e)
        return False


def is_fcm_configured():
    return ensure_firebase_app()


def send_push_to_token(*, token: str, title: str, body: str, image_url: str | None, data: dict | None):
    """
    Send one FCM message. Returns None on success, or error string on failure.
    Caller must ensure ensure_firebase_app() is True.
    """
    from firebase_admin import messaging

    notification = messaging.Notification(title=title, body=body)
    if image_url:
        notification = messaging.Notification(title=title, body=body, image=image_url)

    msg = messaging.Message(
        notification=notification,
        data={k: str(v) for k, v in (data or {}).items()},
        token=token,
    )
    try:
        messaging.send(msg)
        return None
    except Exception as e:
        return str(e)
