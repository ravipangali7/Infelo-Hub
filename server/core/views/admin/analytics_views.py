from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.db.models import (
    Sum, Count, Avg, Q, F, ExpressionWrapper, DecimalField as DjDecimalField,
    FloatField, IntegerField,
)
from django.db.models.functions import TruncDate, TruncHour, ExtractHour, ExtractWeekDay, Coalesce
from django.utils import timezone
from datetime import timedelta, date
from core.models import (
    User, Sales, SalesItem, Purchase, PurchaseItem, Transaction, PaymentRequest,
    CampaignSubmission, Campaign, Product, Vendor, ActivityLogs, Wishlist,
    PaymentRequestType, PaymentRequestStatus, KycStatus, UserStatus,
    SubmissionStatus, SalesStatus, PaymentStatus, TransactionType, TransactionFor,
    TransactionStatus, SystemWithdrawal, SystemWithdrawalStatus,
    SmsLog,
)
from core.sms_service import get_sms_balance

_DEC = DjDecimalField(max_digits=18, decimal_places=2)


def _f(v):
    return float(v or 0)


def _parse_date_range(request, default_days=30):
    """Parse date_from / date_to query params. Returns (start, end) as aware datetimes."""
    now = timezone.now()
    date_to_str = request.query_params.get("date_to")
    date_from_str = request.query_params.get("date_from")
    try:
        end = timezone.datetime.strptime(date_to_str, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=now.tzinfo
        ) if date_to_str else now
    except ValueError:
        end = now
    try:
        start = timezone.datetime.strptime(date_from_str, "%Y-%m-%d").replace(
            hour=0, minute=0, second=0, tzinfo=now.tzinfo
        ) if date_from_str else (end - timedelta(days=default_days))
    except ValueError:
        start = end - timedelta(days=default_days)
    return start, end


def _pct(current, previous):
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _daily_series(model_qs, date_field, value_expr, start, end, label="value"):
    """Build daily time-series list from start to end."""
    current = start.date()
    end_date = end.date()
    raw = {
        row["day"]: row["v"]
        for row in model_qs.filter(
            **{f"{date_field}__date__gte": current, f"{date_field}__date__lte": end_date}
        ).annotate(day=TruncDate(date_field)).values("day").annotate(v=value_expr)
    }
    result = []
    while current <= end_date:
        result.append({"date": current.strftime("%b %d"), label: _f(raw.get(current))})
        current += timedelta(days=1)
    return result


# ── OVERVIEW ──────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_overview(request):
    start, end = _parse_date_range(request)
    prev_start = start - (end - start)
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # GMV (gross merchandise value = all sales total)
    gmv = _f(Sales.objects.filter(created_at__gte=start, created_at__lte=end).aggregate(s=Sum("total"))["s"])
    gmv_prev = _f(Sales.objects.filter(created_at__gte=prev_start, created_at__lt=start).aggregate(s=Sum("total"))["s"])
    gmv_all_time = _f(Sales.objects.aggregate(s=Sum("total"))["s"])

    # Net revenue (delivered + paid orders)
    net_revenue = _f(
        Sales.objects.filter(
            created_at__gte=start, created_at__lte=end,
            status=SalesStatus.DELIVERED, payment_status=PaymentStatus.PAID,
        ).aggregate(s=Sum("total"))["s"]
    )

    # Orders
    orders = Sales.objects.filter(created_at__gte=start, created_at__lte=end).count()
    orders_prev = Sales.objects.filter(created_at__gte=prev_start, created_at__lt=start).count()

    # Users
    new_users = User.objects.filter(created_at__gte=start, created_at__lte=end).count()
    new_users_prev = User.objects.filter(created_at__gte=prev_start, created_at__lt=start).count()
    total_users = User.objects.count()
    active_users = User.objects.filter(status=UserStatus.ACTIVE).count()

    # DAU / MAU (from activity logs)
    dau = ActivityLogs.objects.filter(
        created_at__date=today_start.date(), user__isnull=False
    ).values("user_id").distinct().count()
    mau = ActivityLogs.objects.filter(
        created_at__gte=now - timedelta(days=30), user__isnull=False
    ).values("user_id").distinct().count()

    # System wallet balance (sum of all user wallets)
    wallet_agg = User.objects.aggregate(earning=Sum("earning_wallet"), topup=Sum("topup_wallet"))
    system_balance = _f(wallet_agg["earning"]) + _f(wallet_agg["topup"])

    # Platform growth rate (user growth)
    growth_rate = _pct(new_users, new_users_prev)

    # Revenue daily chart
    revenue_chart = _daily_series(
        Sales.objects, "created_at", Sum("total"), start, end, "revenue"
    )

    # Orders daily chart
    orders_chart = _daily_series(
        Sales.objects, "created_at", Count("id"), start, end, "orders"
    )

    # Users daily chart
    users_chart = _daily_series(
        User.objects, "created_at", Count("id"), start, end, "users"
    )

    # Deposits vs Withdrawals (approved)
    deposits_total = _f(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.DEPOSIT, status=PaymentRequestStatus.APPROVED,
            created_at__gte=start, created_at__lte=end,
        ).aggregate(s=Sum("amount"))["s"]
    )
    withdrawals_total = _f(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.APPROVED,
            created_at__gte=start, created_at__lte=end,
        ).aggregate(s=Sum("amount"))["s"]
    )

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "gmv": {"value": gmv, "prev": gmv_prev, "pct": _pct(gmv, gmv_prev), "all_time": gmv_all_time},
        "net_revenue": net_revenue,
        "orders": {"value": orders, "prev": orders_prev, "pct": _pct(orders, orders_prev)},
        "new_users": {"value": new_users, "prev": new_users_prev, "pct": _pct(new_users, new_users_prev)},
        "total_users": total_users,
        "active_users": active_users,
        "dau": dau,
        "mau": mau,
        "system_balance": system_balance,
        "growth_rate": growth_rate,
        "deposits_total": deposits_total,
        "withdrawals_total": withdrawals_total,
        "revenue_chart": revenue_chart,
        "orders_chart": orders_chart,
        "users_chart": users_chart,
    })


