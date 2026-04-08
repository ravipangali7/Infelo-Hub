from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import (
    CampaignSubmissionAdminForm,
    PaymentRequestAdminForm,
    ProductAdminForm,
    PurchaseAdminForm,
    SalesAdminForm,
    UserAdminForm,
)
from .campaign_submission_rewards import approve_submission_with_reward
from .models import (
    ActivityLogs,
    Campaign,
    CampaignSubmission,
    CampaignSubmissionProof,
    Package,
    PackageProduct,
    PaidRecord,
    PaymentRequest, 
    PaymentRequestStatus,
    PayoutAccount,
    PayoutAccountStatus,
    Product,
    ProductCategory,
    ProductImage,
    Purchase,
    PurchaseItem,
    ReceivedRecord,
    Sales,
    SalesItem,
    ShippingCharge,
    SubmissionStatus,
    SystemSetting,
    SystemWithdrawal,
    SystemWithdrawalStatus,
    Transaction,
    User,
    UserStatus,
    Vendor,
    Address,
    City,
    Banner,
    PushNotification,
    SiteSetting,
    CmsPage,
    Wishlist,
)


class BaseAdmin(admin.ModelAdmin):
    list_per_page = 50
    save_on_top = True
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    autocomplete_fields = ("product",)


class SalesItemInline(admin.TabularInline):
    model = SalesItem
    extra = 0
    autocomplete_fields = ("product", "referred_by")


class CampaignSubmissionProofInline(admin.TabularInline):
    model = CampaignSubmissionProof
    extra = 0


class PackageProductInline(admin.TabularInline):
    model = PackageProduct
    extra = 0
    autocomplete_fields = ("product",)


