from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .account_policy import get_account_block_error


class PolicyTokenAuthentication(TokenAuthentication):
    """
    Token auth with business account policy checks.
    Blocks frozen/deactivated/disabled accounts for token-based API access.
    """

    def authenticate_credentials(self, key):
        user_auth_tuple = super().authenticate_credentials(key)
        if not user_auth_tuple:
            return user_auth_tuple
        user, token = user_auth_tuple
        blocked = get_account_block_error(user)
        if blocked:
            raise AuthenticationFailed(detail={'code': blocked.code, 'detail': blocked.detail})
        return user, token
