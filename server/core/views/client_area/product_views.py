from collections import defaultdict

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from core.models import Product, ProductCategory
from core.serializers import ProductCategorySerializer, ProductSerializer


def get_descendant_ids(parent_id):
    ids = [parent_id]
    children = ProductCategory.objects.filter(
        parent_id=parent_id, is_active=True
    ).values_list('id', flat=True)
    for child_id in children:
        ids.extend(get_descendant_ids(child_id))
    return ids


@api_view(['GET'])
@permission_classes([AllowAny])
def product_list(request):
    qs = Product.objects.filter(is_active=True).select_related('category', 'vendor').prefetch_related('images').order_by('order_sort', '-created_at')
    category = (request.query_params.get('category') or '').strip()
    if category and category.isdigit():
        qs = qs.filter(category_id=category)
    category_tree = (request.query_params.get('category_tree') or '').strip()
    if category_tree and category_tree.isdigit():
        descendant_ids = get_descendant_ids(int(category_tree))
        qs = qs.filter(category_id__in=descendant_ids)
    search = (request.query_params.get('search') or '').strip()
    if search and search.lower() not in {'undefined', 'null'}:
        qs = qs.filter(name__icontains=search)
    serializer = ProductSerializer(qs, many=True, context={'request': request})
    return Response({'results': serializer.data})


def _category_children_map():
    rows = ProductCategory.objects.filter(is_active=True).values_list('id', 'parent_id')
    children = defaultdict(list)
    for cid, parent_id in rows:
        if parent_id is not None:
            children[parent_id].append(cid)
    return children


def _category_ids_for_section(parent_id, mode, children_map):
    if mode == 'direct':
        return [parent_id]
    stack = [parent_id]
    out = []
    seen = set()
    while stack:
        cid = stack.pop()
        if cid in seen:
            continue
        seen.add(cid)
        out.append(cid)
        stack.extend(children_map.get(cid, ()))
    return out


@api_view(['GET'])
@permission_classes([AllowAny])
def product_list_sections(request):
    """
    Batched home/learn sections: global featured products plus per–parent-category rows.
    One HTTP round-trip avoids N parallel client /products/ calls (MySQL connection pressure).
    """
    mode = (request.query_params.get('mode') or 'tree').strip().lower()
    if mode not in ('tree', 'direct'):
        mode = 'tree'
    try:
        per_section = int((request.query_params.get('per_section') or '8').strip())
    except ValueError:
        per_section = 8
    per_section = max(1, min(per_section, 24))
    try:
        featured_limit = int((request.query_params.get('featured_limit') or '8').strip())
    except ValueError:
        featured_limit = 8
    featured_limit = max(0, min(featured_limit, 24))

    omit_sections = (request.query_params.get('omit_sections') or '').strip().lower() in (
        '1', 'true', 'yes',
    )

    base_qs = (
        Product.objects.filter(is_active=True)
        .select_related('category', 'vendor')
        .prefetch_related('images')
        .order_by('order_sort', '-created_at')
    )

    sections = []
    cat_ctx = {'request': request}
    if not omit_sections:
        parents = list(
            ProductCategory.objects.filter(parent__isnull=True, is_active=True).order_by('name')
        )
        children_map = _category_children_map()
        for p in parents:
            allowed = _category_ids_for_section(p.id, mode, children_map)
            prods = list(base_qs.filter(category_id__in=allowed)[:per_section])
            if not prods:
                continue
            sections.append({
                'category': ProductCategorySerializer(p, context=cat_ctx).data,
                'products': ProductSerializer(prods, many=True, context=cat_ctx).data,
            })

    featured_data = []
    if featured_limit > 0:
        featured_qs = base_qs.filter(is_featured=True)[:featured_limit]
        featured_data = ProductSerializer(
            list(featured_qs),
            many=True,
            context=cat_ctx,
        ).data

    return Response({'featured': featured_data, 'sections': sections})


@api_view(['GET'])
@permission_classes([AllowAny])
def product_detail(request, pk):
    try:
        p = Product.objects.filter(is_active=True).select_related('category', 'vendor').prefetch_related('images').get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductSerializer(p, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def product_detail_by_slug(request, slug):
    try:
        p = Product.objects.filter(is_active=True).select_related('category', 'vendor').prefetch_related('images').get(slug=slug)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = ProductSerializer(p, context={'request': request})
    return Response(serializer.data)
