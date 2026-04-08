from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from core.models import SystemSetting
from core.serializers import SystemSettingSerializer


def get_or_create_setting():
    setting, _ = SystemSetting.objects.get_or_create(pk=1, defaults={})
    return setting


@api_view(['GET'])
@permission_classes([IsAdminUser])
def setting_detail(request):
    try:
        setting = SystemSetting.objects.get(pk=1)
    except SystemSetting.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    serializer = SystemSettingSerializer(setting, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def setting_update(request):
    setting = get_or_create_setting()
    serializer = SystemSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def setting_detail_update(request):
    raw_request = request._request
    if request.method == 'GET':
        return setting_detail(raw_request)
    return setting_update(raw_request)
