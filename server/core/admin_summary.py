"""Aggregates for admin list responses when include_summary=1 is passed."""
from django.db.models import Count, Sum, Value, Q
from django.db.models.functions import Coalesce
from django.db.models.fields import DecimalField

DEC = DecimalField(max_digits=18, decimal_places=2)


def _f(v):
    return float(v or 0)


def user_list_summary(qs):
    return {
        'total': qs.count(),
        'kyc_pending': qs.filter(kyc_status='pending').count(),
        'kyc_approved': qs.filter(kyc_status='approved').count(),
        'status_active': qs.filter(status='active').count(),
        'with_package': qs.filter(package__isnull=False).count(),
    }


def payment_request_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_amount=Coalesce(Sum('amount'), Value(0), output_field=DEC),
    )
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    pending_amt = qs.filter(status='pending').aggregate(
        s=Coalesce(Sum('amount'), Value(0), output_field=DEC)
    )['s']
    return {
        'total_count': agg['total_count'],
        'total_amount': _f(agg['total_amount']),
        'by_status': by_status,
        'pending_amount': _f(pending_amt),
    }


def transaction_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_amount=Coalesce(Sum('amount'), Value(0), output_field=DEC),
    )
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    by_type = {}
    for row in qs.values('transaction_type').annotate(c=Count('id')):
        by_type[str(row['transaction_type'])] = row['c']
    by_for = {}
    for row in qs.values('transaction_for').annotate(c=Count('id')):
        key = row['transaction_for'] or ''
        by_for[str(key)] = row['c']
    return {
        'total_count': agg['total_count'],
        'total_amount': _f(agg['total_amount']),
        'by_status': by_status,
        'by_transaction_type': by_type,
        'by_transaction_for': by_for,
    }


def sales_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        revenue=Coalesce(Sum('total'), Value(0), output_field=DEC),
    )
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    paid_revenue = qs.filter(payment_status='paid').aggregate(
        s=Coalesce(Sum('total'), Value(0), output_field=DEC)
    )['s']
    return {
        'total_count': agg['total_count'],
        'revenue': _f(agg['revenue']),
        'paid_revenue': _f(paid_revenue),
        'by_status': by_status,
    }


def payout_account_summary(qs):
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    return {'total_count': qs.count(), 'by_status': by_status}


def kyc_queue_summary(qs):
    by_kyc = {}
    for row in qs.values('kyc_status').annotate(c=Count('id')):
        by_kyc[str(row['kyc_status'])] = row['c']
    return {'total_count': qs.count(), 'by_kyc_status': by_kyc}


def system_withdrawal_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_amount=Coalesce(Sum('amount'), Value(0), output_field=DEC),
    )
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    return {
        'total_count': agg['total_count'],
        'total_amount': _f(agg['total_amount']),
        'by_status': by_status,
    }


def purchase_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_value=Coalesce(Sum('total'), Value(0), output_field=DEC),
        total_subtotal=Coalesce(Sum('subtotal'), Value(0), output_field=DEC),
        total_discount=Coalesce(Sum('discount'), Value(0), output_field=DEC),
    )
    return {
        'total_count': agg['total_count'],
        'total_value': _f(agg['total_value']),
        'total_subtotal': _f(agg['total_subtotal']),
        'total_discount': _f(agg['total_discount']),
    }


def submission_summary(qs):
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    return {'total_count': qs.count(), 'by_status': by_status}


def activity_log_summary(qs):
    by_platform = {}
    for row in qs.values('platform').annotate(c=Count('id')):
        by_platform[str(row['platform'] or '')] = row['c']
    return {'total_count': qs.count(), 'by_platform': by_platform}


def category_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        active=Count('id', filter=Q(is_active=True)),
        root_count=Count('id', filter=Q(parent__isnull=True)),
    )
    return {
        'total_count': agg['total_count'],
        'active': agg['active'],
        'inactive': agg['total_count'] - agg['active'],
        'root_categories': agg['root_count'],
        'subcategories': agg['total_count'] - agg['root_count'],
    }


def product_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        active=Count('id', filter=Q(is_active=True)),
        total_selling=Coalesce(Sum('selling_price'), Value(0), output_field=DEC),
        total_purchasing=Coalesce(Sum('purchasing_price'), Value(0), output_field=DEC),
        low_stock=Count('id', filter=Q(stock__lt=10)),
    )
    return {
        'total_count': agg['total_count'],
        'active': agg['active'],
        'inactive': agg['total_count'] - agg['active'],
        'low_stock': agg['low_stock'],
        'total_selling_value': _f(agg['total_selling']),
        'total_purchasing_value': _f(agg['total_purchasing']),
    }


def campaign_summary(qs):
    by_status = {}
    for row in qs.values('status').annotate(c=Count('id')):
        by_status[str(row['status'])] = row['c']
    return {'total_count': qs.count(), 'by_status': by_status}


def package_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_amount=Coalesce(Sum('amount'), Value(0), output_field=DEC),
    )
    return {
        'total_count': agg['total_count'],
        'total_package_amount': _f(agg['total_amount']),
    }


def vendor_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_payable=Coalesce(Sum('payable'), Value(0), output_field=DEC),
        total_receivable=Coalesce(Sum('receivable'), Value(0), output_field=DEC),
    )
    return {
        'total_count': agg['total_count'],
        'total_payable': _f(agg['total_payable']),
        'total_receivable': _f(agg['total_receivable']),
        'net': _f(agg['total_receivable']) - _f(agg['total_payable']),
    }


def count_only_summary(qs):
    return {'total_count': qs.count()}


def paid_received_summary(qs):
    agg = qs.aggregate(
        total_count=Count('id'),
        total_amount=Coalesce(Sum('amount'), Value(0), output_field=DEC),
    )
    return {
        'total_count': agg['total_count'],
        'total_amount': _f(agg['total_amount']),
    }
