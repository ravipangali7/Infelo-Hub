from html import escape

from django.conf import settings
from django.http import Http404, HttpResponse

from core.models import Campaign, CampaignStatus

SPA_BASE_URL = getattr(settings, 'SPA_BASE_URL', 'https://infelohub.infelogroup.com').rstrip('/')


def campaign_share_page(request, pk: int):
    try:
        campaign = Campaign.objects.get(
            pk=pk,
            status__in=[CampaignStatus.RUNNING, CampaignStatus.COMING],
        )
    except Campaign.DoesNotExist:
        raise Http404

    title = (campaign.og_share_title or campaign.name or 'Campaign').strip()
    description = (campaign.og_share_description or campaign.description or '').strip()
    if not description:
        description = f'Join {campaign.name} on Infelo Hub'

    image_url = ''
    if campaign.og_share_image:
        image_url = request.build_absolute_uri(campaign.og_share_image.url)
    elif campaign.image:
        image_url = request.build_absolute_uri(campaign.image.url)

    base = SPA_BASE_URL
    spa_url = f'{base}/campaign/{pk}'
    q = request.GET.urlencode()
    if q:
        spa_url = f'{spa_url}?{q}'

    image_tag = ''
    if image_url:
        safe_image = escape(image_url, quote=True)
        image_tag = (
            f'<meta property="og:image" content="{safe_image}" />\n'
            f'  <meta property="og:image:secure_url" content="{safe_image}" />\n'
            f'  <meta name="twitter:image" content="{safe_image}" />'
        )

    safe_title = escape(title, quote=True)
    safe_desc = escape(description[:500], quote=True)
    safe_spa_url = escape(spa_url, quote=True)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{safe_title} | Infelo Hub</title>
  <meta name="description" content="{safe_desc}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Infelo Hub" />
  <meta property="og:title" content="{safe_title}" />
  <meta property="og:description" content="{safe_desc}" />
  <meta property="og:url" content="{safe_spa_url}" />
  {image_tag}
  <meta property="og:image:alt" content="{safe_title}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{safe_title}" />
  <meta name="twitter:description" content="{safe_desc}" />

  <meta http-equiv="refresh" content="0; url={safe_spa_url}" />
</head>
<body>
  <p>Redirecting to <a href="{safe_spa_url}">{safe_title}</a>...</p>
  <script>window.location.replace("{safe_spa_url}");</script>
</body>
</html>"""

    return HttpResponse(html, content_type='text/html; charset=utf-8')
