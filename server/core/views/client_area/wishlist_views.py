from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import Wishlist, Product
from core.serializers import WishlistSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def wishlist_list_add(request):
    if request.method == 'GET':
        qs = Wishlist.objects.filter(user=request.user).select_related('product')
        serializer = WishlistSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # POST — add product to wishlist
    product_id = request.data.get('product')
    if not product_id:
        return Response({'detail': 'product is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    obj, created = Wishlist.objects.get_or_create(user=request.user, product=product)
    serializer = WishlistSerializer(obj, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_remove(request, product_id):
    deleted, _ = Wishlist.objects.filter(user=request.user, product_id=product_id).delete()
    if not deleted:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wishlist_ids(request):
    """Return just product IDs the user has wishlisted for quick frontend checks."""
    ids = list(Wishlist.objects.filter(user=request.user).values_list('product_id', flat=True))
    return Response({'product_ids': ids})
