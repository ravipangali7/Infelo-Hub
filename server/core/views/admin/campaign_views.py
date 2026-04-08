from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import Campaign
from core.serializers import CampaignSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import campaign_summary

CAMPAIGN_ORDER_FIELDS = ['id', 'name', 'status', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def campaign_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return campaign_create(raw_request)
    return campaign_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def campaign_list(request):
    qs = Campaign.objects.select_related('product')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(name__icontains=search)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, CampaignSerializer, {'request': request}, CAMPAIGN_ORDER_FIELDS,
        summary_builder=campaign_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def campaign_detail(request, pk):
    try:
        c = Campaign.objects.select_related('product').get(pk=pk)
    except Campaign.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CampaignSerializer(c, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def campaign_create(request):
    serializer = CampaignSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def campaign_update(request, pk):
    try:
        c = Campaign.objects.get(pk=pk)
    except Campaign.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CampaignSerializer(c, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def campaign_delete(request, pk):
    try:
        c = Campaign.objects.get(pk=pk)
    except Campaign.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    c.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def campaign_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return campaign_detail(raw_request, pk)
    if request.method == 'PATCH':
        return campaign_update(raw_request, pk)
    return campaign_delete(raw_request, pk)
