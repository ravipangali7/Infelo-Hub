from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from core.models import SmsLog
from core.serializers import SmsLogSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range

SMS_LOG_ORDER_FIELDS = ["id", "phone", "purpose", "status", "created_at", "updated_at"]


@api_view(["GET"])
@permission_classes([IsAdminUser])
def sms_log_list(request):
    qs = SmsLog.objects.all()
    purpose = request.query_params.get("purpose")
    if purpose:
        qs = qs.filter(purpose=purpose)
    status = request.query_params.get("status")
    if status:
        qs = qs.filter(status=status)
    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(Q(phone__icontains=search) | Q(message__icontains=search))
    qs = filter_queryset_date_range(qs, request, "created_at")
    return paginate_queryset(qs, request, SmsLogSerializer, {"request": request}, SMS_LOG_ORDER_FIELDS)
