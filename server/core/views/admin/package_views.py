from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import Package
from core.serializers import PackageSerializer, PackageDetailSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import package_summary

PACKAGE_ORDER_FIELDS = ['id', 'name', 'amount', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def package_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return package_create(raw_request)
    return package_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def package_list(request):
    qs = Package.objects.prefetch_related('products')
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(name__icontains=search)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, PackageSerializer, {'request': request}, PACKAGE_ORDER_FIELDS,
        summary_builder=package_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def package_detail(request, pk):
    try:
        p = Package.objects.prefetch_related('products__product').get(pk=pk)
    except Package.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PackageDetailSerializer(p, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def package_create(request):
    serializer = PackageSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def package_update(request, pk):
    try:
        p = Package.objects.get(pk=pk)
    except Package.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PackageSerializer(p, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def package_delete(request, pk):
    try:
        p = Package.objects.get(pk=pk)
    except Package.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    p.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def package_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return package_detail(raw_request, pk)
    if request.method == 'PATCH':
        return package_update(raw_request, pk)
    return package_delete(raw_request, pk)
