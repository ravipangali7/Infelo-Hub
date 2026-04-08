from dataclasses import dataclass

from .models import KycStatus, UserStatus


@dataclass
class PolicyError:
    code: str
    detail: str
    status_code: int


def get_account_block_error(user):
    """Return PolicyError when account cannot access protected APIs."""
    if not user.is_active:
        return PolicyError(
            code='ACCOUNT_DISABLED',
            detail='Your account is disabled. Please contact administration.',
            status_code=403,
        )
    if user.status == UserStatus.FREEZE:
        return PolicyError(
            code='ACCOUNT_FROZEN',
            detail='Your account was frozen by administration. Please contact administration.',
            status_code=403,
        )
    if user.status == UserStatus.DEACTIVATE:
        return PolicyError(
            code='ACCOUNT_DEACTIVATED',
            detail='Your account is deactivated. Please contact administration.',
            status_code=403,
        )
    return None


def get_withdraw_policy_error(user, settings_obj, amount=None, wallet_type='earning'):
    blocked = get_account_block_error(user)
    if blocked:
        return blocked
    if user.is_wallet_freeze:
        return PolicyError(
            code='WALLET_FROZEN',
            detail='Your wallet is frozen. Please contact administration.',
            status_code=403,
        )
    kyc_compulsory = True
    if settings_obj is not None:
        kyc_compulsory = getattr(settings_obj, 'is_kyc_compulsory', True)
    if kyc_compulsory and user.kyc_status != KycStatus.APPROVED:
        return PolicyError(
            code='KYC_REQUIRED',
            detail='KYC approval is required for withdrawals.',
            status_code=403,
        )
    if settings_obj and not settings_obj.is_withdrawal:
        return PolicyError(
            code='FEATURE_DISABLED',
            detail='Withdrawals are currently disabled by administration.',
            status_code=403,
        )
    if settings_obj and wallet_type == 'earning' and not settings_obj.is_earning_withdrawal:
        return PolicyError(
            code='FEATURE_DISABLED',
            detail='Earning wallet withdrawals are currently disabled.',
            status_code=403,
        )
    if settings_obj and wallet_type == 'topup' and not settings_obj.is_topup_withdrawal:
        return PolicyError(
            code='FEATURE_DISABLED',
            detail='Top-up wallet withdrawals are currently disabled.',
            status_code=403,
        )

    if amount is not None and settings_obj:
        min_withdraw = float(settings_obj.minimum_withdrawal or 0)
        max_withdraw = float(settings_obj.maximum_withdrawal or 0)
        if amount < min_withdraw:
            return PolicyError(
                code='LIMIT_VIOLATION',
                detail=f'Withdrawal amount must be at least {min_withdraw:.2f}.',
                status_code=400,
            )
        if max_withdraw > 0 and amount > max_withdraw:
            return PolicyError(
                code='LIMIT_VIOLATION',
                detail=f'Withdrawal amount must not exceed {max_withdraw:.2f}.',
                status_code=400,
            )
    return None


def get_deposit_policy_error(user, settings_obj, amount=None):
    blocked = get_account_block_error(user)
    if blocked:
        return blocked
    if user.is_wallet_freeze:
        return PolicyError(
            code='WALLET_FROZEN',
            detail='Your wallet is frozen. Please contact administration.',
            status_code=403,
        )
    if amount is not None and settings_obj:
        min_deposit = float(settings_obj.minimum_deposit or 0)
        max_deposit = float(settings_obj.maximum_deposit or 0)
        if amount < min_deposit:
            return PolicyError(
                code='LIMIT_VIOLATION',
                detail=f'Deposit amount must be at least {min_deposit:.2f}.',
                status_code=400,
            )
        if max_deposit > 0 and amount > max_deposit:
            return PolicyError(
                code='LIMIT_VIOLATION',
                detail=f'Deposit amount must not exceed {max_deposit:.2f}.',
                status_code=400,
            )
    return None
