from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import ProductCategory
from core.serializers import ProductCategorySerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import category_summary

CATEGORY_ORDER_FIELDS = ['id', 'name', 'is_active', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def category_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return category_create(raw_request)
    return category_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def category_list(request):
    qs = ProductCategory.objects.select_related('parent').all()
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        qs = qs.filter(is_active=is_active.lower() == 'true')
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(name__icontains=search)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, ProductCategorySerializer, {'request': request}, CATEGORY_ORDER_FIELDS, default_order='name',
        summary_builder=category_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def category_detail(request, pk):
    try:
        c = ProductCategory.objects.select_related('parent').get(pk=pk)
    except ProductCategory.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductCategorySerializer(c, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def category_create(request):
    serializer = ProductCategorySerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def category_update(request, pk):
    try:
        c = ProductCategory.objects.get(pk=pk)
    except ProductCategory.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductCategorySerializer(c, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def category_delete(request, pk):
    try:
        c = ProductCategory.objects.get(pk=pk)
    except ProductCategory.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    c.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def category_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return category_detail(raw_request, pk)
    if request.method == 'PATCH':
        return category_update(raw_request, pk)
    return category_delete(raw_request, pk)
