from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import Banner
from core.serializers import BannerSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import count_only_summary

BANNER_ORDER_FIELDS = ['id', 'title', 'order', 'is_active', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def banner_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return banner_create(raw_request)
    return banner_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def banner_list(request):
    qs = Banner.objects.all()
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(title__icontains=search)
    active = request.query_params.get('is_active')
    if active in ('true', '1'):
        qs = qs.filter(is_active=True)
    elif active in ('false', '0'):
        qs = qs.filter(is_active=False)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, BannerSerializer, {'request': request}, BANNER_ORDER_FIELDS, default_order='order',
        summary_builder=count_only_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def banner_detail(request, pk):
    try:
        obj = Banner.objects.get(pk=pk)
    except Banner.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = BannerSerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def banner_create(request):
    serializer = BannerSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def banner_update(request, pk):
    try:
        obj = Banner.objects.get(pk=pk)
    except Banner.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = BannerSerializer(obj, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def banner_delete(request, pk):
    try:
        obj = Banner.objects.get(pk=pk)
    except Banner.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def banner_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return banner_detail(raw_request, pk)
    if request.method == 'PATCH':
        return banner_update(raw_request, pk)
    return banner_delete(raw_request, pk)
