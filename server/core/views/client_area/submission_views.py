from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from core.models import CampaignSubmission
from core.serializers import (
    CampaignSubmissionSerializer,
    CampaignSubmissionProofSerializer,
    CampaignSubmissionProofCreateSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def submission_list(request):
    qs = CampaignSubmission.objects.filter(user=request.user).select_related('campaign').prefetch_related('proofs').order_by('-created_at')
    serializer = CampaignSubmissionSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submission_create(request):
    data = {**request.data, 'user': request.user.pk}
    serializer = CampaignSubmissionSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def submission_detail(request, pk):
    try:
        s = CampaignSubmission.objects.filter(user=request.user).select_related('campaign').prefetch_related('proofs').get(pk=pk)
    except CampaignSubmission.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = CampaignSubmissionSerializer(s, context={'request': request})
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def submission_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return submission_create(raw_request)
    return submission_list(raw_request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submission_proof_create(request, pk):
    try:
        submission = CampaignSubmission.objects.select_related('campaign').get(pk=pk, user=request.user)
    except CampaignSubmission.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = CampaignSubmissionProofCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        proof = serializer.save(campaign_submission=submission)
        out = CampaignSubmissionProofSerializer(proof, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
