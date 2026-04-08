from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
from core.models import (
    User, Sales, Transaction, Package, PaymentRequest, CampaignSubmission,
    Campaign, PaymentRequestType, PaymentRequestStatus, KycStatus,
    SubmissionStatus, SalesStatus, TransactionFor, TransactionType,
    TransactionStatus, PayoutAccount, PayoutAccountStatus, SystemSetting,
    SmsLog,
)
from core.sms_service import get_sms_balance


def _date_range(days_ago_start, days_ago_end=0):
    """Return (start, end) datetimes for a range relative to now."""
    now = timezone.now()
    end = now - timedelta(days=days_ago_end)
    start = now - timedelta(days=days_ago_start)
    return start, end


def _sales_revenue(start, end):
    return Sales.objects.filter(
        created_at__gte=start, created_at__lt=end
    ).aggregate(s=Sum('total'))['s'] or 0


def _new_users(start, end):
    return User.objects.filter(created_at__gte=start, created_at__lt=end).count()


def _pct_change(current, previous):
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def pending_counts(request):
    """Lightweight endpoint — returns pending item counts for sidebar badges."""
    payout_accounts = PayoutAccount.objects.filter(
        status=PayoutAccountStatus.PENDING
    ).count()
    deposits = PaymentRequest.objects.filter(
        type=PaymentRequestType.DEPOSIT, status=PaymentRequestStatus.PENDING
    ).count()
    withdrawals = PaymentRequest.objects.filter(
        type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.PENDING
    ).count()
    kyc = User.objects.filter(
        kyc_status=KycStatus.PENDING,
        kyc_document_front__isnull=False,
    ).exclude(kyc_document_front='').count()
    submissions = CampaignSubmission.objects.filter(
        status=SubmissionStatus.PENDING
    ).count()
    sales = Sales.objects.filter(status=SalesStatus.PENDING).count()
    return Response({
        'payout_accounts': payout_accounts,
        'deposits': deposits,
        'withdrawals': withdrawals,
        'kyc': kyc,
        'submissions': submissions,
        'sales': sales,
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    week_start = today_start - timedelta(days=7)
    prev_week_start = week_start - timedelta(days=7)

    month_start = today_start - timedelta(days=30)
    prev_month_start = month_start - timedelta(days=30)

    # ── Revenue KPIs ──────────────────────────────────────────────────────────
    revenue_today = float(_sales_revenue(today_start, now))
    revenue_yesterday = float(_sales_revenue(yesterday_start, today_start))
    revenue_week = float(_sales_revenue(week_start, now))
    revenue_prev_week = float(_sales_revenue(prev_week_start, week_start))
    revenue_month = float(_sales_revenue(month_start, now))
    revenue_prev_month = float(_sales_revenue(prev_month_start, month_start))
    revenue_total = float(Sales.objects.aggregate(s=Sum('total'))['s'] or 0)

    # ── User Growth ───────────────────────────────────────────────────────────
    total_users = User.objects.count()
    users_today = _new_users(today_start, now)
    users_yesterday = _new_users(yesterday_start, today_start)
    users_week = _new_users(week_start, now)
    users_prev_week = _new_users(prev_week_start, week_start)
    users_month = _new_users(month_start, now)
    users_prev_month = _new_users(prev_month_start, month_start)
    active_packages = User.objects.filter(package__isnull=False).count()

    # ── Pending Action Counts ─────────────────────────────────────────────────
    pending_payout_accounts = PayoutAccount.objects.filter(
        status=PayoutAccountStatus.PENDING
    ).count()
    pending_deposits = PaymentRequest.objects.filter(
        type=PaymentRequestType.DEPOSIT, status=PaymentRequestStatus.PENDING
    ).count()
    pending_withdrawals = PaymentRequest.objects.filter(
        type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.PENDING
    ).count()
    pending_kyc = User.objects.filter(
        kyc_status=KycStatus.PENDING,
        kyc_document_front__isnull=False,
    ).exclude(kyc_document_front='').count()
    pending_submissions = CampaignSubmission.objects.filter(
        status=SubmissionStatus.PENDING
    ).count()
    pending_sales = Sales.objects.filter(status=SalesStatus.PENDING).count()

    pending_deposit_amount = float(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.DEPOSIT, status=PaymentRequestStatus.PENDING
        ).aggregate(s=Sum('amount'))['s'] or 0
    )
    pending_withdrawal_amount = float(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.PENDING
        ).aggregate(s=Sum('amount'))['s'] or 0
    )

    # ── Sales Pipeline (by status) ────────────────────────────────────────────
    sales_pipeline_qs = Sales.objects.values('status').annotate(
        count=Count('id'), amount=Sum('total')
    )
    sales_pipeline = {
        row['status']: {'count': row['count'], 'amount': float(row['amount'] or 0)}
        for row in sales_pipeline_qs
    }
    total_orders = Sales.objects.count()

    # ── Campaign & Submission Stats ───────────────────────────────────────────
    total_campaigns = Campaign.objects.count()
    active_campaigns = Campaign.objects.filter(status='running').count()
    total_submissions = CampaignSubmission.objects.count()
    approved_submissions = CampaignSubmission.objects.filter(
        status=SubmissionStatus.APPROVED
    ).count()
    submission_approval_rate = round(
        (approved_submissions / total_submissions * 100) if total_submissions > 0 else 0, 1
    )

    # ── Wallet Economy ────────────────────────────────────────────────────────
    wallet_agg = User.objects.aggregate(
        earning=Sum('earning_wallet'),
        topup=Sum('topup_wallet'),
    )
    total_earning_wallet = float(wallet_agg['earning'] or 0)
    total_topup_wallet = float(wallet_agg['topup'] or 0)
    total_system_wallet = total_earning_wallet + total_topup_wallet

    # ── Package Distribution ──────────────────────────────────────────────────
    package_dist = list(
        User.objects.filter(package__isnull=False)
        .values('package__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # ── Top Earners ───────────────────────────────────────────────────────────
    top_earners = list(
        User.objects.filter(earning_wallet__gt=0)
        .order_by('-earning_wallet')
        .values('id', 'name', 'phone', 'earning_wallet', 'topup_wallet')[:5]
    )
    for u in top_earners:
        u['earning_wallet'] = float(u['earning_wallet'])
        u['topup_wallet'] = float(u['topup_wallet'])

    # ── 7-day Daily Revenue Chart ─────────────────────────────────────────────
    revenue_chart = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day_revenue = float(_sales_revenue(day_start, day_end))
        day_orders = Sales.objects.filter(
            created_at__gte=day_start, created_at__lt=day_end
        ).count()
        revenue_chart.append({
            'date': day_start.strftime('%b %d'),
            'revenue': day_revenue,
            'orders': day_orders,
        })

    # ── 7-day New Users Chart ─────────────────────────────────────────────────
    users_chart = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        users_chart.append({
            'date': day_start.strftime('%b %d'),
            'users': _new_users(day_start, day_end),
        })

    # ── Recent Transactions ───────────────────────────────────────────────────
    recent_transactions = list(
        Transaction.objects.select_related('user').order_by('-created_at')[:10].values(
            'id', 'user_id', 'user__name', 'user__phone',
            'amount', 'transaction_type', 'transaction_for', 'status', 'created_at'
        )
    )
    for t in recent_transactions:
        t['created_at'] = t['created_at'].isoformat() if t.get('created_at') else None
        t['amount'] = float(t['amount'])

    # ── Approved Deposits / Withdrawals totals ────────────────────────────────
    approved_deposits_total = float(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.DEPOSIT, status=PaymentRequestStatus.APPROVED
        ).aggregate(s=Sum('amount'))['s'] or 0
    )
    approved_withdrawals_total = float(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.APPROVED
        ).aggregate(s=Sum('amount'))['s'] or 0
    )
    latest_system_setting = SystemSetting.objects.order_by('-id').first()
    system_balance = float(latest_system_setting.balance) if latest_system_setting else 0.0
    sms_total = SmsLog.objects.count()
    sms_success = SmsLog.objects.filter(status='success').count()
    sms_failed = SmsLog.objects.filter(status='failed').count()
    sms_info = get_sms_balance()
    sms_balance = sms_info.get("balance")
    sms_balance_display = sms_info.get("balance_display")
    if not sms_info.get("configured"):
        sms_balance_label = "—"
        sms_balance_caption = "Add SMS API key in system settings"
    elif sms_balance_display is not None:
        sms_balance_label = sms_balance_display
        sms_balance_caption = "Samaya SMS (samayasms.com.np)"
    else:
        sms_balance_label = "—"
        resp = sms_info.get("response") or {}
        detail = resp.get("detail") if isinstance(resp, dict) else None
        sms_balance_caption = str(detail) if detail else "Unable to load balance"

    return Response({
        'stats': {
            'total_users': total_users,
            'total_revenue': revenue_total,
            'active_packages': active_packages,
            'total_orders': total_orders,
        },
        'revenue': {
            'today': revenue_today,
            'yesterday': revenue_yesterday,
            'today_vs_yesterday_pct': _pct_change(revenue_today, revenue_yesterday),
            'week': revenue_week,
            'prev_week': revenue_prev_week,
            'week_pct': _pct_change(revenue_week, revenue_prev_week),
            'month': revenue_month,
            'prev_month': revenue_prev_month,
            'month_pct': _pct_change(revenue_month, revenue_prev_month),
            'total': revenue_total,
        },
        'users': {
            'total': total_users,
            'today': users_today,
            'yesterday': users_yesterday,
            'today_vs_yesterday_pct': _pct_change(users_today, users_yesterday),
            'week': users_week,
            'prev_week': users_prev_week,
            'week_pct': _pct_change(users_week, users_prev_week),
            'month': users_month,
            'prev_month': users_prev_month,
            'month_pct': _pct_change(users_month, users_prev_month),
            'active_packages': active_packages,
        },
        'pending_actions': {
            'payout_accounts': pending_payout_accounts,
            'deposits': pending_deposits,
            'deposit_amount': pending_deposit_amount,
            'withdrawals': pending_withdrawals,
            'withdrawal_amount': pending_withdrawal_amount,
            'kyc': pending_kyc,
            'submissions': pending_submissions,
            'sales': pending_sales,
        },
        'sales_pipeline': sales_pipeline,
        'campaigns': {
            'total': total_campaigns,
            'active': active_campaigns,
            'total_submissions': total_submissions,
            'approved_submissions': approved_submissions,
            'approval_rate': submission_approval_rate,
        },
        'wallet_economy': {
            'total': total_system_wallet,
            'earning': total_earning_wallet,
            'topup': total_topup_wallet,
            'pending_deposits': pending_deposit_amount,
            'pending_withdrawals': pending_withdrawal_amount,
            'approved_deposits': approved_deposits_total,
            'approved_withdrawals': approved_withdrawals_total,
        },
        'super_settings': {
            'balance': system_balance,
            'sms_balance': sms_balance,
            'sms_balance_label': sms_balance_label,
            'sms_balance_caption': sms_balance_caption,
            'sms_total': sms_total,
            'sms_success': sms_success,
            'sms_failed': sms_failed,
        },
        'package_distribution': package_dist,
        'top_earners': top_earners,
        'revenue_chart': revenue_chart,
        'users_chart': users_chart,
        'recent_transactions': recent_transactions,
    })