# ── USERS ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_users(request):
    start, end = _parse_date_range(request)
    prev_start = start - (end - start)

    total = User.objects.count()
    new_in_period = User.objects.filter(created_at__gte=start, created_at__lte=end).count()
    new_prev = User.objects.filter(created_at__gte=prev_start, created_at__lt=start).count()

    # KYC funnel
    kyc_pending = User.objects.filter(kyc_status=KycStatus.PENDING).exclude(kyc_document_front="").count()
    kyc_approved = User.objects.filter(kyc_status=KycStatus.APPROVED).count()
    kyc_rejected = User.objects.filter(kyc_status=KycStatus.REJECTED).count()
    kyc_total = kyc_pending + kyc_approved + kyc_rejected
    kyc_approval_rate = round((kyc_approved / kyc_total * 100) if kyc_total > 0 else 0, 1)

    # Status distribution
    status_dist = list(User.objects.values("status").annotate(count=Count("id")))

    # Users with/without packages
    with_package = User.objects.filter(package__isnull=False).count()
    without_package = total - with_package

    # Wallet freeze
    wallet_frozen = User.objects.filter(is_wallet_freeze=True).count()

    # Churn: users with no orders in period who had activity before
    dormant_90 = User.objects.filter(
        created_at__lt=timezone.now() - timedelta(days=90),
    ).exclude(
        sales__created_at__gte=timezone.now() - timedelta(days=90)
    ).count()

    # Average earning wallet (LTV proxy)
    avg_earning = _f(User.objects.filter(earning_wallet__gt=0).aggregate(a=Avg("earning_wallet"))["a"])

    # New users trend
    users_chart = _daily_series(User.objects, "created_at", Count("id"), start, end, "users")

    # KYC submissions trend
    kyc_chart = _daily_series(
        User.objects.exclude(kyc_document_front=""),
        "activated_at", Count("id"), start, end, "kyc"
    )

    # Top users by earning wallet
    top_users = list(
        User.objects.filter(earning_wallet__gt=0)
        .order_by("-earning_wallet")
        .values("id", "name", "phone", "earning_wallet", "topup_wallet", "kyc_status", "status")[:10]
    )
    for u in top_users:
        u["earning_wallet"] = _f(u["earning_wallet"])
        u["topup_wallet"] = _f(u["topup_wallet"])

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total": total,
        "new_in_period": {"value": new_in_period, "prev": new_prev, "pct": _pct(new_in_period, new_prev)},
        "kyc": {
            "pending": kyc_pending,
            "approved": kyc_approved,
            "rejected": kyc_rejected,
            "approval_rate": kyc_approval_rate,
        },
        "status_distribution": status_dist,
        "with_package": with_package,
        "without_package": without_package,
        "wallet_frozen": wallet_frozen,
        "dormant_90_days": dormant_90,
        "avg_earning_wallet": avg_earning,
        "users_chart": users_chart,
        "kyc_chart": kyc_chart,
        "top_users": top_users,
    })


# ── SALES & ORDERS ────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_sales(request):
    start, end = _parse_date_range(request)
    prev_start = start - (end - start)

    qs = Sales.objects.filter(created_at__gte=start, created_at__lte=end)
    qs_prev = Sales.objects.filter(created_at__gte=prev_start, created_at__lt=start)

    total_orders = qs.count()
    total_orders_prev = qs_prev.count()
    total_revenue = _f(qs.aggregate(s=Sum("total"))["s"])
    total_revenue_prev = _f(qs_prev.aggregate(s=Sum("total"))["s"])

    # AOV
    aov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0
    aov_prev = _f(qs_prev.aggregate(s=Avg("total"))["s"])

    # Status funnel
    status_funnel = {
        row["status"]: {"count": row["cnt"], "amount": _f(row["amt"])}
        for row in qs.values("status").annotate(cnt=Count("id"), amt=Sum("total"))
    }

    # Payment method split
    payment_split = list(qs.values("payment_method").annotate(count=Count("id"), amount=Sum("total")))
    for row in payment_split:
        row["amount"] = _f(row["amount"])

    # Cancellation & rejection rates
    cancelled = status_funnel.get("cancelled", {}).get("count", 0)
    rejected = status_funnel.get("rejected", {}).get("count", 0)
    cancellation_rate = round((cancelled / total_orders * 100) if total_orders > 0 else 0, 1)
    rejection_rate = round((rejected / total_orders * 100) if total_orders > 0 else 0, 1)

    # Delivery success rate
    delivered = status_funnel.get("delivered", {}).get("count", 0)
    delivery_rate = round((delivered / total_orders * 100) if total_orders > 0 else 0, 1)

    # Shipping revenue
    shipping_revenue = _f(qs.aggregate(s=Sum("shipping_charge"))["s"])
    discount_given = _f(qs.aggregate(s=Sum("discount"))["s"])

    # Peak order hours
    peak_hours = list(
        qs.annotate(hour=ExtractHour("created_at"))
        .values("hour")
        .annotate(count=Count("id"))
        .order_by("hour")
    )

    # Peak order weekdays (0=Sunday in Django's ExtractWeekDay)
    peak_days = list(
        qs.annotate(weekday=ExtractWeekDay("created_at"))
        .values("weekday")
        .annotate(count=Count("id"))
        .order_by("weekday")
    )
    day_names = {1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat"}
    for row in peak_days:
        row["day_name"] = day_names.get(row["weekday"], str(row["weekday"]))

    # Revenue & orders daily chart
    revenue_chart = _daily_series(qs, "created_at", Sum("total"), start, end, "revenue")

    # Top products by revenue
    top_products = list(
        SalesItem.objects.filter(sales__created_at__gte=start, sales__created_at__lte=end)
        .values("product_id", "product__name")
        .annotate(qty=Sum("quantity"), revenue=Sum("total"))
        .order_by("-revenue")[:10]
    )
    for row in top_products:
        row["revenue"] = _f(row["revenue"])

    # Repeat purchase rate: users who placed >1 order
    user_order_counts = (
        qs.values("user_id").annotate(cnt=Count("id")).filter(cnt__gt=1).count()
    )
    unique_users = qs.values("user_id").distinct().count()
    repeat_rate = round((user_order_counts / unique_users * 100) if unique_users > 0 else 0, 1)

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_orders": {"value": total_orders, "prev": total_orders_prev, "pct": _pct(total_orders, total_orders_prev)},
        "total_revenue": {"value": total_revenue, "prev": total_revenue_prev, "pct": _pct(total_revenue, total_revenue_prev)},
        "aov": {"value": aov, "prev": aov_prev},
        "cancellation_rate": cancellation_rate,
        "rejection_rate": rejection_rate,
        "delivery_rate": delivery_rate,
        "repeat_rate": repeat_rate,
        "shipping_revenue": shipping_revenue,
        "discount_given": discount_given,
        "status_funnel": status_funnel,
        "payment_split": payment_split,
        "peak_hours": peak_hours,
        "peak_days": peak_days,
        "revenue_chart": revenue_chart,
        "top_products": top_products,
    })


