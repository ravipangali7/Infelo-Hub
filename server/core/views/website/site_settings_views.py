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
    safe_fields = [
        'id', 'name', 'logo_url', 'title', 'subtitle', 'phone', 'whatsapp',
        'facebook', 'instagram', 'tiktok', 'youtube', 'google_analytics_script',
        'seo_home_meta_title', 'seo_home_meta_description', 'seo_home_meta_keywords',
        'seo_home_og_image_url',
        'seo_shop_meta_title', 'seo_shop_meta_description', 'seo_shop_meta_keywords',
        'seo_shop_og_image_url',
        'seo_campaigns_list_meta_title', 'seo_campaigns_list_meta_description',
        'seo_campaigns_list_meta_keywords', 'seo_campaigns_list_og_image_url',
        'seo_learn_meta_title', 'seo_learn_meta_description', 'seo_learn_meta_keywords',
        'seo_learn_og_image_url',
    ]
    return Response({k: data[k] for k in safe_fields if k in data})
