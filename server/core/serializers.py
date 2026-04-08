"""DRF serializers for API responses. Use request in context for absolute media URLs."""
from rest_framework import serializers
from .models import (
    User, Package, City, PayoutAccount, PaymentRequest, PaymentRequestType, Address, ShippingCharge,
    ProductCategory, Vendor, Product, ProductImage, Purchase, PurchaseItem,
    Sales, SalesItem, PaidRecord, ReceivedRecord,
    Campaign, CampaignSubmission, CampaignSubmissionProof,
    PackageProduct, Transaction, TransactionType, TransactionFor, TransactionStatus,
    SystemSetting, SystemWithdrawal, ActivityLogs, SmsLog,
    Banner, PushNotification, PushNotificationUserStatus, SiteSetting, CmsPage, Wishlist,
)
from .api_utils import build_absolute_uri


class NullablePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """Multipart forms send '' for cleared nullable FKs; coerce to None."""

    def to_internal_value(self, data):
        if data in ("", None) and self.allow_null:
            return None
        return super().to_internal_value(data)


class UserSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)
    referred_by_name = serializers.CharField(source='referred_by.name', read_only=True, allow_null=True)
    referred_by_phone = serializers.CharField(source='referred_by.phone', read_only=True, allow_null=True)
    kyc_document_front_url = serializers.SerializerMethodField()
    kyc_document_back_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'username', 'email', 'name', 'first_name', 'last_name',
            'kyc_status', 'kyc_document_front', 'kyc_document_back', 'kyc_document_front_url', 'kyc_document_back_url',
            'kyc_reject_reason', 'status', 'is_wallet_freeze', 'package', 'package_name',
            'earning_wallet', 'topup_wallet', 'joined_at', 'activated_at',
            'created_at', 'updated_at', 'referred_by', 'referred_by_name', 'referred_by_phone', 'is_staff', 'is_active',
        ]
        read_only_fields = fields

    def get_kyc_document_front_url(self, obj):
        if not obj.kyc_document_front:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.kyc_document_front.url)

    def get_kyc_document_back_url(self, obj):
        if not obj.kyc_document_back:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.kyc_document_back.url)


class UserMinimalSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'phone', 'name', 'kyc_status', 'status', 'is_active', 'package', 'package_name', 'created_at']


class UserKycListSerializer(serializers.ModelSerializer):
    """Admin KYC queue: includes document URLs for review."""
    package_name = serializers.CharField(source='package.name', read_only=True, allow_null=True)
    kyc_document_front_url = serializers.SerializerMethodField()
    kyc_document_back_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'name', 'kyc_status', 'kyc_reject_reason',
            'kyc_document_front_url', 'kyc_document_back_url',
            'status', 'is_active', 'package', 'package_name', 'created_at',
        ]
        read_only_fields = fields

    def get_kyc_document_front_url(self, obj):
        if not obj.kyc_document_front:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.kyc_document_front.url)

    def get_kyc_document_back_url(self, obj):
        if not obj.kyc_document_back:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.kyc_document_back.url)


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'name', 'district', 'province', 'created_at', 'updated_at']


class ShippingChargeSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    city_district = serializers.CharField(source='city.district', read_only=True)
    city_province = serializers.CharField(source='city.province', read_only=True)

    class Meta:
        model = ShippingCharge
        fields = [
            'id', 'city', 'city_name', 'city_district', 'city_province',
            'charge', 'created_at', 'updated_at',
        ]


class PaidRecordSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    purchase_total = serializers.DecimalField(source='purchase.total', read_only=True, allow_null=True, max_digits=14, decimal_places=2)
    purchase_payment_status = serializers.CharField(source='purchase.payment_status', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = PaidRecord
        fields = [
            'id', 'name', 'amount', 'vendor', 'vendor_name', 'user', 'user_name', 'user_phone',
            'payment_method', 'payment_method_display', 'remarks', 'purchase',
            'purchase_total', 'purchase_payment_status', 'created_at', 'updated_at',
        ]


class ReceivedRecordSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    sales_total = serializers.DecimalField(source='sales.total', read_only=True, allow_null=True, max_digits=14, decimal_places=2)
    sales_status = serializers.CharField(source='sales.status', read_only=True, allow_null=True)
    sales_payment_status = serializers.CharField(source='sales.payment_status', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = ReceivedRecord
        fields = [
            'id', 'name', 'amount', 'vendor', 'vendor_name', 'user', 'user_name', 'user_phone',
            'payment_method', 'payment_method_display', 'remarks', 'sales',
            'sales_total', 'sales_status', 'sales_payment_status', 'created_at', 'updated_at',
        ]


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = [
            'id', 'name', 'amount', 'discount', 'direct_referral',
            'level_one', 'level_two', 'level_three', 'level_four',
            'level_five', 'level_six', 'level_seven',
            'created_at', 'updated_at',
        ]


class PayoutAccountSerializer(serializers.ModelSerializer):
    qr_image_url = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)

    class Meta:
        model = PayoutAccount
        fields = [
            'id', 'user', 'payment_method', 'payment_method_display', 'status',
            'reject_reason', 'phone', 'qr_image', 'qr_image_url',
            'bank_name', 'bank_branch', 'bank_account_no', 'bank_account_holder_name',
            'user_name', 'user_phone', 'created_at', 'updated_at',
        ]

    def get_qr_image_url(self, obj):
        if not obj.qr_image:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.qr_image.url)


