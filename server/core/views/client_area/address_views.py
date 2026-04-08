from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import Address
from core.serializers import AddressSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def address_list(request):
    qs = Address.objects.filter(user=request.user).select_related('city').order_by('-created_at')
    serializer = AddressSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def address_create(request):
    serializer = AddressSerializer(data={**request.data, 'user': request.user.pk}, context={'request': request})
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def address_detail(request, pk):
    try:
        addr = Address.objects.get(pk=pk, user=request.user)
    except Address.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = AddressSerializer(addr, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def address_update(request, pk):
    try:
        addr = Address.objects.get(pk=pk, user=request.user)
    except Address.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = AddressSerializer(addr, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def address_delete(request, pk):
    try:
        addr = Address.objects.get(pk=pk, user=request.user)
    except Address.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    addr.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def address_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return address_create(raw_request)
    return address_list(raw_request)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def address_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return address_detail(raw_request, pk)
    if request.method == 'PATCH':
        return address_update(raw_request, pk)
    return address_delete(raw_request, pk)
