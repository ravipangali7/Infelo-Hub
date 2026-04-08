from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


DEFAULT_LANDING = {
    'title': 'Infelo Hub',
    'hero': {
        'heading': 'Shop, Share & Earn with Infelo Hub',
        'subtitle': "Nepal's leading multi-vendor marketplace with powerful earning opportunities through referrals, affiliates, and campaigns.",
        'primary_button_text': 'Get Started',
        'secondary_button_text': 'Explore Shop',
    },
    'features': [
        {'icon_key': 'shop', 'title': 'Shop & Earn', 'desc': 'Get cashback rewards on purchases'},
        {'icon_key': 'users', 'title': '7-Level Referrals', 'desc': "Earn from your network's activity"},
        {'icon_key': 'gift', 'title': 'Affiliate Program', 'desc': 'Share products and earn commission'},
        {'icon_key': 'trending', 'title': 'Campaign Rewards', 'desc': 'Complete tasks and earn more'},
    ],
    'cta': {
        'heading': 'Ready to Start Earning?',
        'subtext': 'Join thousands of users already earning through Infelo Hub.',
        'button_text': 'Join Now',
    },
    'footer_text': '© 2024 Infelo Hub. All rights reserved.',
}


@api_view(['GET'])
@permission_classes([AllowAny])
def landing_content(request):
    return Response(DEFAULT_LANDING)
