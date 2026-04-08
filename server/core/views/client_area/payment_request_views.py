from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import PaymentRequest, PaymentRequestStatus, PaymentRequestType, PayoutAccount, SystemSetting
from core.serializers import PaymentRequestSerializer
from core.account_policy import get_deposit_policy_error, get_withdraw_policy_error
from core.api_utils import error_response, policy_error_response, flatten_multipart_data


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_request_list(request):
    qs = PaymentRequest.objects.filter(user=request.user).select_related('payout_account').order_by('-created_at')
    type_filter = request.query_params.get('type')
    if type_filter:
        qs = qs.filter(type=type_filter)
    serializer = PaymentRequestSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_request_create(request):
    flat = flatten_multipart_data(request.data)
    amount_raw = flat.get('amount')
    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        return error_response('Amount is required and must be numeric.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')
    if amount <= 0:
        return error_response('Amount must be greater than 0.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')

    request_type = flat.get('type')
    settings_obj = SystemSetting.objects.order_by('-id').first()
    if request_type == PaymentRequestType.WITHDRAW:
        wallet_type = str(flat.get('wallet_type') or 'earning').lower()
        policy_error = get_withdraw_policy_error(request.user, settings_obj, amount=amount, wallet_type=wallet_type)
        if policy_error:
            return policy_error_response(policy_error)
        available_balance = float(request.user.topup_wallet if wallet_type == 'topup' else request.user.earning_wallet)
        if amount > available_balance:
            return error_response('Insufficient wallet balance.', status.HTTP_400_BAD_REQUEST, code='LIMIT_VIOLATION')
        payout_account_id = flat.get('payout_account')
        if not payout_account_id:
            return error_response('Payout account is required for withdrawal.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')
        try:
            payout_account = PayoutAccount.objects.get(pk=payout_account_id, user=request.user)
        except PayoutAccount.DoesNotExist:
            return error_response('Invalid payout account.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')
        if payout_account.status != 'approved':
            return error_response('Only approved payout accounts can be used.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')
    elif request_type == PaymentRequestType.DEPOSIT:
        policy_error = get_deposit_policy_error(request.user, settings_obj, amount=amount)
        if policy_error:
            return policy_error_response(policy_error)
        if not flat.get('screenshot'):
            return error_response('Deposit screenshot is required.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')
    else:
        return error_response('Invalid payment request type.', status.HTTP_400_BAD_REQUEST, code='VALIDATION_ERROR')

    data = {**flat, 'user': request.user.pk}
    serializer = PaymentRequestSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        serializer.save(user=request.user, status=PaymentRequestStatus.PENDING)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return error_response('Validation failed.', status.HTTP_400_BAD_REQUEST, errors=serializer.errors, code='VALIDATION_ERROR')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_request_list_create(request):
    if request.method == 'POST':
        return payment_request_create(request._request)
    return payment_request_list(request._request)
