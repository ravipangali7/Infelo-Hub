from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.models import SiteSetting
from core.serializers import SiteSettingSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def public_site_settings(request):
    obj = SiteSetting.objects.first()
    if not obj:
        return Response({})
    serializer = SiteSettingSerializer(obj, context={'request': request})
    # Only return public-safe fields
    data = serializer.data
    safe_fields = ['id', 'name', 'logo_url', 'title', 'subtitle', 'phone', 'whatsapp',
                   'facebook', 'instagram', 'tiktok', 'youtube', 'google_analytics_script']
    return Response({k: data[k] for k in safe_fields if k in data})