class PaymentRequestSerializer(serializers.ModelSerializer):
    screenshot_url = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payout_account = NullablePrimaryKeyRelatedField(queryset=PayoutAccount.objects.all(), allow_null=True, required=False)
    wallet_type = serializers.CharField(write_only=True, required=False, allow_blank=True)
    withdrawal_wallet_type_display = serializers.SerializerMethodField()
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    payout_account_detail = serializers.SerializerMethodField()

    class Meta:
        model = PaymentRequest
        fields = [
            'id', 'user', 'type', 'type_display', 'amount', 'payout_account',
            'paid_date_time', 'screenshot', 'screenshot_url', 'remarks', 'status', 'status_display',
            'reject_reason', 'payment_method', 'payment_method_display', 'payment_transaction_id',
            'withdrawal_wallet_type', 'withdrawal_wallet_type_display',
            'user_name', 'user_phone', 'payout_account_detail',
            'wallet_type', 'created_at', 'updated_at',
        ]

    @staticmethod
    def _normalize_withdrawal_wallet_type(raw):
        w = (raw or 'earning').strip().lower()
        return w if w in ('earning', 'topup') else 'earning'

    def get_withdrawal_wallet_type_display(self, obj):
        if not obj.withdrawal_wallet_type:
            return ''
        return obj.get_withdrawal_wallet_type_display()

    def create(self, validated_data):
        wallet_type_input = validated_data.pop('wallet_type', None)
        req_type = validated_data.get('type')
        if req_type == PaymentRequestType.WITHDRAW:
            validated_data['withdrawal_wallet_type'] = self._normalize_withdrawal_wallet_type(wallet_type_input)
        else:
            validated_data['withdrawal_wallet_type'] = ''
        pr = super().create(validated_data)
        if pr.type == PaymentRequestType.DEPOSIT:
            Transaction.objects.create(
                user=pr.user,
                amount=pr.amount,
                transaction_type=TransactionType.ADDED,
                transaction_for=TransactionFor.DEPOSIT,
                status=TransactionStatus.PENDING,
                payment_request=pr,
                remarks=f'Deposit request #{pr.id}',
                is_system=True,
            )
        elif pr.type == PaymentRequestType.WITHDRAW:
            Transaction.objects.create(
                user=pr.user,
                amount=pr.amount,
                transaction_type=TransactionType.DEDUCTED,
                transaction_for=TransactionFor.WITHDRAWAL,
                status=TransactionStatus.PENDING,
                payment_request=pr,
                remarks=f'Withdrawal request #{pr.id}',
                is_system=True,
            )
        return pr

    def update(self, instance, validated_data):
        if 'wallet_type' in validated_data:
            wt = validated_data.pop('wallet_type')
            if instance.type == PaymentRequestType.WITHDRAW:
                validated_data['withdrawal_wallet_type'] = self._normalize_withdrawal_wallet_type(wt)
        return super().update(instance, validated_data)

    def get_screenshot_url(self, obj):
        if not obj.screenshot:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.screenshot.url)

    def get_payout_account_detail(self, obj):
        if not obj.payout_account:
            return None
        request = self.context.get('request')
        return PayoutAccountSerializer(obj.payout_account, context={'request': request}).data


class AddressSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)

    class Meta:
        model = Address
        fields = [
            'id', 'user', 'name', 'phone', 'country', 'state', 'district', 'city', 'city_name',
            'address', 'latitude', 'longitude', 'user_name', 'user_phone', 'created_at', 'updated_at',
        ]

    _NEPAL = 'Nepal'

    def create(self, validated_data):
        validated_data['country'] = self._NEPAL
        city = validated_data.get('city')
        if city is not None:
            if getattr(city, 'district', None):
                validated_data['district'] = city.district
            if getattr(city, 'province', None):
                validated_data['state'] = city.province
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['country'] = self._NEPAL
        city = validated_data.get('city', instance.city)
        if city is not None:
            if getattr(city, 'district', None):
                validated_data['district'] = city.district
            if getattr(city, 'province', None):
                validated_data['state'] = city.province
        return super().update(instance, validated_data)


class ProductCategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    parent = NullablePrimaryKeyRelatedField(queryset=ProductCategory.objects.all(), allow_null=True, required=False)
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)

    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'description', 'image', 'image_url', 'parent', 'parent_name', 'is_active', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.image.url)


class VendorSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    user = NullablePrimaryKeyRelatedField(queryset=User.objects.all(), allow_null=True, required=False)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    user_status = serializers.CharField(source='user.status', read_only=True, allow_null=True)

    class Meta:
        model = Vendor
        fields = ['id', 'user', 'user_name', 'user_phone', 'user_status', 'name', 'logo', 'logo_url', 'phone', 'payable', 'receivable', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.logo.url)


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'image_url', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.image.url)


class ProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, allow_null=True)
    vendor = NullablePrimaryKeyRelatedField(queryset=Vendor.objects.all(), allow_null=True, required=False)
    category = NullablePrimaryKeyRelatedField(queryset=ProductCategory.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'name', 'sku', 'is_active', 'is_featured', 'order_sort', 'is_affiliation', 'affiliation_reward_type', 'affiliation_reward',
            'is_purchase_reward', 'purchase_reward_type', 'purchase_reward',
            'vendor', 'vendor_name', 'category', 'category_name',
            'short_description', 'long_description', 'stock',
            'discount_type', 'discount', 'purchasing_price', 'selling_price',
            'image', 'image_url', 'images', 'created_at', 'updated_at',
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.image.url)


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ['id', 'purchase', 'product', 'product_name', 'purchasing_price', 'quantity', 'total', 'created_at', 'updated_at']


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, allow_null=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id', 'vendor', 'vendor_name', 'user', 'user_name', 'user_phone', 'subtotal', 'discount_type', 'discount', 'total',
            'payment_status', 'payment_status_display', 'items', 'created_at', 'updated_at',
        ]


class SalesItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SalesItem
        fields = [
            'id', 'sales', 'product', 'product_name', 'product_image_url',
            'selling_price', 'quantity', 'total', 'referred_by', 'reward', 'created_at', 'updated_at',
        ]

    def get_product_image_url(self, obj):
        p = getattr(obj, 'product', None)
        if not p or not getattr(p, 'image', None):
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, p.image.url)


class SalesSerializer(serializers.ModelSerializer):
    items = SalesItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    address_name = serializers.CharField(source='address.name', read_only=True, allow_null=True)
    address_phone = serializers.CharField(source='address.phone', read_only=True, allow_null=True)
    address_text = serializers.CharField(source='address.address', read_only=True, allow_null=True)
    address_city = serializers.CharField(source='address.city.name', read_only=True, allow_null=True)
    address_district = serializers.CharField(source='address.district', read_only=True, allow_null=True)
    address_state = serializers.CharField(source='address.state', read_only=True, allow_null=True)
    address_detail = AddressSerializer(source='address', read_only=True, allow_null=True)

    class Meta:
        model = Sales
        fields = [
            'id', 'vendor', 'vendor_name', 'user', 'user_name', 'user_phone', 'address',
            'address_detail', 'address_name', 'address_phone', 'address_text', 'address_city', 'address_district', 'address_state',
            'subtotal', 'discount_type', 'discount', 'shipping_charge', 'total',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'payment_method', 'items', 'created_at', 'updated_at',
        ]


class CampaignSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    product = NullablePrimaryKeyRelatedField(queryset=Product.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'status', 'status_display', 'description', 'image', 'image_url',
            'video_link', 'commission_type', 'commission', 'product', 'product_name',
            'created_at', 'updated_at',
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.image.url)


class CampaignSubmissionProofSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CampaignSubmissionProof
        fields = ['id', 'campaign_submission', 'title', 'image', 'image_url', 'link', 'remarks', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.image.url)


