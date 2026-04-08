from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from core.models import Vendor
from core.serializers import VendorSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import vendor_summary

VENDOR_ORDER_FIELDS = ['id', 'name', 'phone', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def vendor_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return vendor_create(raw_request)
    return vendor_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def vendor_list(request):
    qs = Vendor.objects.select_related('user').all()
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(phone__icontains=search))
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, VendorSerializer, {'request': request}, VENDOR_ORDER_FIELDS,
        summary_builder=vendor_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def vendor_detail(request, pk):
    try:
        v = Vendor.objects.select_related('user').get(pk=pk)
    except Vendor.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = VendorSerializer(v, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def vendor_create(request):
    serializer = VendorSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def vendor_update(request, pk):
    try:
        v = Vendor.objects.get(pk=pk)
    except Vendor.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = VendorSerializer(v, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def vendor_delete(request, pk):
    try:
        v = Vendor.objects.get(pk=pk)
    except Vendor.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    v.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def vendor_detail_update(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return vendor_detail(raw_request, pk)
    if request.method == 'DELETE':
        return vendor_delete(raw_request, pk)
    return vendor_update(raw_request, pk)
