from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import Package
from core.serializers import PackageSerializer, PackageDetailSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def package_list(request):
    qs = Package.objects.prefetch_related('products').order_by('amount')
    serializer = PackageSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def package_detail(request, pk):
    try:
        p = Package.objects.prefetch_related('products__product').get(pk=pk)
    except Package.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PackageDetailSerializer(p, context={'request': request})
    return Response(serializer.data)
