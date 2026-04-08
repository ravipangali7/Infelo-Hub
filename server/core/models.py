from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify

# Choice constants
class PaymentMethod(models.TextChoices):
    ESEWA = 'esewa', 'Esewa'
    KHALTI = 'khalti', 'Khalti'
    BANK = 'bank', 'Bank'
    COD = 'cod', 'Cash on Delivery'
    WALLET = 'wallet', 'Wallet'


class DiscountType(models.TextChoices):
    FLAT = 'flat', 'Flat'
    PERCENTAGE = 'percentage', 'Percentage'


class KycStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class UserStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    FREEZE = 'freeze', 'Freeze'
    DEACTIVATE = 'deactivate', 'Deactivate'


class PayoutAccountStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class PaymentRequestType(models.TextChoices):
    DEPOSIT = 'deposit', 'Deposit'
    WITHDRAW = 'withdraw', 'Withdraw'


class PaymentRequestStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class WithdrawalWalletType(models.TextChoices):
    EARNING = 'earning', 'Earning wallet'
    TOPUP = 'topup', 'Top-up wallet'


class SalesStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    SHIPPED = 'shipped', 'Shipped'
    DELIVERED = 'delivered', 'Delivered'
    CANCELLED = 'cancelled', 'Cancelled'
    REJECTED = 'rejected', 'Rejected'


class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PAID = 'paid', 'Paid'
    FAILED = 'failed', 'Failed'


class CampaignStatus(models.TextChoices):
    COMING = 'coming', 'Coming'
    RUNNING = 'running', 'Running'
    FINISHED = 'finished', 'Finished'
    DEACTIVATE = 'deactivate', 'Deactivate'


class CommissionType(models.TextChoices):
    FLAT = 'flat', 'Flat'
    PERCENTAGE = 'percentage', 'Percentage'


class SubmissionStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


class TransactionType(models.TextChoices):
    ADDED = 'added', 'Added'
    DEDUCTED = 'deducted', 'Deducted'


class TransactionFor(models.TextChoices):
    DEPOSIT = 'deposit', 'Deposit'
    WITHDRAWAL = 'withdrawal', 'Withdrawal'
    PACKAGE = 'package', 'Package'
    TASK_REWARD = 'task_reward', 'Task Reward'
    EARNING = 'earning', 'Earning'
    PAID = 'paid', 'Paid'
    RECEIVED = 'received', 'Received'
    ORDER = 'order', 'Order'
    BUYING_REWARD = 'buying_reward', 'Buying Reward'
    SYSTEM_WITHDRAWAL = 'system_withdrawal', 'System Withdrawal'


class TransactionStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SUCCESS = 'success', 'Success'
    FAILED = 'failed', 'Failed'


class WithdrawalAdminFeeType(models.TextChoices):
    FLAT = 'flat', 'Flat'
    PERCENTAGE = 'percentage', 'Percentage'


class SystemWithdrawalStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


# Models (dependency order)
class City(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Package(models.Model):
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    direct_referral = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_one = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_two = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_three = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_four = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_five = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_six = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    level_seven = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    first_name = None
    last_name = None
    username = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255, blank=True)
    kyc_status = models.CharField(max_length=20, choices=KycStatus.choices, default=KycStatus.PENDING)
    kyc_document_front = models.ImageField(upload_to='kyc/', blank=True, null=True)
    kyc_document_back = models.ImageField(upload_to='kyc/', blank=True, null=True)
    kyc_reject_reason = models.TextField(blank=True)
    referred_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals')
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    is_wallet_freeze = models.BooleanField(default=False)
    joined_at = models.DateTimeField(null=True, blank=True)
    legacy_auth_token = models.CharField(max_length=255, blank=True)  # renamed from auth_token to avoid clash with rest_framework.authtoken
    fcm_token = models.TextField(blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    package = models.ForeignKey(Package, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    earning_wallet = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    topup_wallet = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    def save(self, *args, **kwargs):
        if self.phone:
            self.username = self.phone
        super().save(*args, **kwargs)

    def __str__(self):
        return self.phone or self.username or str(self.pk)


class PayoutAccount(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payout_accounts')
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(max_length=20, choices=PayoutAccountStatus.choices, default=PayoutAccountStatus.PENDING)
    reject_reason = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    qr_image = models.ImageField(upload_to='payout_qr/', blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True)
    bank_branch = models.CharField(max_length=255, blank=True)
    bank_account_no = models.CharField(max_length=100, blank=True)
    bank_account_holder_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} - {self.get_payment_method_display()}'


class PaymentRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_requests')
    type = models.CharField(max_length=20, choices=PaymentRequestType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payout_account = models.ForeignKey(PayoutAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_requests')
    paid_date_time = models.DateTimeField(null=True, blank=True)
    screenshot = models.ImageField(upload_to='payment_screenshots/', blank=True, null=True)
    remarks = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PaymentRequestStatus.choices, default=PaymentRequestStatus.PENDING)
    reject_reason = models.TextField(blank=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, blank=True)
    payment_transaction_id = models.CharField(max_length=128, blank=True, default='')
    withdrawal_wallet_type = models.CharField(
        max_length=20, choices=WithdrawalWalletType.choices, blank=True, default='',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} - {self.get_type_display()} {self.amount}'


class ShippingCharge(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='shipping_charges')
    charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.city} - {self.charge}'


class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True, related_name='addresses')
    address = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} - {self.name}'


