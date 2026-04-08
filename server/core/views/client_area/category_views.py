from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from core.models import ProductCategory
from core.serializers import ProductCategorySerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def category_list(request):
    qs = ProductCategory.objects.filter(is_active=True).select_related('parent').order_by('name')
    serializer = ProductCategorySerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})
