from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.serializers import UserSerializer


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_me_update(request):
    user = request.user
    if request.method == 'GET':
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)
    # PATCH
    for key in ['name', 'first_name', 'last_name', 'email']:
        if key in request.data:
            setattr(user, key, request.data[key])
    user.save()
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)
