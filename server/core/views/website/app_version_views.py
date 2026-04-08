from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.api_utils import build_absolute_uri
from core.models import SystemSetting


@api_view(['GET'])
@permission_classes([AllowAny])
def public_app_version(request):
    setting, _ = SystemSetting.objects.get_or_create(pk=1, defaults={})
    android_url = None
    if setting.android_file:
        android_url = build_absolute_uri(request, setting.android_file.url)
    version = (setting.app_current_version or '').strip() or '1'
    return Response({
        'app_current_version': version,
        'android_file_url': android_url,
    })
