from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import SystemSetting
from core.api_utils import build_absolute_uri


def get_setting():
    setting, _ = SystemSetting.objects.get_or_create(pk=1, defaults={})
    return setting


def _image_field_url(request, image_field):
    if not image_field:
        return None
    return build_absolute_uri(request, image_field.url)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_balance(request):
    user = request.user
    setting = get_setting()
    return Response({
        'earning_wallet': float(user.earning_wallet),
        'topup_wallet': float(user.topup_wallet),
        'package_id': user.package_id,
        'package_name': user.package.name if user.package else None,
        'limits': {
            'minimum_withdrawal': float(setting.minimum_withdrawal),
            'maximum_withdrawal': float(setting.maximum_withdrawal),
            'minimum_deposit': float(setting.minimum_deposit),
            'maximum_deposit': float(setting.maximum_deposit),
            'withdrawal_admin_fee_type': setting.withdrawal_admin_fee_type,
            'withdrawal_admin_fee': float(setting.withdrawal_admin_fee),
            'is_withdrawal': setting.is_withdrawal,
            'is_earning_withdrawal': setting.is_earning_withdrawal,
            'is_topup_withdrawal': setting.is_topup_withdrawal,
        },
        'deposit_details': {
            'esewa_phone': setting.esewa_phone or '',
            'esewa_qr_url': _image_field_url(request, setting.esewa_qr),
            'khalti_phone': setting.khalti_phone or '',
            'khalti_qr_url': _image_field_url(request, setting.khalti_qr),
            'bank_name': setting.bank_name or '',
            'bank_branch': setting.bank_branch or '',
            'bank_account_no': setting.bank_account_no or '',
            'bank_account_holder_name': setting.bank_account_holder_name or '',
            'bank_qr_url': _image_field_url(request, setting.bank_qr),
        },
    })