# ── PRODUCTS & INVENTORY ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_products(request):
    from core.models import Product, ProductCategory

    start, end = _parse_date_range(request)

    total_products = Product.objects.count()
    active_products = Product.objects.filter(is_active=True).count()
    out_of_stock = Product.objects.filter(stock=0).count()
    low_stock = Product.objects.filter(stock__gt=0, stock__lt=10).count()

    # Margin analysis
    products_with_margin = list(
        Product.objects.filter(is_active=True, selling_price__gt=0)
        .annotate(
            margin=ExpressionWrapper(
                (F("selling_price") - F("purchasing_price")) / F("selling_price") * 100,
                output_field=FloatField(),
            )
        )
        .order_by("-margin")
        .values("id", "name", "sku", "selling_price", "purchasing_price", "stock", "margin")[:20]
    )
    for row in products_with_margin:
        row["selling_price"] = _f(row["selling_price"])
        row["purchasing_price"] = _f(row["purchasing_price"])
        row["margin"] = round(_f(row["margin"]), 1)

    # Wishlist vs purchase conversion
    wishlist_products = list(
        Wishlist.objects.values("product_id", "product__name")
        .annotate(wishlist_count=Count("id"))
        .order_by("-wishlist_count")[:10]
    )
    for row in wishlist_products:
        bought = SalesItem.objects.filter(product_id=row["product_id"]).count()
        row["purchased_count"] = bought
        row["conversion_rate"] = round((bought / row["wishlist_count"] * 100) if row["wishlist_count"] > 0 else 0, 1)

    # Never purchased
    never_purchased = Product.objects.filter(is_active=True).exclude(
        sales_items__isnull=False
    ).count()

    # Top selling products by revenue in period
    top_by_revenue = list(
        SalesItem.objects.filter(sales__created_at__gte=start, sales__created_at__lte=end)
        .values("product_id", "product__name")
        .annotate(units=Sum("quantity"), revenue=Sum("total"))
        .order_by("-revenue")[:10]
    )
    for row in top_by_revenue:
        row["revenue"] = _f(row["revenue"])

    # Affiliation-enabled products performance
    aff_performance = list(
        SalesItem.objects.filter(
            product__is_affiliation=True,
            sales__created_at__gte=start, sales__created_at__lte=end,
        )
        .values("product_id", "product__name", "product__affiliation_reward", "product__affiliation_reward_type")
        .annotate(sales_count=Count("id"), revenue=Sum("total"))
        .order_by("-revenue")[:10]
    )
    for row in aff_performance:
        row["revenue"] = _f(row["revenue"])
        row["product__affiliation_reward"] = _f(row["product__affiliation_reward"])

    # Cashback (buy & earn) products performance
    cashback_performance = list(
        SalesItem.objects.filter(
            product__is_purchase_reward=True,
            sales__created_at__gte=start, sales__created_at__lte=end,
        )
        .values("product_id", "product__name", "product__purchase_reward", "product__purchase_reward_type")
        .annotate(sales_count=Count("id"), revenue=Sum("total"))
        .order_by("-revenue")[:10]
    )
    for row in cashback_performance:
        row["revenue"] = _f(row["revenue"])
        row["product__purchase_reward"] = _f(row["product__purchase_reward"])

    # Category distribution
    category_dist = list(
        Product.objects.filter(is_active=True)
        .values("category__name")
        .annotate(count=Count("id"))
        .order_by("-count")[:15]
    )

    # Stock distribution buckets
    stock_buckets = {
        "out_of_stock": out_of_stock,
        "low_stock_1_9": low_stock,
        "medium_10_50": Product.objects.filter(stock__gte=10, stock__lt=50).count(),
        "healthy_50_plus": Product.objects.filter(stock__gte=50).count(),
    }

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_products": total_products,
        "active_products": active_products,
        "inactive_products": total_products - active_products,
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
        "never_purchased": never_purchased,
        "stock_buckets": stock_buckets,
        "products_with_margin": products_with_margin,
        "wishlist_conversion": wishlist_products,
        "top_by_revenue": top_by_revenue,
        "affiliation_performance": aff_performance,
        "cashback_performance": cashback_performance,
        "category_distribution": category_dist,
    })


