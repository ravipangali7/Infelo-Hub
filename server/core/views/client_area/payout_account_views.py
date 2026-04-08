from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import PayoutAccount
from core.serializers import PayoutAccountSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payout_account_list_create(request):
    if request.method == 'GET':
        qs = PayoutAccount.objects.filter(user=request.user).order_by('-created_at')
        serializer = PayoutAccountSerializer(qs, many=True, context={'request': request})
        return Response({'results': serializer.data})
    # POST — do not use {**request.data, ...}: unpacking QueryDict breaks multipart
    # (scalar fields become lists; FileField sees non-file values).
    post_data = request.data.copy()
    post_data['user'] = request.user.pk
    serializer = PayoutAccountSerializer(data=post_data, context={'request': request})
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def payout_account_detail_delete(request, pk):
    try:
        acc = PayoutAccount.objects.get(pk=pk, user=request.user)
    except PayoutAccount.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = PayoutAccountSerializer(acc, context={'request': request})
        return Response(serializer.data)
    # DELETE
    acc.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
