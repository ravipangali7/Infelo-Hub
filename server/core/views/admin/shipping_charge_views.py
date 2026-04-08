from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import ShippingCharge
from core.serializers import ShippingChargeSerializer
from django.db.models import Q
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import count_only_summary

SHIPPING_CHARGE_ORDER_FIELDS = ['id', 'charge', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def shipping_charge_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return shipping_charge_create(raw_request)
    return shipping_charge_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def shipping_charge_list(request):
    qs = ShippingCharge.objects.select_related('city')
    city_id = request.query_params.get('city')
    if city_id:
        qs = qs.filter(city_id=city_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(city__name__icontains=search)
        if search.isdigit():
            q |= Q(city_id=int(search)) | Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, ShippingChargeSerializer, {'request': request}, SHIPPING_CHARGE_ORDER_FIELDS,
        summary_builder=count_only_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def shipping_charge_detail(request, pk):
    try:
        obj = ShippingCharge.objects.select_related('city').get(pk=pk)
    except ShippingCharge.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ShippingChargeSerializer(obj, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def shipping_charge_create(request):
    serializer = ShippingChargeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def shipping_charge_update(request, pk):
    try:
        obj = ShippingCharge.objects.get(pk=pk)
    except ShippingCharge.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ShippingChargeSerializer(obj, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def shipping_charge_delete(request, pk):
    try:
        obj = ShippingCharge.objects.get(pk=pk)
    except ShippingCharge.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def shipping_charge_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return shipping_charge_detail(raw_request, pk)
    if request.method == 'PATCH':
        return shipping_charge_update(raw_request, pk)
    return shipping_charge_delete(raw_request, pk)
