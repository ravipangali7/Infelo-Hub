from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import User
from core.serializers import UserMinimalSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_list(request):
    qs = User.objects.filter(referred_by=request.user).select_related('package').order_by('-created_at')
    serializer = UserMinimalSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


def _build_tree(user, depth=0, max_depth=5):
    if depth >= max_depth:
        return None
    referrals = list(User.objects.filter(referred_by=user).select_related('package').order_by('created_at'))
    return {
        'user': UserMinimalSerializer(user, context={}).data,
        'children': [_build_tree(r, depth + 1, max_depth) for r in referrals if _build_tree(r, depth + 1, max_depth)],
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team_tree(request):
    root = _build_tree(request.user)
    if root is None:
        root = {'user': UserMinimalSerializer(request.user, context={}).data, 'children': []}
    else:
        root['user'] = UserMinimalSerializer(request.user, context={}).data
    return Response(root)