# ── VENDORS ───────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_vendors(request):
    start, end = _parse_date_range(request)

    total_vendors = Vendor.objects.count()
    total_payable = _f(Vendor.objects.aggregate(s=Sum("payable"))["s"])
    total_receivable = _f(Vendor.objects.aggregate(s=Sum("receivable"))["s"])
    net = total_receivable - total_payable

    # Revenue per vendor in period
    vendor_revenue = list(
        SalesItem.objects.filter(sales__created_at__gte=start, sales__created_at__lte=end)
        .values("sales__vendor_id", "sales__vendor__name")
        .annotate(revenue=Sum("total"), orders=Count("sales_id", distinct=True))
        .order_by("-revenue")[:15]
    )
    for row in vendor_revenue:
        row["revenue"] = _f(row["revenue"])

    # Vendor product count
    vendor_products = list(
        Vendor.objects.annotate(product_count=Count("products"))
        .values("id", "name", "payable", "receivable", "product_count")
        .order_by("-product_count")[:15]
    )
    for row in vendor_products:
        row["payable"] = _f(row["payable"])
        row["receivable"] = _f(row["receivable"])

    # Procurement summary per vendor
    procurement_by_vendor = list(
        PurchaseItem.objects.filter(purchase__created_at__gte=start, purchase__created_at__lte=end)
        .values("purchase__vendor_id", "purchase__vendor__name")
        .annotate(total_cost=Sum("total"), qty=Sum("quantity"))
        .order_by("-total_cost")[:10]
    )
    for row in procurement_by_vendor:
        row["total_cost"] = _f(row["total_cost"])

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_vendors": total_vendors,
        "total_payable": total_payable,
        "total_receivable": total_receivable,
        "net_vendor_balance": net,
        "vendor_revenue": vendor_revenue,
        "vendor_products": vendor_products,
        "procurement_by_vendor": procurement_by_vendor,
    })


# ── PROCUREMENT ───────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_procurement(request):
    start, end = _parse_date_range(request)

    qs = Purchase.objects.filter(created_at__gte=start, created_at__lte=end)

    total_purchases = qs.count()
    total_cost = _f(qs.aggregate(s=Sum("total"))["s"])

    # Gross profit: sales revenue - purchase cost
    sales_revenue = _f(
        Sales.objects.filter(created_at__gte=start, created_at__lte=end).aggregate(s=Sum("total"))["s"]
    )
    gross_profit = sales_revenue - total_cost
    gross_margin_pct = round((gross_profit / sales_revenue * 100) if sales_revenue > 0 else 0, 1)

    # Payment status split
    payment_status_split = list(qs.values("payment_status").annotate(count=Count("id"), amount=Sum("total")))
    for row in payment_status_split:
        row["amount"] = _f(row["amount"])

    # Most purchased products
    top_purchased = list(
        PurchaseItem.objects.filter(purchase__created_at__gte=start, purchase__created_at__lte=end)
        .values("product_id", "product__name")
        .annotate(qty=Sum("quantity"), cost=Sum("total"))
        .order_by("-qty")[:10]
    )
    for row in top_purchased:
        row["cost"] = _f(row["cost"])

    # Daily procurement cost
    cost_chart = _daily_series(qs, "created_at", Sum("total"), start, end, "cost")

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_purchases": total_purchases,
        "total_cost": total_cost,
        "sales_revenue": sales_revenue,
        "gross_profit": gross_profit,
        "gross_margin_pct": gross_margin_pct,
        "payment_status_split": payment_status_split,
        "top_purchased_products": top_purchased,
        "cost_chart": cost_chart,
    })


# ── AFFILIATES ────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_affiliates(request):
    start, end = _parse_date_range(request)

    aff_items = SalesItem.objects.filter(
        referred_by__isnull=False,
        sales__created_at__gte=start, sales__created_at__lte=end,
    )

    total_aff_sales = aff_items.count()
    total_aff_revenue = _f(aff_items.aggregate(s=Sum("total"))["s"])
    total_aff_commissions = _f(aff_items.aggregate(s=Sum("reward"))["s"])

    total_sales_revenue = _f(
        Sales.objects.filter(created_at__gte=start, created_at__lte=end).aggregate(s=Sum("total"))["s"]
    )
    revenue_contribution_pct = round(
        (total_aff_revenue / total_sales_revenue * 100) if total_sales_revenue > 0 else 0, 1
    )

    # Total affiliation-enabled products
    aff_products_count = Product.objects.filter(is_affiliation=True).count()

    # Top affiliate earners
    top_affiliates = list(
        aff_items
        .values("referred_by_id", "referred_by__name", "referred_by__phone")
        .annotate(sales_count=Count("id"), earned=Sum("reward"), revenue=Sum("total"))
        .order_by("-earned")[:10]
    )
    for row in top_affiliates:
        row["earned"] = _f(row["earned"])
        row["revenue"] = _f(row["revenue"])

    # Top affiliated products by commission paid
    top_aff_products = list(
        aff_items
        .values("product_id", "product__name")
        .annotate(sales_count=Count("id"), commissions=Sum("reward"), revenue=Sum("total"))
        .order_by("-commissions")[:10]
    )
    for row in top_aff_products:
        row["commissions"] = _f(row["commissions"])
        row["revenue"] = _f(row["revenue"])

    # Daily affiliate trend
    aff_chart = _daily_series(
        aff_items.filter(referred_by__isnull=False),
        "sales__created_at", Count("id"), start, end, "sales"
    )

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_aff_sales": total_aff_sales,
        "total_aff_revenue": total_aff_revenue,
        "total_aff_commissions": total_aff_commissions,
        "revenue_contribution_pct": revenue_contribution_pct,
        "aff_products_count": aff_products_count,
        "top_affiliates": top_affiliates,
        "top_aff_products": top_aff_products,
        "aff_chart": aff_chart,
    })


