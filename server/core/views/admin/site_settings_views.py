from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import SiteSetting
from core.serializers import SiteSettingSerializer


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAdminUser])
def site_settings(request):
    obj = SiteSetting.objects.first()

    if request.method == 'GET':
        if not obj:
            return Response({})
        serializer = SiteSettingSerializer(obj, context={'request': request})
        return Response(serializer.data)

    if request.method == 'POST':
        if obj:
            serializer = SiteSettingSerializer(obj, data=request.data, partial=True, context={'request': request})
        else:
            serializer = SiteSettingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # PATCH
    if not obj:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = SiteSettingSerializer(obj, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
