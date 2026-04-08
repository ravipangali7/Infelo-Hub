from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from core.campaign_submission_rewards import approve_submission_with_reward
from core.models import CampaignSubmission, SubmissionStatus
from core.serializers import CampaignSubmissionSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import submission_summary

SUBMISSION_ORDER_FIELDS = ['id', 'status', 'created_at', 'updated_at']


@api_view(['GET'])
@permission_classes([IsAdminUser])
def submission_list(request):
    qs = CampaignSubmission.objects.select_related('campaign', 'user').prefetch_related('proofs')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    campaign_id = request.query_params.get('campaign')
    if campaign_id:
        qs = qs.filter(campaign_id=campaign_id)
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(campaign__name__icontains=search) | Q(user__phone__icontains=search) | Q(user__name__icontains=search)
        if search.isdigit():
            q |= Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, CampaignSubmissionSerializer, {'request': request}, SUBMISSION_ORDER_FIELDS,
        summary_builder=submission_summary,
    )


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def submission_delete(request, pk):
    try:
        s = CampaignSubmission.objects.get(pk=pk)
    except CampaignSubmission.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    s.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAdminUser])
def submission_detail(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        try:
            s = CampaignSubmission.objects.select_related('campaign', 'user').prefetch_related('proofs').get(pk=pk)
        except CampaignSubmission.DoesNotExist:
            return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CampaignSubmissionSerializer(s, context={'request': request})
        return Response(serializer.data)
    return submission_delete(raw_request, pk)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def submission_approve(request, pk):
    try:
        s = approve_submission_with_reward(pk)
    except CampaignSubmission.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    s = CampaignSubmission.objects.select_related('campaign', 'user').prefetch_related('proofs').get(pk=s.pk)
    serializer = CampaignSubmissionSerializer(s, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def submission_reject(request, pk):
    try:
        s = CampaignSubmission.objects.get(pk=pk)
    except CampaignSubmission.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    reason = str(request.data.get('reason', request.data.get('reject_reason', '')) or '').strip()
    if not reason:
        return Response({'detail': 'Reject reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
    s.status = SubmissionStatus.REJECTED
    s.reject_reason = reason
    s.save()
    serializer = CampaignSubmissionSerializer(s, context={'request': request})
    return Response(serializer.data)