class CampaignSubmissionProofWriteSerializer(serializers.ModelSerializer):
    """Write-only nested proof rows (no image; use client proof upload endpoint for files)."""

    link = serializers.CharField(required=False, allow_blank=True, max_length=2048)

    class Meta:
        model = CampaignSubmissionProof
        fields = ['title', 'link', 'remarks']

    def validate(self, attrs):
        title = (attrs.get('title') or '').strip()
        link = (attrs.get('link') or '').strip()
        remarks = (attrs.get('remarks') or '').strip()
        if not title and not link:
            raise serializers.ValidationError('Each proof must include at least a title or a link.')
        if link:
            try:
                serializers.URLField().run_validation(link)
            except serializers.ValidationError as e:
                raise serializers.ValidationError({'link': e.detail})
        attrs['title'] = title
        attrs['link'] = link
        attrs['remarks'] = remarks
        return attrs


class CampaignSubmissionProofCreateSerializer(serializers.ModelSerializer):
    """Multipart create for one proof on an existing submission (optional image)."""

    link = serializers.CharField(required=False, allow_blank=True, max_length=2048)

    class Meta:
        model = CampaignSubmissionProof
        fields = ['title', 'link', 'remarks', 'image']

    def validate(self, attrs):
        title = (attrs.get('title') or '').strip()
        link = (attrs.get('link') or '').strip()
        image = attrs.get('image')
        if not title and not link and not image:
            raise serializers.ValidationError('Provide at least a title, link, or image.')
        if link:
            try:
                serializers.URLField().run_validation(link)
            except serializers.ValidationError as e:
                raise serializers.ValidationError({'link': e.detail})
        attrs['title'] = title
        attrs['link'] = link
        attrs['remarks'] = (attrs.get('remarks') or '').strip()
        return attrs


class CampaignSubmissionSerializer(serializers.ModelSerializer):
    proofs = CampaignSubmissionProofSerializer(many=True, read_only=True)
    proof_items = CampaignSubmissionProofWriteSerializer(many=True, write_only=True, required=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    campaign_detail = CampaignSerializer(source='campaign', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reward_credited_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = CampaignSubmission
        fields = [
            'id', 'campaign', 'campaign_name', 'user', 'status', 'status_display',
            'reject_reason', 'reward_credited_at', 'proofs', 'proof_items',
            'campaign_detail', 'user_name', 'user_phone', 'created_at', 'updated_at',
        ]

    def validate_proof_items(self, value):
        if not value:
            raise serializers.ValidationError('At least one proof is required.')
        return value

    def create(self, validated_data):
        from django.db import transaction

        proof_items = validated_data.pop('proof_items')
        with transaction.atomic():
            submission = CampaignSubmission.objects.create(**validated_data)
            for item in proof_items:
                CampaignSubmissionProof.objects.create(campaign_submission=submission, **item)
        return submission


class PackageProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PackageProduct
        fields = ['id', 'package', 'product', 'product_name', 'selling_price', 'quantity', 'total', 'created_at', 'updated_at']


class PackageDetailSerializer(serializers.ModelSerializer):
    products = PackageProductSerializer(many=True, read_only=True)

    class Meta:
        model = Package
        fields = [
            'id', 'name', 'amount', 'discount', 'direct_referral',
            'level_one', 'level_two', 'level_three', 'level_four',
            'level_five', 'level_six', 'level_seven',
            'products', 'created_at', 'updated_at',
        ]


class TransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    transaction_for_display = serializers.CharField(source='get_transaction_for_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True, allow_null=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True, allow_null=True)
    payment_request_type = serializers.CharField(source='payment_request.type', read_only=True, allow_null=True)
    payment_request_status = serializers.CharField(source='payment_request.status', read_only=True, allow_null=True)
    payment_request_user_name = serializers.CharField(source='payment_request.user.name', read_only=True, allow_null=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'amount', 'transaction_type', 'transaction_type_display',
            'transaction_for', 'transaction_for_display', 'status', 'status_display',
            'is_system', 'remarks',
            'user_name', 'user_phone', 'payment_request_type', 'payment_request_status', 'payment_request_user_name',
            'created_at', 'updated_at',
        ]


class SystemSettingSerializer(serializers.ModelSerializer):
    esewa_qr_url = serializers.SerializerMethodField()
    khalti_qr_url = serializers.SerializerMethodField()
    bank_qr_url = serializers.SerializerMethodField()
    android_file_url = serializers.SerializerMethodField()

    class Meta:
        model = SystemSetting
        fields = [
            'id', 'balance', 'esewa_qr', 'esewa_qr_url', 'esewa_phone', 'khalti_qr', 'khalti_qr_url', 'khalti_phone',
            'bank_qr', 'bank_qr_url', 'bank_name', 'bank_branch', 'bank_account_no', 'bank_account_holder_name',
            'minimum_withdrawal', 'maximum_withdrawal', 'minimum_deposit', 'maximum_deposit',
            'withdrawal_admin_fee_type', 'withdrawal_admin_fee', 'registration_fee',
            'low_stock_threshold', 'high_value_payment_threshold',
            'is_withdrawal', 'is_earning_withdrawal', 'is_topup_withdrawal', 'is_kyc_compulsory',
            'earning_limit_percentage', 'reward_percentage', 'sms_api_key', 'sms_sender_id',
            'app_current_version', 'android_file', 'android_file_url',
            'created_at', 'updated_at',
        ]

    def get_esewa_qr_url(self, obj):
        if not obj.esewa_qr:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.esewa_qr.url)

    def get_khalti_qr_url(self, obj):
        if not obj.khalti_qr:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.khalti_qr.url)

    def get_bank_qr_url(self, obj):
        if not obj.bank_qr:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.bank_qr.url)

    def get_android_file_url(self, obj):
        if not obj.android_file:
            return None
        request = self.context.get('request')
        return build_absolute_uri(request, obj.android_file.url)


class SystemWithdrawalSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SystemWithdrawal
        fields = ['id', 'amount', 'status', 'status_display', 'reject_reason', 'remarks', 'created_at', 'updated_at']


class ActivityLogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLogs
        fields = '__all__'


class SmsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsLog
        fields = '__all__'


class BannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ['id', 'title', 'image', 'image_url', 'link', 'order', 'is_active', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return build_absolute_uri(request, obj.image.url)
        return None


class PushNotificationListSerializer(serializers.ModelSerializer):
    receivers_count = serializers.SerializerMethodField()

    class Meta:
        model = PushNotification
        fields = ['id', 'title', 'message', 'kind', 'created_at', 'updated_at', 'receivers_count']

    def get_receivers_count(self, obj):
        if hasattr(obj, 'receivers_count_annotated'):
            return obj.receivers_count_annotated
        return obj.receivers.count()


class PushNotificationSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    receivers = UserMinimalSerializer(many=True, read_only=True)
    receiver_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), write_only=True, required=False,
    )

    class Meta:
        model = PushNotification
        fields = [
            'id', 'title', 'message', 'kind', 'payload', 'image', 'image_url',
            'receivers', 'receiver_ids', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'receivers', 'kind', 'payload', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return build_absolute_uri(request, obj.image.url)
        return None

    def create(self, validated_data):
        receiver_ids = validated_data.pop('receiver_ids', None)
        obj = PushNotification.objects.create(**validated_data)
        if receiver_ids is not None:
            obj.receivers.set(receiver_ids)
        return obj

    def update(self, instance, validated_data):
        receiver_ids = validated_data.pop('receiver_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if receiver_ids is not None:
            instance.receivers.set(receiver_ids)
        return instance


class ClientPushNotificationInboxSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()

    class Meta:
        model = PushNotification
        fields = ['id', 'title', 'message', 'kind', 'payload', 'image_url', 'created_at', 'is_read', 'read_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return build_absolute_uri(request, obj.image.url)
        return None

    def get_is_read(self, obj):
        s = self._first_user_status(obj)
        return s is not None

    def get_read_at(self, obj):
        s = self._first_user_status(obj)
        if s:
            return s.read_at.isoformat()
        return None

    def _first_user_status(self, obj):
        for s in obj.user_statuses.all():
            return s
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return PushNotificationUserStatus.objects.filter(
                user=user, push_notification=obj
            ).first()
        return None


class SiteSettingSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSetting
        fields = ['id', 'name', 'logo', 'logo_url', 'title', 'subtitle', 'phone', 'whatsapp',
                  'email', 'facebook', 'instagram', 'tiktok', 'youtube', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        request = self.context.get('request')
        if obj.logo:
            return build_absolute_uri(request, obj.logo.url)
        return None


class CmsPageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CmsPage
        fields = ['id', 'name', 'slug', 'title', 'content', 'image', 'image_url', 'is_active',
                  'created_at', 'updated_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image:
            return build_absolute_uri(request, obj.image.url)
        return None


class WishlistSerializer(serializers.ModelSerializer):
    product_detail = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_detail', 'created_at']

    def get_product_detail(self, obj):
        request = self.context.get('request')
        return ProductSerializer(obj.product, context={'request': request}).data
