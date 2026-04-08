from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from core.models import Address
from core.serializers import AddressSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import count_only_summary

ADDRESS_ORDER_FIELDS = ['id', 'name', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def address_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return address_create(raw_request)
    return address_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def address_list(request):
    qs = Address.objects.select_related('user', 'city')
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    city_id = request.query_params.get('city')
    if city_id:
        qs = qs.filter(city_id=city_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(name__icontains=search) | Q(address__icontains=search) | Q(phone__icontains=search)
        if search.isdigit():
            q |= Q(user_id=int(search)) | Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, AddressSerializer, {'request': request}, ADDRESS_ORDER_FIELDS,
        summary_builder=count_only_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def address_detail(request, pk):
    try:
        obj = Address.objects.select_related('user', 'city').get(pk=pk)
    except Address.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = AddressSerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def address_create(request):
    serializer = AddressSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def address_update(request, pk):
    try:
        obj = Address.objects.get(pk=pk)
    except Address.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = AddressSerializer(obj, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def address_delete(request, pk):
    try:
        obj = Address.objects.get(pk=pk)
    except Address.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def address_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return address_detail(raw_request, pk)
    if request.method == 'PATCH':
        return address_update(raw_request, pk)
    return address_delete(raw_request, pk)