# ── CAMPAIGNS ─────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_campaigns(request):
    start, end = _parse_date_range(request)

    total_campaigns = Campaign.objects.count()
    by_status = {
        row["status"]: row["count"]
        for row in Campaign.objects.values("status").annotate(count=Count("id"))
    }

    # Submissions in period
    subs_qs = CampaignSubmission.objects.filter(created_at__gte=start, created_at__lte=end)
    total_submissions = subs_qs.count()
    approved = subs_qs.filter(status=SubmissionStatus.APPROVED).count()
    rejected = subs_qs.filter(status=SubmissionStatus.REJECTED).count()
    pending = subs_qs.filter(status=SubmissionStatus.PENDING).count()
    approval_rate = round((approved / total_submissions * 100) if total_submissions > 0 else 0, 1)

    # Total rewards paid (from transactions)
    total_rewards_paid = _f(
        Transaction.objects.filter(
            transaction_for=TransactionFor.TASK_REWARD,
            status=TransactionStatus.SUCCESS,
            created_at__gte=start, created_at__lte=end,
        ).aggregate(s=Sum("amount"))["s"]
    )

    # Top campaigns by participation
    top_campaigns = list(
        CampaignSubmission.objects.filter(created_at__gte=start, created_at__lte=end)
        .values("campaign_id", "campaign__name", "campaign__commission", "campaign__commission_type")
        .annotate(
            total_subs=Count("id"),
            approved_subs=Count("id", filter=Q(status=SubmissionStatus.APPROVED)),
        )
        .order_by("-total_subs")[:10]
    )
    for row in top_campaigns:
        row["campaign__commission"] = _f(row["campaign__commission"])
        row["approval_rate"] = round(
            (row["approved_subs"] / row["total_subs"] * 100) if row["total_subs"] > 0 else 0, 1
        )

    # Rejection reasons (truncated for chart)
    rejection_reasons = list(
        CampaignSubmission.objects.filter(
            status=SubmissionStatus.REJECTED,
            created_at__gte=start, created_at__lte=end,
        )
        .exclude(reject_reason="")
        .values("reject_reason")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # Daily submissions trend
    subs_chart = _daily_series(subs_qs, "created_at", Count("id"), start, end, "submissions")

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_campaigns": total_campaigns,
        "campaigns_by_status": by_status,
        "total_submissions": total_submissions,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "approval_rate": approval_rate,
        "total_rewards_paid": total_rewards_paid,
        "top_campaigns": top_campaigns,
        "rejection_reasons": rejection_reasons,
        "subs_chart": subs_chart,
    })


# ── FINANCE ───────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_finance(request):
    start, end = _parse_date_range(request)
    prev_start = start - (end - start)

    # Wallet economy
    wallet_agg = User.objects.aggregate(
        earning=Coalesce(Sum("earning_wallet"), 0, output_field=DjDecimalField()),
        topup=Coalesce(Sum("topup_wallet"), 0, output_field=DjDecimalField()),
    )
    total_earning = _f(wallet_agg["earning"])
    total_topup = _f(wallet_agg["topup"])
    total_wallets = total_earning + total_topup

    # Deposits & Withdrawals in period
    deposits_qs = PaymentRequest.objects.filter(
        type=PaymentRequestType.DEPOSIT, created_at__gte=start, created_at__lte=end
    )
    withdrawals_qs = PaymentRequest.objects.filter(
        type=PaymentRequestType.WITHDRAW, created_at__gte=start, created_at__lte=end
    )

    dep_approved = _f(deposits_qs.filter(status=PaymentRequestStatus.APPROVED).aggregate(s=Sum("amount"))["s"])
    dep_pending = _f(deposits_qs.filter(status=PaymentRequestStatus.PENDING).aggregate(s=Sum("amount"))["s"])
    dep_rejected = _f(deposits_qs.filter(status=PaymentRequestStatus.REJECTED).aggregate(s=Sum("amount"))["s"])

    wdr_approved = _f(withdrawals_qs.filter(status=PaymentRequestStatus.APPROVED).aggregate(s=Sum("amount"))["s"])
    wdr_pending = _f(withdrawals_qs.filter(status=PaymentRequestStatus.PENDING).aggregate(s=Sum("amount"))["s"])
    wdr_rejected = _f(withdrawals_qs.filter(status=PaymentRequestStatus.REJECTED).aggregate(s=Sum("amount"))["s"])

    # Deposits by payment method
    dep_by_method = list(
        deposits_qs.filter(status=PaymentRequestStatus.APPROVED)
        .values("payment_method")
        .annotate(count=Count("id"), amount=Sum("amount"))
    )
    for row in dep_by_method:
        row["amount"] = _f(row["amount"])

    wdr_by_method = list(
        withdrawals_qs.filter(status=PaymentRequestStatus.APPROVED)
        .values("payment_method")
        .annotate(count=Count("id"), amount=Sum("amount"))
    )
    for row in wdr_by_method:
        row["amount"] = _f(row["amount"])

    # Admin fee collected
    from core.models import SystemSetting
    try:
        settings_obj = SystemSetting.objects.first()
        fee_type = settings_obj.withdrawal_admin_fee_type if settings_obj else ""
        fee_rate = _f(settings_obj.withdrawal_admin_fee if settings_obj else 0)
    except Exception:
        fee_type = ""
        fee_rate = 0

    # P&L statement
    sales_revenue = _f(
        Sales.objects.filter(created_at__gte=start, created_at__lte=end).aggregate(s=Sum("total"))["s"]
    )
    purchase_cost = _f(
        Purchase.objects.filter(created_at__gte=start, created_at__lte=end).aggregate(s=Sum("total"))["s"]
    )
    aff_commissions = _f(
        SalesItem.objects.filter(
            sales__created_at__gte=start, sales__created_at__lte=end,
            reward__isnull=False,
        ).aggregate(s=Sum("reward"))["s"]
    )
    campaign_rewards = _f(
        Transaction.objects.filter(
            transaction_for=TransactionFor.TASK_REWARD,
            status=TransactionStatus.SUCCESS,
            created_at__gte=start, created_at__lte=end,
        ).aggregate(s=Sum("amount"))["s"]
    )
    total_expenses = purchase_cost + aff_commissions + campaign_rewards
    gross_profit = sales_revenue - purchase_cost
    net_profit = sales_revenue - total_expenses

    # Cash flow
    system_withdrawals = _f(
        SystemWithdrawal.objects.filter(
            status=SystemWithdrawalStatus.APPROVED,
            created_at__gte=start, created_at__lte=end,
        ).aggregate(s=Sum("amount"))["s"]
    )

    # Liabilities (total user wallets outstanding)
    liability = total_wallets

    # Daily deposit/withdrawal chart
    dep_chart = _daily_series(
        deposits_qs.filter(status=PaymentRequestStatus.APPROVED),
        "created_at", Sum("amount"), start, end, "deposits"
    )
    wdr_chart = _daily_series(
        withdrawals_qs.filter(status=PaymentRequestStatus.APPROVED),
        "created_at", Sum("amount"), start, end, "withdrawals"
    )

    # Transaction breakdown by category
    tx_by_for = list(
        Transaction.objects.filter(created_at__gte=start, created_at__lte=end)
        .values("transaction_for")
        .annotate(count=Count("id"), amount=Sum("amount"))
    )
    for row in tx_by_for:
        row["amount"] = _f(row["amount"])

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "wallet_economy": {
            "earning": total_earning,
            "topup": total_topup,
            "total": total_wallets,
            "liability": liability,
        },
        "deposits": {
            "approved": dep_approved,
            "pending": dep_pending,
            "rejected": dep_rejected,
            "by_method": dep_by_method,
        },
        "withdrawals": {
            "approved": wdr_approved,
            "pending": wdr_pending,
            "rejected": wdr_rejected,
            "by_method": wdr_by_method,
        },
        "admin_fee": {"type": fee_type, "rate": fee_rate},
        "pnl": {
            "sales_revenue": sales_revenue,
            "purchase_cost": purchase_cost,
            "affiliation_commissions": aff_commissions,
            "campaign_rewards": campaign_rewards,
            "total_expenses": total_expenses,
            "gross_profit": gross_profit,
            "net_profit": net_profit,
        },
        "cash_flow": {
            "cash_in": dep_approved,
            "cash_out": wdr_approved + system_withdrawals,
            "system_withdrawals": system_withdrawals,
            "net": dep_approved - (wdr_approved + system_withdrawals),
        },
        "dep_chart": dep_chart,
        "wdr_chart": wdr_chart,
        "tx_by_category": tx_by_for,
    })


