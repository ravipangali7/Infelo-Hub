from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q
from core.models import Product
from core.serializers import ProductSerializer
from core.api_utils import paginate_queryset, filter_queryset_date_range, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE
from core.admin_summary import product_summary

PRODUCT_ORDER_FIELDS = ['id', 'name', 'sku', 'selling_price', 'is_active', 'order_sort', 'created_at', 'updated_at']


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def product_list_create(request):
    raw_request = request._request
    if request.method == 'POST':
        return product_create(raw_request)
    return product_list(raw_request)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def product_list(request):
    qs = Product.objects.select_related('category', 'vendor').prefetch_related('images')
    vendor = request.query_params.get('vendor')
    if vendor:
        qs = qs.filter(vendor_id=vendor)
    category = request.query_params.get('category')
    if category:
        qs = qs.filter(category_id=category)
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        qs = qs.filter(is_active=is_active.lower() == 'true')
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search))
    qs = filter_queryset_date_range(qs, request, 'created_at')
    return paginate_queryset(
        qs, request, ProductSerializer, {'request': request}, PRODUCT_ORDER_FIELDS,
        default_order=('order_sort', 'id'),
        summary_builder=product_summary,
    )


def _reorder_guard_fails(request):
    """Return error detail string if reorder is not allowed for these query params."""
    qp = request.query_params
    if (qp.get('search') or '').strip():
        return 'Clear filters and sort by Order to reorder.'
    if (qp.get('category') or '').strip():
        return 'Clear filters and sort by Order to reorder.'
    if (qp.get('vendor') or '').strip():
        return 'Clear filters and sort by Order to reorder.'
    if (qp.get('is_active') or '').strip():
        return 'Clear filters and sort by Order to reorder.'
    if (qp.get('date_from') or '').strip() or (qp.get('date_to') or '').strip():
        return 'Clear filters and sort by Order to reorder.'
    ob = (qp.get('order_by') or '').strip()
    if ob == '-order_sort' or (ob and ob != 'order_sort'):
        return 'Sort by Order (ascending) to reorder rows.'
    return None


@api_view(['POST'])
@permission_classes([IsAdminUser])
def product_reorder_page(request):
    msg = _reorder_guard_fails(request)
    if msg:
        return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

    raw = request.data.get('ordered_ids')
    if not isinstance(raw, list) or not raw:
        return Response({'detail': 'ordered_ids must be a non-empty list of integers.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        ordered_ids = [int(x) for x in raw]
    except (TypeError, ValueError):
        return Response({'detail': 'ordered_ids must be a list of integers.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(MAX_PAGE_SIZE, max(1, int(request.query_params.get('page_size', DEFAULT_PAGE_SIZE))))
    except (TypeError, ValueError):
        page_size = DEFAULT_PAGE_SIZE

    full_ids = list(Product.objects.order_by('order_sort', 'id').values_list('id', flat=True))
    start = (page - 1) * page_size
    end = start + len(ordered_ids)
    if end > len(full_ids) or len(ordered_ids) == 0:
        return Response({'detail': 'Page slice does not match product list.'}, status=status.HTTP_400_BAD_REQUEST)
    segment = full_ids[start:end]
    if set(ordered_ids) != set(segment) or len(ordered_ids) != len(segment):
        return Response({'detail': 'ordered_ids must match the current page exactly.'}, status=status.HTTP_400_BAD_REQUEST)

    new_full = full_ids[:start] + ordered_ids + full_ids[end:]
    to_update = [Product(pk=pid, order_sort=i) for i, pid in enumerate(new_full)]
    with transaction.atomic():
        Product.objects.bulk_update(to_update, ['order_sort'])

    return Response({'detail': 'ok', 'count': len(new_full)})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def product_detail(request, pk):
    try:
        p = Product.objects.select_related('category', 'vendor').prefetch_related('images').get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductSerializer(p, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def product_create(request):
    serializer = ProductSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def product_update(request, pk):
    try:
        p = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductSerializer(p, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def product_delete(request, pk):
    try:
        p = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    p.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def product_detail_update_delete(request, pk):
    raw_request = request._request
    if request.method == 'GET':
        return product_detail(raw_request, pk)
    if request.method == 'PATCH':
        return product_update(raw_request, pk)
    return product_delete(raw_request, pk)
