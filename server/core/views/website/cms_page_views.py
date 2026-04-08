from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from core.models import CmsPage
from core.serializers import CmsPageSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def public_cms_page(request, slug):
    try:
        page = CmsPage.objects.get(slug=slug, is_active=True)
    except CmsPage.DoesNotExist:
        return Response({'detail': 'Page not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CmsPageSerializer(page, context={'request': request})
    return Response(serializer.data)