# ── BEHAVIOUR ─────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_behaviour(request):
    start, end = _parse_date_range(request)

    qs = ActivityLogs.objects.filter(created_at__gte=start, created_at__lte=end)

    total_sessions = qs.values("session_id").distinct().count()
    total_events = qs.count()
    guest_sessions = qs.filter(is_guest=True).values("session_id").distinct().count()
    auth_sessions = qs.filter(is_guest=False).values("session_id").distinct().count()

    # Average session duration (seconds)
    avg_duration = _f(
        qs.filter(session_duration__isnull=False).aggregate(a=Avg("session_duration"))["a"]
    )

    # Device type
    device_dist = list(qs.values("device_type").annotate(count=Count("id")).order_by("-count"))

    # OS
    os_dist = list(qs.values("os_name").annotate(count=Count("id")).order_by("-count")[:10])

    # Browser
    browser_dist = list(qs.values("browser_name").annotate(count=Count("id")).order_by("-count")[:10])

    # Top pages
    top_pages = list(
        qs.exclude(page_path="")
        .values("page_path", "page_title")
        .annotate(count=Count("id"), avg_time=Avg("time_on_page"), avg_scroll=Avg("scroll_depth"))
        .order_by("-count")[:15]
    )
    for row in top_pages:
        row["avg_time"] = round(_f(row["avg_time"]), 1)
        row["avg_scroll"] = round(_f(row["avg_scroll"]), 1)

    # Top events
    top_events = list(
        qs.exclude(event_name="")
        .values("event_name")
        .annotate(count=Count("id"))
        .order_by("-count")[:15]
    )

    # Referrer sources
    top_referrers = list(
        qs.exclude(referrer_url="")
        .values("referrer_url")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # Peak traffic hours
    peak_hours = list(
        qs.annotate(hour=ExtractHour("created_at"))
        .values("hour")
        .annotate(count=Count("id"))
        .order_by("hour")
    )

    # Daily sessions chart
    sessions_chart = []
    current = start.date()
    end_date = end.date()
    while current <= end_date:
        count = qs.filter(created_at__date=current).values("session_id").distinct().count()
        sessions_chart.append({"date": current.strftime("%b %d"), "sessions": count})
        current += timedelta(days=1)

    # Country distribution
    country_dist = list(
        qs.exclude(country="")
        .values("country")
        .annotate(count=Count("id"))
        .order_by("-count")[:15]
    )

    # Platform split
    platform_dist = list(qs.values("platform").annotate(count=Count("id")).order_by("-count"))

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_sessions": total_sessions,
        "total_events": total_events,
        "guest_sessions": guest_sessions,
        "auth_sessions": auth_sessions,
        "avg_session_duration_sec": round(avg_duration, 1),
        "device_distribution": device_dist,
        "os_distribution": os_dist,
        "browser_distribution": browser_dist,
        "top_pages": top_pages,
        "top_events": top_events,
        "top_referrers": top_referrers,
        "peak_hours": peak_hours,
        "sessions_chart": sessions_chart,
        "country_distribution": country_dist,
        "platform_distribution": platform_dist,
    })


