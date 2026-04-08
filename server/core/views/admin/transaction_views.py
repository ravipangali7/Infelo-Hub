from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db.models import Q
from core.models import Transaction
from core.serializers import TransactionSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range
from core.admin_summary import transaction_summary

TRANSACTION_ORDER_FIELDS = ['id', 'amount', 'transaction_type', 'status', 'created_at', 'updated_at']


@api_view(['GET'])
@permission_classes([IsAdminUser])
def transaction_list(request):
    qs = Transaction.objects.select_related('user', 'payment_request', 'payment_request__user')
    status_filter = request.query_params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    transaction_type = request.query_params.get('transaction_type')
    if transaction_type:
        qs = qs.filter(transaction_type=transaction_type)
    transaction_for = request.query_params.get('transaction_for')
    if transaction_for:
        qs = qs.filter(transaction_for=transaction_for)
    user_id = request.query_params.get('user')
    if user_id:
        qs = qs.filter(user_id=user_id)
    search = (request.query_params.get('search') or '').strip()
    if search:
        q = Q(remarks__icontains=search) | Q(user__phone__icontains=search) | Q(user__name__icontains=search)
        if search.isdigit():
            q |= Q(user_id=int(search)) | Q(pk=int(search))
        qs = qs.filter(q)
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, TransactionSerializer, {'request': request}, TRANSACTION_ORDER_FIELDS,
        summary_builder=transaction_summary,
    )


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def transaction_delete(request, pk):
    try:
        t = Transaction.objects.select_related('user', 'payment_request', 'payment_request__user').get(pk=pk)
    except Transaction.DoesNotExist:
        return Response({'detail': 'Not found'}, status=http_status.HTTP_404_NOT_FOUND)
    t.delete()
    return Response(status=http_status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAdminUser])
def transaction_detail(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        try:
            t = Transaction.objects.select_related('user', 'payment_request', 'payment_request__user').get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Not found'}, status=http_status.HTTP_404_NOT_FOUND)
        serializer = TransactionSerializer(t, context={'request': request})
        return Response(serializer.data)
    return transaction_delete(raw_request, pk)