class ProductCategory(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Vendor(models.Model):
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_profile')
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='vendors/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    payable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    receivable = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    order_sort = models.PositiveIntegerField(default=0)
    is_affiliation = models.BooleanField(default=False)
    affiliation_reward_type = models.CharField(max_length=20, choices=DiscountType.choices, blank=True)
    affiliation_reward = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_purchase_reward = models.BooleanField(default=False)
    purchase_reward_type = models.CharField(max_length=20, choices=DiscountType.choices, blank=True)
    purchase_reward = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    short_description = models.TextField(blank=True)
    long_description = models.TextField(blank=True)
    stock = models.PositiveIntegerField(default=0)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, blank=True)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchasing_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self._state.adding:
            from django.db.models import Max
            m = Product.objects.aggregate(Max('order_sort'))['order_sort__max']
            self.order_sort = (m if m is not None else -1) + 1
        if not self.slug:
            base = slugify(self.name)
            slug = base
            n = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.product} - image'


class Purchase(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, blank=True)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Purchase #{self.pk}'


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchase_items')
    purchasing_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.purchase} - {self.product}'


class Sales(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, blank=True)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=SalesStatus.choices, default=SalesStatus.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, blank=True)
    deferred_reward_settlement = models.BooleanField(
        default=True,
        help_text='When True, affiliate and buyer purchase rewards settle when paid+delivered. False for legacy sales already credited at creation.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Sales #{self.pk}'


class SalesItem(models.Model):
    sales = models.ForeignKey(Sales, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sales_items')
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    referred_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='referred_sales_items')
    reward = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rewards_credited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.sales} - {self.product}'


class PaidRecord(models.Model):
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='paid_records')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='paid_records')
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, blank=True)
    remarks = models.TextField(blank=True)
    purchase = models.ForeignKey(Purchase, on_delete=models.SET_NULL, null=True, blank=True, related_name='paid_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.name} - {self.amount}'


class ReceivedRecord(models.Model):
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_records')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_records')
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, blank=True)
    remarks = models.TextField(blank=True)
    sales = models.ForeignKey(Sales, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_records')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.name} - {self.amount}'


class Campaign(models.Model):
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=CampaignStatus.choices, default=CampaignStatus.COMING)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='campaigns/', blank=True, null=True)
    video_link = models.URLField(blank=True)
    commission_type = models.CharField(max_length=20, choices=CommissionType.choices, blank=True)
    commission = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='campaigns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class CampaignSubmission(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='submissions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaign_submissions')
    status = models.CharField(max_length=20, choices=SubmissionStatus.choices, default=SubmissionStatus.PENDING)
    reject_reason = models.TextField(blank=True)
    reward_credited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.campaign} - {self.user}'


class CampaignSubmissionProof(models.Model):
    campaign_submission = models.ForeignKey(CampaignSubmission, on_delete=models.CASCADE, related_name='proofs')
    title = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='campaign_proofs/', blank=True, null=True)
    link = models.URLField(blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f'Proof #{self.pk}'


class PackageProduct(models.Model):
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='products')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='package_products')
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.package} - {self.product}'


class Transaction(models.Model):
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    payment_request = models.ForeignKey(
        'PaymentRequest', on_delete=models.CASCADE, null=True, blank=True, related_name='ledger_transactions',
    )
    transaction_for = models.CharField(max_length=30, choices=TransactionFor.choices, blank=True)
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING)
    is_system = models.BooleanField(default=False)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user} - {self.get_transaction_type_display()} {self.amount}'


