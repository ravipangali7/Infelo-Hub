from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import ShippingCharge
from core.serializers import ShippingChargeSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shipping_charge_list(request):
    qs = ShippingCharge.objects.select_related('city').order_by('city__name', 'id')
    serializer = ShippingChargeSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})
