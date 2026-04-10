from xml.sax.saxutils import escape

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone

from core.models import Campaign, CampaignStatus, CmsPage, Product

SPA_BASE_URL = getattr(settings, 'SPA_BASE_URL', 'https://infelohub.infelogroup.com').rstrip('/')


def _fmt_lastmod(dt) -> str:
    if not dt:
        return ''
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    dt = timezone.localtime(dt)
    return dt.strftime('%Y-%m-%d')


def sitemap_xml(request):
    base = SPA_BASE_URL
    entries: list[dict] = []

    static_paths = ['/', '/shop', '/campaigns', '/learn-to-earn']
    for path in static_paths:
        entries.append({'loc': f'{base}{path}', 'changefreq': 'weekly', 'priority': '0.8'})

    for p in Product.objects.filter(is_active=True).only('slug', 'updated_at').order_by('id'):
        entries.append({
            'loc': f'{base}/product/{p.slug}',
            'lastmod': _fmt_lastmod(p.updated_at),
            'changefreq': 'weekly',
            'priority': '0.9',
        })

    for page in CmsPage.objects.filter(is_active=True).only('slug', 'updated_at').order_by('slug'):
        entries.append({
            'loc': f'{base}/page/{page.slug}',
            'lastmod': _fmt_lastmod(page.updated_at),
            'changefreq': 'monthly',
            'priority': '0.7',
        })

    for c in Campaign.objects.filter(
        status__in=[CampaignStatus.RUNNING, CampaignStatus.COMING],
    ).only('id', 'updated_at').order_by('id'):
        entries.append({
            'loc': f'{base}/campaign/{c.id}',
            'lastmod': _fmt_lastmod(c.updated_at),
            'changefreq': 'weekly',
            'priority': '0.75',
        })

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for e in entries:
        loc = escape(e['loc'], {'"': '&quot;', "'": '&apos;'})
        parts.append('  <url>')
        parts.append(f'    <loc>{loc}</loc>')
        if e.get('lastmod'):
            parts.append(f'    <lastmod>{e["lastmod"]}</lastmod>')
        if e.get('changefreq'):
            parts.append(f'    <changefreq>{e["changefreq"]}</changefreq>')
        if e.get('priority'):
            parts.append(f'    <priority>{e["priority"]}</priority>')
        parts.append('  </url>')
    parts.append('</urlset>')
    body = '\n'.join(parts) + '\n'
    return HttpResponse(body, content_type='application/xml; charset=utf-8')
