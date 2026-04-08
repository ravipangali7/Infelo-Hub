from html import escape
from django.http import HttpResponse, Http404
from django.conf import settings
from core.models import Product

SPA_BASE_URL = getattr(settings, 'SPA_BASE_URL', 'http://localhost:5173')


def product_share_page(request, slug):
    try:
        product = Product.objects.select_related('category', 'vendor').get(slug=slug, is_active=True)
    except Product.DoesNotExist:
        raise Http404

    image_url = ''
    if product.image:
        image_url = request.build_absolute_uri(product.image.url)

    description = product.short_description or f"Buy {product.name} on Infelo Hub"
    base = SPA_BASE_URL.rstrip('/')
    spa_url = f"{base}/product/{slug}"
    q = request.GET.urlencode()
    if q:
        spa_url = f"{spa_url}?{q}"
    image_tag = ''
    if image_url:
        safe_image = escape(image_url)
        image_tag = (
            f'<meta property="og:image" content="{safe_image}" />\n'
            f'  <meta property="og:image:secure_url" content="{safe_image}" />\n'
            f'  <meta name="twitter:image" content="{safe_image}" />'
        )

    safe_title = escape(product.name)
    safe_desc = escape(description)
    safe_spa_url = escape(spa_url)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{safe_title} | Infelo Hub</title>
  <meta name="description" content="{safe_desc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Infelo Hub" />
  <meta property="og:title" content="{safe_title}" />
  <meta property="og:description" content="{safe_desc}" />
  <meta property="og:url" content="{safe_spa_url}" />
  {image_tag}
  <meta property="og:image:alt" content="{safe_title}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{safe_title}" />
  <meta name="twitter:description" content="{safe_desc}" />

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0; url={safe_spa_url}" />
</head>
<body>
  <p>Redirecting to <a href="{safe_spa_url}">{safe_title}</a>...</p>
  <script>window.location.replace("{safe_spa_url}");</script>
</body>
</html>"""

    return HttpResponse(html, content_type='text/html; charset=utf-8')
