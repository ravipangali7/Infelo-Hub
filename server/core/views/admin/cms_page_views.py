from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import CmsPage
from core.serializers import CmsPageSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import count_only_summary

CMS_PAGE_ORDER_FIELDS = ['id', 'name', 'slug', 'title', 'is_active', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def cms_page_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return cms_page_create(raw_request)
    return cms_page_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def cms_page_list(request):
    qs = CmsPage.objects.all()
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(name__icontains=search) | qs.filter(slug__icontains=search) | qs.filter(title__icontains=search)
    active = request.query_params.get('is_active')
    if active in ('true', '1'):
        qs = qs.filter(is_active=True)
    elif active in ('false', '0'):
        qs = qs.filter(is_active=False)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, CmsPageSerializer, {'request': request}, CMS_PAGE_ORDER_FIELDS, default_order='-created_at',
        summary_builder=count_only_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def cms_page_detail(request, pk):
    try:
        obj = CmsPage.objects.get(pk=pk)
    except CmsPage.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CmsPageSerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def cms_page_create(request):
    serializer = CmsPageSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def cms_page_update(request, pk):
    try:
        obj = CmsPage.objects.get(pk=pk)
    except CmsPage.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CmsPageSerializer(obj, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def cms_page_delete(request, pk):
    try:
        obj = CmsPage.objects.get(pk=pk)
    except CmsPage.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def cms_page_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return cms_page_detail(raw_request, pk)
    if request.method == 'PATCH':
        return cms_page_update(raw_request, pk)
    return cms_page_delete(raw_request, pk)