class SystemSetting(models.Model):
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    esewa_qr = models.ImageField(upload_to='system/', blank=True, null=True)
    esewa_phone = models.CharField(max_length=20, blank=True)
    khalti_qr = models.ImageField(upload_to='system/', blank=True, null=True)
    khalti_phone = models.CharField(max_length=20, blank=True)
    bank_qr = models.ImageField(upload_to='system/', blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True)
    bank_branch = models.CharField(max_length=255, blank=True)
    bank_account_no = models.CharField(max_length=100, blank=True)
    bank_account_holder_name = models.CharField(max_length=255, blank=True)
    minimum_withdrawal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    maximum_withdrawal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    minimum_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    maximum_deposit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    withdrawal_admin_fee_type = models.CharField(max_length=20, choices=WithdrawalAdminFeeType.choices, blank=True)
    withdrawal_admin_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    registration_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    high_value_payment_threshold = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='If > 0, staff get ADMIN_A9 when a deposit/withdraw request amount is >= this value.',
    )
    is_withdrawal = models.BooleanField(default=True)
    is_earning_withdrawal = models.BooleanField(default=True)
    is_topup_withdrawal = models.BooleanField(default=True)
    earning_limit_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    reward_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sms_api_key = models.CharField(max_length=255, blank=True)
    sms_sender_id = models.CharField(max_length=50, blank=True, default='SMSBit')
    app_current_version = models.CharField(max_length=32, blank=True, default='1')
    android_file = models.FileField(upload_to='system/android/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return 'System Setting'


class SystemWithdrawal(models.Model):
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=SystemWithdrawalStatus.choices, default=SystemWithdrawalStatus.PENDING)
    reject_reason = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'System Withdrawal #{self.pk} - {self.amount}'


class ActivityLogs(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    is_guest = models.BooleanField(default=False)
    session_id = models.CharField(max_length=255, blank=True)
    session_start_time = models.DateTimeField(null=True, blank=True)
    session_end_time = models.DateTimeField(null=True, blank=True)
    session_duration = models.PositiveIntegerField(null=True, blank=True)  # seconds
    session_number = models.PositiveIntegerField(null=True, blank=True)
    referrer_url = models.URLField(blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    os_name = models.CharField(max_length=100, blank=True)
    os_version = models.CharField(max_length=50, blank=True)
    browser_name = models.CharField(max_length=100, blank=True)
    browser_version = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, blank=True)
    event_name = models.CharField(max_length=255, blank=True)
    event_timestamp = models.DateTimeField(null=True, blank=True)
    event_value = models.CharField(max_length=255, blank=True)
    event_properties = models.JSONField(default=dict, blank=True)
    page_url = models.URLField(blank=True)
    page_path = models.CharField(max_length=500, blank=True)
    page_title = models.CharField(max_length=255, blank=True)
    scroll_depth = models.PositiveIntegerField(null=True, blank=True)
    time_on_page = models.PositiveIntegerField(null=True, blank=True)  # seconds
    clicks_count = models.PositiveIntegerField(default=0)
    platform = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.event_name} - {self.created_at}'


class OtpPurpose(models.TextChoices):
    REGISTER = 'register', 'Register'
    FORGOT_PASSWORD = 'forgot_password', 'Forgot Password'


class OtpVerification(models.Model):
    phone = models.CharField(max_length=20, db_index=True)
    purpose = models.CharField(max_length=30, choices=OtpPurpose.choices)
    otp_code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    resend_count = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.phone} ({self.purpose})'


class SmsLog(models.Model):
    phone = models.CharField(max_length=20, db_index=True)
    purpose = models.CharField(max_length=30, choices=OtpPurpose.choices)
    message = models.TextField(blank=True)
    provider = models.CharField(max_length=50, default='samaye')
    status = models.CharField(max_length=20, default='failed')
    response_payload = models.JSONField(default=dict, blank=True)
    consumed_units = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.phone} - {self.purpose} ({self.status})'


class Banner(models.Model):
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='banners/')
    link = models.URLField(blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None


class PushNotification(models.Model):
    title = models.CharField(max_length=255)
    message = models.TextField()
    kind = models.CharField(max_length=64, blank=True, default='', db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    image = models.ImageField(upload_to='push_notifications/', blank=True, null=True)
    receivers = models.ManyToManyField(User, related_name='push_notifications', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class PushNotificationUserStatus(models.Model):
    """Per-user read state for push notifications (receiver must match M2M on PushNotification)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_notification_statuses')
    push_notification = models.ForeignKey(
        PushNotification, on_delete=models.CASCADE, related_name='user_statuses'
    )
    read_at = models.DateTimeField()

    class Meta:
        unique_together = ('user', 'push_notification')

    def __str__(self):
        return f'{self.user_id} push#{self.push_notification_id} @ {self.read_at}'


class SiteSetting(models.Model):
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='site/', blank=True, null=True)
    title = models.CharField(max_length=255, blank=True)
    subtitle = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    facebook = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    tiktok = models.URLField(blank=True)
    youtube = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def logo_url(self):
        if self.logo:
            return self.logo.url
        return None


class CmsPage(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    image = models.ImageField(upload_to='cms/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None


class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')

    def __str__(self):
        return f'{self.user} - {self.product}'