@admin.register(User)
class UserAdmin(BaseUserAdmin, BaseAdmin):
    form = UserAdminForm
    list_display = (
        "id",
        "phone",
        "name",
        "kyc_status",
        "status",
        "is_wallet_freeze",
        "package",
        "is_staff",
        "is_active",
        "created_at",
    )
    list_filter = ("kyc_status", "status", "is_wallet_freeze", "is_staff", "is_active", "created_at")
    search_fields = ("id", "username", "phone", "name", "email")
    autocomplete_fields = ("referred_by", "package")
    actions = ("freeze_wallets", "unfreeze_wallets", "activate_users", "freeze_users")
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            ),
        }),
        ("Important dates", {"fields": ("last_login",)}),
        (
            "Business Profile",
            {
                "fields": (
                    "phone",
                    "name",
                    "email",
                    "kyc_status",
                    "kyc_document_front",
                    "kyc_document_back",
                    "kyc_reject_reason",
                    "referred_by",
                    "status",
                    "is_wallet_freeze",
                    "joined_at",
                    "legacy_auth_token",
                    "fcm_token",
                    "activated_at",
                    "package",
                    "earning_wallet",
                    "topup_wallet",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + ((None, {"fields": ("phone", "name", "email")}),)

    @admin.action(description="Freeze wallet for selected users")
    def freeze_wallets(self, request, queryset):
        updated = queryset.update(is_wallet_freeze=True)
        self.message_user(request, f"Wallet frozen for {updated} users.", level=messages.SUCCESS)

    @admin.action(description="Unfreeze wallet for selected users")
    def unfreeze_wallets(self, request, queryset):
        updated = queryset.update(is_wallet_freeze=False)
        self.message_user(request, f"Wallet unfrozen for {updated} users.", level=messages.SUCCESS)

    @admin.action(description="Set selected users to active status")
    def activate_users(self, request, queryset):
        updated = queryset.update(status=UserStatus.ACTIVE)
        self.message_user(request, f"{updated} users set to active.", level=messages.SUCCESS)

    @admin.action(description="Set selected users to freeze status")
    def freeze_users(self, request, queryset):
        updated = queryset.update(status=UserStatus.FREEZE)
        self.message_user(request, f"{updated} users set to freeze.", level=messages.WARNING)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("package", "referred_by")


@admin.register(PayoutAccount)
class PayoutAccountAdmin(BaseAdmin):
    list_display = ("id", "user", "payment_method", "status", "phone", "created_at")
    list_filter = ("payment_method", "status", "created_at")
    search_fields = ("id", "user__username", "user__phone", "phone", "bank_account_no")
    autocomplete_fields = ("user",)
    actions = ("approve_accounts", "reject_accounts")

    @admin.action(description="Approve selected payout accounts")
    def approve_accounts(self, request, queryset):
        updated = queryset.exclude(status=PayoutAccountStatus.APPROVED).update(status=PayoutAccountStatus.APPROVED)
        self.message_user(request, f"{updated} payout accounts approved.", level=messages.SUCCESS)

    @admin.action(description="Reject selected payout accounts")
    def reject_accounts(self, request, queryset):
        updated = queryset.exclude(status=PayoutAccountStatus.REJECTED).update(status=PayoutAccountStatus.REJECTED)
        self.message_user(request, f"{updated} payout accounts rejected.", level=messages.WARNING)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(PaymentRequest)
class PaymentRequestAdmin(BaseAdmin):
    form = PaymentRequestAdminForm
    list_display = ("id", "user", "type", "amount", "status", "payment_method", "created_at")
    list_filter = ("type", "status", "payment_method", "created_at")
    search_fields = ("id", "user__username", "user__phone", "remarks")
    autocomplete_fields = ("user", "payout_account")
    actions = ("approve_requests", "reject_requests")

    @admin.action(description="Approve selected payment requests")
    def approve_requests(self, request, queryset):
        # Per-row .save() so transactional notification signals run (QuerySet.update does not).
        n = 0
        for pr in queryset.exclude(status=PaymentRequestStatus.APPROVED).select_related("user", "payout_account"):
            pr.status = PaymentRequestStatus.APPROVED
            pr.save(update_fields=["status", "updated_at"])
            n += 1
        self.message_user(request, f"{n} payment requests approved.", level=messages.SUCCESS)

    @admin.action(description="Reject selected payment requests")
    def reject_requests(self, request, queryset):
        n = 0
        for pr in queryset.exclude(status=PaymentRequestStatus.REJECTED).select_related("user", "payout_account"):
            pr.status = PaymentRequestStatus.REJECTED
            pr.save(update_fields=["status", "updated_at"])
            n += 1
        self.message_user(request, f"{n} payment requests rejected.", level=messages.WARNING)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "payout_account")


@admin.register(Product)
class ProductAdmin(BaseAdmin):
    form = ProductAdminForm
    list_display = ("id", "name", "sku", "category", "vendor", "selling_price", "stock", "is_active", "is_featured", "order_sort", "created_at")
    list_filter = ("is_active", "is_featured", "is_affiliation", "is_purchase_reward", "category", "vendor", "created_at")
    search_fields = ("id", "name", "sku", "short_description", "vendor__name", "category__name")
    autocomplete_fields = ("vendor", "category")
    inlines = (ProductImageInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("vendor", "category")


@admin.register(Sales)
class SalesAdmin(BaseAdmin):
    form = SalesAdminForm
    list_display = ("id", "user", "vendor", "total", "status", "payment_status", "payment_method", "created_at")
    list_filter = ("status", "payment_status", "payment_method", "created_at")
    search_fields = ("id", "user__username", "user__phone", "vendor__name")
    autocomplete_fields = ("vendor", "user", "address")
    inlines = (SalesItemInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("vendor", "user", "address")


@admin.register(Transaction)
class TransactionAdmin(BaseAdmin):
    list_display = ("id", "user", "amount", "transaction_type", "transaction_for", "status", "is_system", "created_at")
    list_filter = ("transaction_type", "transaction_for", "status", "is_system", "created_at")
    search_fields = ("id", "user__username", "user__phone", "remarks")
    autocomplete_fields = ("user",)
    actions = None

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(SystemSetting)
class SystemSettingAdmin(BaseAdmin):
    list_display = ("id", "balance", "minimum_withdrawal", "maximum_withdrawal", "is_withdrawal", "created_at")


@admin.register(City)
class CityAdmin(BaseAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("id", "name")


@admin.register(Package)
class PackageAdmin(BaseAdmin):
    list_display = ("id", "name", "amount", "discount", "created_at")
    search_fields = ("id", "name")
    inlines = (PackageProductInline,)


@admin.register(ShippingCharge)
class ShippingChargeAdmin(BaseAdmin):
    list_display = ("id", "city", "charge", "created_at")
    list_filter = ("city", "created_at")
    autocomplete_fields = ("city",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("city")


@admin.register(Address)
class AddressAdmin(BaseAdmin):
    list_display = ("id", "user", "name", "city", "country", "created_at")
    list_filter = ("country", "city", "created_at")
    search_fields = ("id", "user__username", "user__phone", "name", "address")
    autocomplete_fields = ("user", "city")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "city")


@admin.register(ProductCategory)
class ProductCategoryAdmin(BaseAdmin):
    list_display = ("id", "name", "parent", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("id", "name", "parent__name")
    autocomplete_fields = ("parent",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("parent")


@admin.register(Vendor)
class VendorAdmin(BaseAdmin):
    list_display = ("id", "name", "user", "phone", "payable", "receivable", "created_at")
    search_fields = ("id", "name", "phone", "user__phone")
    autocomplete_fields = ("user",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(ProductImage)
class ProductImageAdmin(BaseAdmin):
    list_display = ("id", "product", "created_at")
    autocomplete_fields = ("product",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("product")


@admin.register(Purchase)
class PurchaseAdmin(BaseAdmin):
    form = PurchaseAdminForm
    list_display = ("id", "vendor", "user", "total", "created_at")
    list_filter = ("created_at",)
    search_fields = ("id", "vendor__name", "user__phone")
    autocomplete_fields = ("vendor", "user")
    inlines = (PurchaseItemInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("vendor", "user")


@admin.register(PurchaseItem)
class PurchaseItemAdmin(BaseAdmin):
    list_display = ("id", "purchase", "product", "quantity", "total", "created_at")
    autocomplete_fields = ("purchase", "product")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("purchase", "product")


@admin.register(SalesItem)
class SalesItemAdmin(BaseAdmin):
    list_display = ("id", "sales", "product", "quantity", "total", "referred_by", "created_at")
    autocomplete_fields = ("sales", "product", "referred_by")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("sales", "product", "referred_by")


@admin.register(PaidRecord)
class PaidRecordAdmin(BaseAdmin):
    list_display = ("id", "name", "amount", "vendor", "user", "payment_method", "purchase", "created_at")
    list_filter = ("payment_method", "created_at")
    autocomplete_fields = ("vendor", "user", "purchase")

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("vendor", "user", "purchase")


@admin.register(ReceivedRecord)
class ReceivedRecordAdmin(BaseAdmin):
    list_display = ("id", "name", "amount", "vendor", "user", "payment_method", "sales", "created_at")
    list_filter = ("payment_method", "created_at")
    autocomplete_fields = ("vendor", "user", "sales")

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("vendor", "user", "sales")


@admin.register(Campaign)
class CampaignAdmin(BaseAdmin):
    list_display = ("id", "name", "status", "product", "commission_type", "commission", "created_at")
    list_filter = ("status", "commission_type", "created_at")
    search_fields = ("id", "name")
    autocomplete_fields = ("product",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("product")


@admin.register(CampaignSubmission)
class CampaignSubmissionAdmin(BaseAdmin):
    form = CampaignSubmissionAdminForm
    list_display = ("id", "campaign", "user", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("id", "campaign__name", "user__phone")
    autocomplete_fields = ("campaign", "user")
    inlines = (CampaignSubmissionProofInline,)
    actions = ("approve_submissions", "reject_submissions")

    @admin.action(description="Approve selected campaign submissions")
    def approve_submissions(self, request, queryset):
        count = 0
        errors = []
        for pk in queryset.values_list("pk", flat=True):
            try:
                approve_submission_with_reward(pk)
                count += 1
            except Exception as exc:  # noqa: BLE001 — surface per-row failures in admin
                errors.append(f"#{pk}: {exc}")
        if count:
            self.message_user(request, f"{count} submission(s) approved (rewards credited when applicable).", level=messages.SUCCESS)
        if errors:
            self.message_user(request, "Some rows failed: " + "; ".join(errors[:5]), level=messages.ERROR)

    @admin.action(description="Reject selected campaign submissions")
    def reject_submissions(self, request, queryset):
        n = 0
        for sub in queryset.exclude(status=SubmissionStatus.REJECTED).select_related("user", "campaign"):
            sub.status = SubmissionStatus.REJECTED
            sub.save(update_fields=["status", "updated_at"])
            n += 1
        self.message_user(request, f"{n} submissions rejected.", level=messages.WARNING)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("campaign", "user")


@admin.register(CampaignSubmissionProof)
class CampaignSubmissionProofAdmin(BaseAdmin):
    list_display = ("id", "campaign_submission", "title", "created_at")
    autocomplete_fields = ("campaign_submission",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("campaign_submission")


@admin.register(PackageProduct)
class PackageProductAdmin(BaseAdmin):
    list_display = ("id", "package", "product", "quantity", "total", "created_at")
    autocomplete_fields = ("package", "product")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("package", "product")


@admin.register(SystemWithdrawal)
class SystemWithdrawalAdmin(BaseAdmin):
    list_display = ("id", "amount", "status", "created_at")
    list_filter = ("status", "created_at")
    actions = ("approve_withdrawals", "reject_withdrawals")

    # Bulk actions use QuerySet.update() — no model save signals (no transactional user pushes).
    # Use the admin API or single-row edits if you need side effects tied to saves.

    @admin.action(description="Approve selected system withdrawals")
    def approve_withdrawals(self, request, queryset):
        updated = queryset.exclude(status=SystemWithdrawalStatus.APPROVED).update(status=SystemWithdrawalStatus.APPROVED)
        self.message_user(request, f"{updated} system withdrawals approved.", level=messages.SUCCESS)

    @admin.action(description="Reject selected system withdrawals")
    def reject_withdrawals(self, request, queryset):
        updated = queryset.exclude(status=SystemWithdrawalStatus.REJECTED).update(status=SystemWithdrawalStatus.REJECTED)
        self.message_user(request, f"{updated} system withdrawals rejected.", level=messages.WARNING)


@admin.register(ActivityLogs)
class ActivityLogsAdmin(BaseAdmin):
    list_display = ("id", "user", "is_guest", "event_name", "event_timestamp", "platform", "created_at")
    list_filter = ("is_guest", "platform", "event_name", "created_at")
    search_fields = ("id", "event_name", "session_id", "user__phone")
    autocomplete_fields = ("user",)
    actions = None

    readonly_fields = BaseAdmin.readonly_fields + (
        "user",
        "is_guest",
        "session_id",
        "session_start_time",
        "session_end_time",
        "session_duration",
        "session_number",
        "referrer_url",
        "device_type",
        "os_name",
        "os_version",
        "browser_name",
        "browser_version",
        "country",
        "region",
        "city",
        "timezone",
        "event_name",
        "event_timestamp",
        "event_value",
        "event_properties",
        "page_url",
        "page_path",
        "page_title",
        "scroll_depth",
        "time_on_page",
        "clicks_count",
        "platform",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(Banner)
class BannerAdmin(BaseAdmin):
    list_display = ('title', 'order', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title',)
    list_editable = ('order', 'is_active')


@admin.register(PushNotification)
class PushNotificationAdmin(BaseAdmin):
    list_display = ('title', 'created_at', 'updated_at')
    search_fields = ('title', 'message')
    filter_horizontal = ('receivers',)


@admin.register(SiteSetting)
class SiteSettingAdmin(BaseAdmin):
    list_display = ('name', 'phone', 'whatsapp', 'email', 'created_at')
    search_fields = ('name', 'email', 'phone')


@admin.register(CmsPage)
class CmsPageAdmin(BaseAdmin):
    list_display = ('name', 'slug', 'title', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug', 'title')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'created_at')
    search_fields = ('user__phone', 'user__name', 'product__name')
    readonly_fields = ('created_at',)
