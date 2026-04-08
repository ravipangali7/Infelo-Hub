from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.models import Banner
from core.serializers import BannerSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def home_config(request):
    banners = Banner.objects.filter(is_active=True)
    banner_data = BannerSerializer(banners, many=True, context={'request': request}).data
    return Response({
        'banners': banner_data,
        'feature_flags': {},
    })
