from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from rest_framework.authtoken.models import Token
from core.models import User
from core.serializers import UserSerializer, UserMinimalSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range, error_response
from core.admin_summary import user_list_summary

USER_ORDER_FIELDS = ['id', 'phone', 'name', 'created_at', 'updated_at', 'kyc_status', 'status']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def user_list(request):
    if request.method == 'POST':
        return user_create(request._request)
    qs = User.objects.select_related('package', 'referred_by').all()
    search = (request.query_params.get('search') or '').strip()
    if search and search.lower() != 'undefined':
        qs = qs.filter(Q(phone__icontains=search) | Q(name__icontains=search) | Q(username__icontains=search))
    kyc = request.query_params.get('kyc_status')
    if kyc:
        qs = qs.filter(kyc_status=kyc)
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, UserMinimalSerializer, {'request': request}, USER_ORDER_FIELDS,
        summary_builder=user_list_summary,
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_detail(request, pk):
    try:
        user = User.objects.select_related('package', 'referred_by').get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def user_create(request):
    phone = (request.data.get('phone') or '').strip()
    password = request.data.get('password')
    name = (request.data.get('name') or '').strip()
    if not phone:
        return Response({'detail': 'Phone is required.', 'errors': {'phone': ['This field is required.']}}, status=status.HTTP_400_BAD_REQUEST)
    if not password:
        return Response({'detail': 'Password is required.', 'errors': {'password': ['This field is required.']}}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(phone=phone).exists():
        return Response({'detail': 'A user with this phone already exists.', 'errors': {'phone': ['User with this phone already exists.']}}, status=status.HTTP_400_BAD_REQUEST)
    user = User(phone=phone, name=name or phone)
    user.set_password(password)
    user.save()
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def user_update(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    should_revoke_token = False
    for key in ['status', 'package', 'is_wallet_freeze', 'name', 'is_active', 'is_staff']:
        if key in request.data:
            if key in ['status', 'is_active', 'is_staff'] and getattr(user, key) != request.data[key]:
                should_revoke_token = True
            setattr(user, key, request.data[key])
    pwd = request.data.get('password')
    if pwd:
        user.set_password(pwd)
        should_revoke_token = True
    user.save()
    if should_revoke_token:
        Token.objects.filter(user=user).delete()
    serializer = UserSerializer(user, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def user_delete(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    if user.pk == request.user.pk:
        return error_response('Cannot delete your own account.', status.HTTP_403_FORBIDDEN, code='SELF_DELETE')
    if user.is_staff and not request.user.is_superuser:
        return error_response('Only superusers can delete staff accounts.', status.HTTP_403_FORBIDDEN, code='FORBIDDEN')
    Token.objects.filter(user=user).delete()
    user.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def user_detail_update(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return user_detail(raw_request, pk)
    if request.method == 'DELETE':
        return user_delete(raw_request, pk)
    return user_update(raw_request, pk)