# ── RETENTION & ENGAGEMENT ────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_retention(request):
    start, end = _parse_date_range(request)
    now = timezone.now()

    # DAU trend last 30 days
    dau_chart = []
    for i in range(29, -1, -1):
        day = (now - timedelta(days=i)).date()
        count = ActivityLogs.objects.filter(
            created_at__date=day, user__isnull=False
        ).values("user_id").distinct().count()
        dau_chart.append({"date": day.strftime("%b %d"), "dau": count})

    # MAU
    mau = ActivityLogs.objects.filter(
        created_at__gte=now - timedelta(days=30), user__isnull=False
    ).values("user_id").distinct().count()

    # Dormant users by bucket
    dormant_30 = User.objects.filter(
        created_at__lt=now - timedelta(days=30)
    ).exclude(
        activity_logs__created_at__gte=now - timedelta(days=30)
    ).count()

    dormant_60 = User.objects.filter(
        created_at__lt=now - timedelta(days=60)
    ).exclude(
        activity_logs__created_at__gte=now - timedelta(days=60)
    ).count()

    dormant_90 = User.objects.filter(
        created_at__lt=now - timedelta(days=90)
    ).exclude(
        activity_logs__created_at__gte=now - timedelta(days=90)
    ).count()

    # Repeat purchasers
    repeat_buyers = User.objects.annotate(
        order_count=Count("sales", filter=Q(sales__created_at__gte=start, sales__created_at__lte=end))
    ).filter(order_count__gt=1).count()

    # High value customers (top 10 by total spend)
    high_value = list(
        Sales.objects.filter(status=SalesStatus.DELIVERED)
        .values("user_id", "user__name", "user__phone")
        .annotate(total_spent=Sum("total"), order_count=Count("id"))
        .order_by("-total_spent")[:10]
    )
    for row in high_value:
        row["total_spent"] = _f(row["total_spent"])

    # Feature usage: which features users engage with most
    feature_usage = list(
        ActivityLogs.objects.filter(
            created_at__gte=start, created_at__lte=end
        )
        .exclude(page_path="")
        .values("page_path")
        .annotate(sessions=Count("session_id", distinct=True))
        .order_by("-sessions")[:10]
    )

    # Deposit frequency
    avg_deposits_per_user = _f(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.DEPOSIT,
            status=PaymentRequestStatus.APPROVED,
            created_at__gte=start, created_at__lte=end,
        ).values("user_id").annotate(c=Count("id")).aggregate(a=Avg("c"))["a"]
    )

    # Purchase frequency
    avg_orders_per_user = _f(
        Sales.objects.filter(created_at__gte=start, created_at__lte=end)
        .values("user_id")
        .annotate(c=Count("id"))
        .aggregate(a=Avg("c"))["a"]
    )

    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "mau": mau,
        "dau_chart": dau_chart,
        "dormant": {"30_days": dormant_30, "60_days": dormant_60, "90_days": dormant_90},
        "repeat_buyers": repeat_buyers,
        "high_value_customers": high_value,
        "feature_usage": feature_usage,
        "avg_deposits_per_user": round(avg_deposits_per_user, 2),
        "avg_orders_per_user": round(avg_orders_per_user, 2),
    })


