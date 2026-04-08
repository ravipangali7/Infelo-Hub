from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Transaction
from core.serializers import TransactionSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def transaction_list(request):
    qs = Transaction.objects.filter(user=request.user).order_by('-created_at')
    EARNING_TYPES = ['earning', 'task_reward', 'buying_reward']
    type_filter = request.query_params.get('transaction_for')
    if type_filter == 'earning':
        qs = qs.filter(transaction_for__in=EARNING_TYPES)
    elif type_filter:
        qs = qs.filter(transaction_for=type_filter)
    serializer = TransactionSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})
