from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Transaction
from core.serializers import UserSerializer, TransactionSerializer, ProductSerializer, CampaignSerializer, PackageSerializer
from core.models import Product, Campaign, Package


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_dashboard(request):
    user = request.user
    user_ser = UserSerializer(user, context={'request': request})
    wallet = {
        'earning_wallet': float(user.earning_wallet),
        'topup_wallet': float(user.topup_wallet),
        'package_name': user.package.name if user.package else None,
    }
    recent_transactions = Transaction.objects.filter(user=user).order_by('-created_at')[:10]
    tx_ser = TransactionSerializer(recent_transactions, many=True, context={'request': request})
    featured_products = (
        Product.objects.filter(is_active=True, is_featured=True)
        .select_related('category', 'vendor')
        .prefetch_related('images')
        .order_by('order_sort', '-created_at')[:8]
    )
    products_ser = ProductSerializer(featured_products, many=True, context={'request': request})
    campaigns = Campaign.objects.filter(status__in=['running', 'coming'])[:5]
    campaigns_ser = CampaignSerializer(campaigns, many=True, context={'request': request})
    packages = Package.objects.all()[:5]
    packages_ser = PackageSerializer(packages, many=True, context={'request': request})
    return Response({
        'user': user_ser.data,
        'wallet': wallet,
        'recent_transactions': tx_ser.data,
        'featured_products': products_ser.data,
        'campaigns': campaigns_ser.data,
        'packages': packages_ser.data,
    })