# ── INTELLIGENCE (Forecasting, History, Risk, Audit) ──────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_intelligence(request):
    now = timezone.now()
    today = now.date()

    # ── 90-day Revenue Forecast (simple linear extrapolation) ──
    # Use last 30 days of daily revenue as basis
    history_days = 30
    daily_rev = []
    for i in range(history_days - 1, -1, -1):
        day = today - timedelta(days=i)
        rev = _f(
            Sales.objects.filter(created_at__date=day).aggregate(s=Sum("total"))["s"]
        )
        daily_rev.append(rev)

    avg_daily = sum(daily_rev) / len(daily_rev) if daily_rev else 0
    # Linear trend: compute slope over last 30 days
    if len(daily_rev) >= 2:
        n = len(daily_rev)
        xs = list(range(n))
        x_mean = sum(xs) / n
        y_mean = sum(daily_rev) / n
        num = sum((xs[i] - x_mean) * (daily_rev[i] - y_mean) for i in range(n))
        den = sum((xs[i] - x_mean) ** 2 for i in range(n))
        slope = num / den if den != 0 else 0
    else:
        slope = 0

    forecast_chart = []
    for i in range(1, 91):
        predicted = max(0, avg_daily + slope * i)
        forecast_chart.append({
            "day": i,
            "date": (today + timedelta(days=i)).strftime("%b %d"),
            "forecast": round(predicted, 2),
        })

    forecast_30 = sum(r["forecast"] for r in forecast_chart[:30])
    forecast_90 = sum(r["forecast"] for r in forecast_chart)

    # ── Year-over-Year Comparison ──
    this_year = today.year
    last_year = this_year - 1
    monthly_comparison = []
    for month in range(1, 13):
        this_rev = _f(
            Sales.objects.filter(
                created_at__year=this_year, created_at__month=month
            ).aggregate(s=Sum("total"))["s"]
        )
        last_rev = _f(
            Sales.objects.filter(
                created_at__year=last_year, created_at__month=month
            ).aggregate(s=Sum("total"))["s"]
        )
        import calendar
        monthly_comparison.append({
            "month": calendar.month_abbr[month],
            "this_year": this_rev,
            "last_year": last_rev,
            "pct_change": _pct(this_rev, last_rev),
        })

    # YoY totals
    ytd_revenue = _f(
        Sales.objects.filter(created_at__year=this_year).aggregate(s=Sum("total"))["s"]
    )
    ytd_last_year = _f(
        Sales.objects.filter(created_at__year=last_year).aggregate(s=Sum("total"))["s"]
    )

    # ── Stock Depletion Forecast ──
    # For each product with stock > 0, calculate avg daily sales to estimate depletion
    stock_depletion = []
    products_at_risk = Product.objects.filter(is_active=True, stock__gt=0, stock__lt=50)
    for prod in products_at_risk[:20]:
        units_sold_30 = SalesItem.objects.filter(
            product=prod,
            sales__created_at__gte=now - timedelta(days=30),
        ).aggregate(s=Sum("quantity"))["s"] or 0
        avg_daily_sales = units_sold_30 / 30
        if avg_daily_sales > 0:
            days_left = round(prod.stock / avg_daily_sales, 0)
        else:
            days_left = None
        stock_depletion.append({
            "product_id": prod.id,
            "name": prod.name,
            "stock": prod.stock,
            "avg_daily_sales": round(avg_daily_sales, 2),
            "days_until_empty": days_left,
        })
    stock_depletion.sort(key=lambda x: (x["days_until_empty"] is None, x["days_until_empty"] or 9999))

    # ── Risk & Alert Indicators ──
    # Suspicious: users with >5 pending withdrawals
    suspicious_withdrawals = list(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.PENDING
        )
        .values("user_id", "user__name", "user__phone")
        .annotate(count=Count("id"), total_amount=Sum("amount"))
        .filter(count__gte=3)
        .order_by("-count")[:10]
    )
    for row in suspicious_withdrawals:
        row["total_amount"] = _f(row["total_amount"])

    # Failed transactions spike
    failed_tx_today = Transaction.objects.filter(
        created_at__date=today, status=TransactionStatus.FAILED
    ).count()
    failed_tx_week = Transaction.objects.filter(
        created_at__gte=now - timedelta(days=7), status=TransactionStatus.FAILED
    ).count()

    # Wallet frozen users with pending requests
    frozen_with_pending = PaymentRequest.objects.filter(
        user__is_wallet_freeze=True, status=PaymentRequestStatus.PENDING
    ).count()

    # High pending withdrawal volume
    pending_withdrawal_total = _f(
        PaymentRequest.objects.filter(
            type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.PENDING
        ).aggregate(s=Sum("amount"))["s"]
    )

    # System balance vs total user liability
    wallet_agg = User.objects.aggregate(
        earning=Coalesce(Sum("earning_wallet"), 0, output_field=DjDecimalField()),
        topup=Coalesce(Sum("topup_wallet"), 0, output_field=DjDecimalField()),
    )
    total_user_liability = _f(wallet_agg["earning"]) + _f(wallet_agg["topup"])

    # ── Audit Log (recent admin-relevant transactions) ──
    audit_log = list(
        Transaction.objects.filter(is_system=True)
        .select_related("user")
        .order_by("-created_at")[:20]
        .values(
            "id", "user_id", "user__name", "user__phone",
            "amount", "transaction_type", "transaction_for", "status",
            "remarks", "created_at",
        )
    )
    for row in audit_log:
        row["amount"] = _f(row["amount"])
        if row["created_at"]:
            row["created_at"] = row["created_at"].isoformat()

    # All-time records
    all_time = {
        "total_revenue": _f(Sales.objects.aggregate(s=Sum("total"))["s"]),
        "total_users": User.objects.count(),
        "total_orders": Sales.objects.count(),
        "total_deposits": _f(
            PaymentRequest.objects.filter(
                type=PaymentRequestType.DEPOSIT, status=PaymentRequestStatus.APPROVED
            ).aggregate(s=Sum("amount"))["s"]
        ),
        "total_withdrawals": _f(
            PaymentRequest.objects.filter(
                type=PaymentRequestType.WITHDRAW, status=PaymentRequestStatus.APPROVED
            ).aggregate(s=Sum("amount"))["s"]
        ),
    }

    return Response({
        "forecast": {
            "avg_daily_revenue": round(avg_daily, 2),
            "trend_slope": round(slope, 4),
            "forecast_30_days": round(forecast_30, 2),
            "forecast_90_days": round(forecast_90, 2),
            "chart": forecast_chart[:30],  # show 30 days in chart
        },
        "yoy_comparison": {
            "this_year": this_year,
            "last_year": last_year,
            "ytd_revenue": ytd_revenue,
            "ytd_last_year": ytd_last_year,
            "yoy_pct": _pct(ytd_revenue, ytd_last_year),
            "monthly": monthly_comparison,
        },
        "stock_depletion": stock_depletion,
        "risk_alerts": {
            "suspicious_withdrawal_users": suspicious_withdrawals,
            "failed_tx_today": failed_tx_today,
            "failed_tx_week": failed_tx_week,
            "frozen_with_pending": frozen_with_pending,
            "pending_withdrawal_total": pending_withdrawal_total,
            "total_user_liability": total_user_liability,
        },
        "audit_log": audit_log,
        "all_time_records": all_time,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def analytics_sms(request):
    start, end = _parse_date_range(request)
    qs = SmsLog.objects.filter(created_at__gte=start, created_at__lte=end)
    total = qs.count()
    success = qs.filter(status="success").count()
    failed = qs.filter(status="failed").count()
    by_purpose = list(qs.values("purpose").annotate(count=Count("id")).order_by("-count"))
    balance_data = get_sms_balance()
    return Response({
        "period": {"from": start.date().isoformat(), "to": end.date().isoformat()},
        "total_sent": total,
        "success": success,
        "failed": failed,
        "by_purpose": by_purpose,
        "balance": balance_data.get("balance"),
        "configured": balance_data.get("configured", False),
    })
