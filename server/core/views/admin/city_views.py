from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import City
from core.serializers import CitySerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import count_only_summary

CITY_ORDER_FIELDS = ['id', 'name', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def city_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return city_create(raw_request)
    return city_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def city_list(request):
    qs = City.objects.all()
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(name__icontains=search)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, CitySerializer, {'request': request}, CITY_ORDER_FIELDS, default_order='name',
        summary_builder=count_only_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def city_detail(request, pk):
    try:
        obj = City.objects.get(pk=pk)
    except City.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CitySerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def city_create(request):
    serializer = CitySerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def city_update(request, pk):
    try:
        obj = City.objects.get(pk=pk)
    except City.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CitySerializer(obj, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def city_delete(request, pk):
    try:
        obj = City.objects.get(pk=pk)
    except City.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def city_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return city_detail(raw_request, pk)
    if request.method == 'PATCH':
        return city_update(raw_request, pk)
    return city_delete(raw_request, pk)
