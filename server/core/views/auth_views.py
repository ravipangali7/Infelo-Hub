"""Auth API: login/register + OTP flows."""
import re
import random
from datetime import timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_201_CREATED
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from ..models import User, OtpVerification, OtpPurpose
from ..serializers import UserSerializer
from ..account_policy import get_account_block_error
from ..api_utils import error_response, policy_error_response
from ..sms_service import send_sms

PHONE_REGEX = re.compile(r'^(97|98)\d{8}$')
OTP_EXPIRE_MINUTES = 5
OTP_RESEND_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
SMS_BRAND_NAME = "Infelo Hub"


def _validate_password(password):
    """Check: 6+ chars, at least one upper, one lower, one digit, one special."""
    if not password or len(password) < 6:
        return 'Password must be at least 6 characters.'
    if not re.search(r'[A-Z]', password):
        return 'Password must contain at least one uppercase letter.'
    if not re.search(r'[a-z]', password):
        return 'Password must contain at least one lowercase letter.'
    if not re.search(r'\d', password):
        return 'Password must contain at least one number.'
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;\'`~]', password):
        return 'Password must contain at least one special character.'
    return None


def _normalize_phone(raw):
    return re.sub(r'\D', '', (raw or '').strip())


def _active_otp(phone, purpose):
    return OtpVerification.objects.filter(phone=phone, purpose=purpose, is_active=True).order_by("-id").first()


def _gen_code():
    return f"{random.randint(100000, 999999)}"


