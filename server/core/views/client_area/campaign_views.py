from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from core.models import Campaign
from core.serializers import CampaignSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def campaign_list(request):
    qs = Campaign.objects.filter(status__in=['running', 'coming']).select_related('product').order_by('-created_at')
    serializer = CampaignSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def campaign_detail(request, pk):
    try:
        c = Campaign.objects.select_related('product').get(pk=pk)
    except Campaign.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CampaignSerializer(c, context={'request': request})
    return Response(serializer.data)
