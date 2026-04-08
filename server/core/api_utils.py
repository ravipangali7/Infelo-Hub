"""Helpers for API: request-aware image URLs, error format, pagination, ordering."""
from rest_framework.response import Response
from rest_framework import status


def build_absolute_uri(request, url):
    if not url:
        return None
    return request.build_absolute_uri(url) if request else url


def error_response(detail, status_code=400, errors=None, code=None):
    body = {"detail": detail}
    if code:
        body["code"] = code
    if errors is not None:
        body["errors"] = errors
    return Response(body, status=status_code)


def policy_error_response(policy_error):
    return error_response(
        detail=policy_error.detail,
        status_code=policy_error.status_code,
        code=policy_error.code,
    )


def flatten_multipart_data(data):
    """
    Build a plain dict from DRF request.data so multipart fields are scalars (str, number, File),
    not single-element lists. Unpacking {**request.data} can leave values as ['deposit'], which
    breaks ChoiceField / DecimalField / CharField validation.
    """
    if data is None:
        return {}
    out = {}
    keys = list(data.keys()) if hasattr(data, 'keys') else []
    for key in keys:
        if hasattr(data, 'getlist'):
            lst = data.getlist(key)
            if not lst:
                continue
            out[key] = lst[-1] if len(lst) > 1 else lst[0]
        else:
            v = data.get(key)
            while isinstance(v, (list, tuple)) and len(v) == 1:
                v = v[0]
            out[key] = v
    return out


# Pagination defaults
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def filter_queryset_date_range(queryset, request, field='created_at'):
    """Filter by date_from / date_to query params (YYYY-MM-DD)."""
    from django.utils.dateparse import parse_date
    qp = getattr(request, 'query_params', request.GET)
    df = (qp.get('date_from') or '').strip()
    dt = (qp.get('date_to') or '').strip()
    if df:
        d = parse_date(df)
        if d:
            queryset = queryset.filter(**{f'{field}__date__gte': d})
    if dt:
        d = parse_date(dt)
        if d:
            queryset = queryset.filter(**{f'{field}__date__lte': d})
    return queryset


def _coerce_order_fields(order_spec):
    """Turn default_order / fallback into a tuple for order_by(*)."""
    if order_spec is None:
        return ()
    if isinstance(order_spec, (list, tuple)):
        return tuple(order_spec)
    return (order_spec,)


def paginate_queryset(queryset, request, serializer_class, context=None, allowed_order_fields=None, default_order='-created_at', summary_builder=None):
    """
    Paginate queryset and apply ordering. Returns Response with { count, next, previous, results }.
    request: DRF request (has query_params).
    serializer_class: used as serializer_class(queryset_page, many=True, context=context).
    allowed_order_fields: list of field names (use '-' prefix for desc). If None, no ordering applied.
    default_order: applied when order_by param is not given. String or tuple/list (e.g. ('order_sort', 'id')).
    """
    from django.core.paginator import Paginator

    context = dict(context or {})
    if 'request' not in context:
        context['request'] = request

    # Ordering
    order_by = (request.query_params.get('order_by') or '').strip()
    if order_by and allowed_order_fields:
        normalized = order_by.lstrip('-')
        if normalized in allowed_order_fields:
            qs = queryset.order_by(order_by)
        else:
            qs = queryset.order_by(*_coerce_order_fields(default_order)) if default_order else queryset
    else:
        qs = queryset.order_by(*_coerce_order_fields(default_order)) if default_order else queryset

    # Pagination
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('page_size', DEFAULT_PAGE_SIZE))))
    except (TypeError, ValueError):
        page_size = DEFAULT_PAGE_SIZE

    paginator = Paginator(qs, page_size)
    if page > paginator.num_pages and paginator.num_pages > 0:
        page = paginator.num_pages
    page_obj = paginator.get_page(page)
    results = serializer_class(page_obj.object_list, many=True, context=context)

    # Build next/previous URLs (DRF request has .path; fallback for raw HttpRequest)
    base_path = getattr(request, 'path', None) or (request.get_full_path().split('?')[0] if hasattr(request, 'get_full_path') else '')
    params = getattr(request, 'query_params', request.GET).copy()
    next_url = None
    if page_obj.has_next():
        params['page'] = page + 1
        next_url = base_path + '?' + params.urlencode()
    previous_url = None
    if page_obj.has_previous():
        params['page'] = page - 1
        previous_url = base_path + '?' + params.urlencode()

    body = {
        'count': paginator.count,
        'next': next_url,
        'previous': previous_url,
        'results': results.data,
    }
    qp = getattr(request, 'query_params', request.GET)
    inc = str(qp.get('include_summary', '')).lower()
    if summary_builder and inc in ('1', 'true', 'yes'):
        try:
            body['summary'] = summary_builder(qs)
        except Exception:
            body['summary'] = {}
    return Response(body)