@api_view(['POST'])
@permission_classes([AllowAny])
def register_request_otp(request):
    phone = _normalize_phone(request.data.get('phone'))
    if not PHONE_REGEX.match(phone):
        return error_response('Phone must be exactly 10 digits and start with 97 or 98', HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=phone).exists():
        return error_response('A user with this phone already exists', HTTP_400_BAD_REQUEST)

    now = timezone.now()
    current = _active_otp(phone, OtpPurpose.REGISTER)
    if current and (now - current.last_sent_at).total_seconds() < OTP_RESEND_SECONDS:
        wait = OTP_RESEND_SECONDS - int((now - current.last_sent_at).total_seconds())
        return error_response(f'Please wait {wait}s before requesting another OTP', HTTP_400_BAD_REQUEST)

    if current:
        current.otp_code = _gen_code()
        current.expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
        current.last_sent_at = now
        current.attempts = 0
        current.verified_at = None
        current.resend_count += 1
        current.save(update_fields=['otp_code', 'expires_at', 'last_sent_at', 'attempts', 'verified_at', 'resend_count', 'updated_at'])
        otp = current
    else:
        otp = OtpVerification.objects.create(
            phone=phone,
            purpose=OtpPurpose.REGISTER,
            otp_code=_gen_code(),
            expires_at=now + timedelta(minutes=OTP_EXPIRE_MINUTES),
        )
    send_sms(
        phone,
        (
            f"{SMS_BRAND_NAME}: Your account verification code is {otp.otp_code}. "
            f"Valid for {OTP_EXPIRE_MINUTES} minutes. Do not share this code with anyone."
        ),
        OtpPurpose.REGISTER,
    )
    return Response({'detail': 'OTP sent', 'expires_in': OTP_EXPIRE_MINUTES * 60}, status=HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_verify_otp(request):
    phone = _normalize_phone(request.data.get('phone'))
    otp_code = (request.data.get('otp') or '').strip()
    otp = _active_otp(phone, OtpPurpose.REGISTER)
    if not otp:
        return error_response('OTP not requested', HTTP_400_BAD_REQUEST)
    if otp.verified_at:
        return Response({'detail': 'OTP already verified'}, status=HTTP_200_OK)
    if timezone.now() > otp.expires_at:
        otp.is_active = False
        otp.save(update_fields=['is_active', 'updated_at'])
        return error_response('OTP expired', HTTP_400_BAD_REQUEST)
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        otp.is_active = False
        otp.save(update_fields=['is_active', 'updated_at'])
        return error_response('Maximum OTP attempts exceeded', HTTP_400_BAD_REQUEST)
    if otp.otp_code != otp_code:
        otp.attempts += 1
        otp.save(update_fields=['attempts', 'updated_at'])
        return error_response('Invalid OTP', HTTP_400_BAD_REQUEST)
    otp.verified_at = timezone.now()
    otp.save(update_fields=['verified_at', 'updated_at'])
    return Response({'detail': 'OTP verified'}, status=HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_complete(request):
    phone = _normalize_phone(request.data.get('phone'))
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    name = (request.data.get('name') or '').strip()
    if not name:
        return error_response('Full name is required', HTTP_400_BAD_REQUEST)
    if not password or not confirm_password:
        return error_response('password and confirm_password are required', HTTP_400_BAD_REQUEST)
    if password != confirm_password:
        return error_response('Passwords do not match', HTTP_400_BAD_REQUEST)
    pw_error = _validate_password(password)
    if pw_error:
        return error_response(pw_error, HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=phone).exists():
        return error_response('A user with this phone already exists', HTTP_400_BAD_REQUEST)
    otp = _active_otp(phone, OtpPurpose.REGISTER)
    if not otp or not otp.verified_at:
        return error_response('Phone verification required', HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(phone, password=password, phone=phone, name=name)
    token, _ = Token.objects.get_or_create(user=user)
    otp.is_active = False
    otp.save(update_fields=['is_active', 'updated_at'])
    serializer = UserSerializer(user, context={'request': request})
    return Response({'token': token.key, 'user': serializer.data}, status=HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Legacy endpoint compatibility."""
    return register_complete(request)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_request_otp(request):
    phone = _normalize_phone(request.data.get('phone'))
    if not User.objects.filter(phone=phone).exists():
        return error_response('User with this phone does not exist', HTTP_400_BAD_REQUEST)
    now = timezone.now()
    current = _active_otp(phone, OtpPurpose.FORGOT_PASSWORD)
    if current and (now - current.last_sent_at).total_seconds() < OTP_RESEND_SECONDS:
        wait = OTP_RESEND_SECONDS - int((now - current.last_sent_at).total_seconds())
        return error_response(f'Please wait {wait}s before requesting another OTP', HTTP_400_BAD_REQUEST)
    if current:
        current.otp_code = _gen_code()
        current.expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
        current.last_sent_at = now
        current.attempts = 0
        current.verified_at = None
        current.resend_count += 1
        current.save(update_fields=['otp_code', 'expires_at', 'last_sent_at', 'attempts', 'verified_at', 'resend_count', 'updated_at'])
        otp = current
    else:
        otp = OtpVerification.objects.create(
            phone=phone,
            purpose=OtpPurpose.FORGOT_PASSWORD,
            otp_code=_gen_code(),
            expires_at=now + timedelta(minutes=OTP_EXPIRE_MINUTES),
        )
    send_sms(
        phone,
        (
            f"{SMS_BRAND_NAME}: Your password reset verification code is {otp.otp_code}. "
            f"Valid for {OTP_EXPIRE_MINUTES} minutes. Do not share this code with anyone."
        ),
        OtpPurpose.FORGOT_PASSWORD,
    )
    return Response({'detail': 'OTP sent', 'expires_in': OTP_EXPIRE_MINUTES * 60}, status=HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_verify_otp(request):
    phone = _normalize_phone(request.data.get('phone'))
    otp_code = (request.data.get('otp') or '').strip()
    otp = _active_otp(phone, OtpPurpose.FORGOT_PASSWORD)
    if not otp:
        return error_response('OTP not requested', HTTP_400_BAD_REQUEST)
    if timezone.now() > otp.expires_at:
        otp.is_active = False
        otp.save(update_fields=['is_active', 'updated_at'])
        return error_response('OTP expired', HTTP_400_BAD_REQUEST)
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        otp.is_active = False
        otp.save(update_fields=['is_active', 'updated_at'])
        return error_response('Maximum OTP attempts exceeded', HTTP_400_BAD_REQUEST)
    if otp.otp_code != otp_code:
        otp.attempts += 1
        otp.save(update_fields=['attempts', 'updated_at'])
        return error_response('Invalid OTP', HTTP_400_BAD_REQUEST)
    otp.verified_at = timezone.now()
    otp.save(update_fields=['verified_at', 'updated_at'])
    return Response({'detail': 'OTP verified'}, status=HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    phone = _normalize_phone(request.data.get('phone'))
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    if not password or not confirm_password:
        return error_response('password and confirm_password are required', HTTP_400_BAD_REQUEST)
    if password != confirm_password:
        return error_response('Passwords do not match', HTTP_400_BAD_REQUEST)
    pw_error = _validate_password(password)
    if pw_error:
        return error_response(pw_error, HTTP_400_BAD_REQUEST)
    otp = _active_otp(phone, OtpPurpose.FORGOT_PASSWORD)
    if not otp or not otp.verified_at:
        return error_response('OTP verification required', HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return error_response('User not found', HTTP_400_BAD_REQUEST)
    user.set_password(password)
    user.save(update_fields=['password', 'updated_at'])
    otp.is_active = False
    otp.save(update_fields=['is_active', 'updated_at'])
    return Response({'detail': 'Password reset successful'}, status=HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """POST with phone (or username) + password. Returns { token, user }."""
    raw_phone = (request.data.get('phone') or request.data.get('username') or '').strip()
    # Normalize to digits only so lookup matches how register stores phone
    phone = re.sub(r'\D', '', raw_phone) if raw_phone else ''
    password = request.data.get('password')
    if not phone or not password:
        return Response(
            {'detail': 'phone and password are required'},
            status=HTTP_400_BAD_REQUEST,
        )
    user = authenticate(request, username=phone, password=password)
    if user is None:
        return error_response('Invalid credentials', HTTP_400_BAD_REQUEST, code='INVALID_CREDENTIALS')
    if not user.is_active:
        return error_response('User account is disabled', HTTP_400_BAD_REQUEST, code='ACCOUNT_DISABLED')
    blocked = get_account_block_error(user)
    if blocked:
        return policy_error_response(blocked)
    token, _ = Token.objects.get_or_create(user=user)
    serializer = UserSerializer(user, context={'request': request})
    return Response({
        'token': token.key,
        'user': serializer.data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET current user (requires Authorization: Token ...)."""
    blocked = get_account_block_error(request.user)
    if blocked:
        return policy_error_response(blocked)
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Revoke current token."""
    Token.objects.filter(user=request.user).delete()
    return Response({'detail': 'Logged out successfully'}, status=HTTP_200_OK)
