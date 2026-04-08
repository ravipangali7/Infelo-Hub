"""Django forms (admin login and admin model forms)."""
import re
from decimal import Decimal

from django import forms
from django.contrib.admin.forms import AdminAuthenticationForm
from django.core.exceptions import ValidationError

from .models import (
    CampaignSubmission,
    CommissionType,
    DiscountType,
    KycStatus,
    PaymentRequest,
    PaymentRequestStatus,
    PaymentRequestType,
    Product,
    Purchase,
    Sales,
    SubmissionStatus,
    SystemSetting,
    User,
)


class StaffPhoneAdminAuthenticationForm(AdminAuthenticationForm):
    """
    Normalize phone the same way as API login (strip + digits only) so
    admin login matches stored User.USERNAME_FIELD ('phone').
    """

    def clean_phone(self):
        value = self.cleaned_data.get("phone")
        if value is None:
            return value
        return re.sub(r"\D", "", str(value).strip())


class UserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = "__all__"

    def clean_phone(self):
        value = self.cleaned_data.get("phone")
        if not value:
            raise ValidationError("Phone is required.")
        return re.sub(r"\D", "", str(value).strip())

    def clean(self):
        cleaned_data = super().clean()
        kyc_status = cleaned_data.get("kyc_status")
        reject_reason = (cleaned_data.get("kyc_reject_reason") or "").strip()
        if kyc_status == KycStatus.REJECTED and not reject_reason:
            self.add_error("kyc_reject_reason", "Reject reason is required when KYC is rejected.")
        return cleaned_data


class ProductAdminForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = "__all__"

    def _validate_discount_block(self, *, enabled, value, kind, value_field, type_field):
        if enabled:
            if not kind:
                self.add_error(type_field, "Type is required when this reward/discount is enabled.")
            if value is None or value < 0:
                self.add_error(value_field, "Value must be zero or greater.")
            if kind == DiscountType.PERCENTAGE and value is not None and value > Decimal("100"):
                self.add_error(value_field, "Percentage cannot be greater than 100.")
        elif value and value > 0:
            self.add_error(value_field, "Set this to 0 when the related toggle is disabled.")

    def clean(self):
        cleaned_data = super().clean()

        self._validate_discount_block(
            enabled=cleaned_data.get("is_affiliation"),
            value=cleaned_data.get("affiliation_reward"),
            kind=cleaned_data.get("affiliation_reward_type"),
            value_field="affiliation_reward",
            type_field="affiliation_reward_type",
        )
        self._validate_discount_block(
            enabled=cleaned_data.get("is_purchase_reward"),
            value=cleaned_data.get("purchase_reward"),
            kind=cleaned_data.get("purchase_reward_type"),
            value_field="purchase_reward",
            type_field="purchase_reward_type",
        )

        discount_type = cleaned_data.get("discount_type")
        discount = cleaned_data.get("discount")
        if discount and discount > 0 and not discount_type:
            self.add_error("discount_type", "Discount type is required when discount is greater than 0.")
        if discount_type == DiscountType.PERCENTAGE and discount is not None and discount > Decimal("100"):
            self.add_error("discount", "Discount percentage cannot be greater than 100.")
        if cleaned_data.get("selling_price") is not None and cleaned_data.get("selling_price") < 0:
            self.add_error("selling_price", "Selling price cannot be negative.")
        if cleaned_data.get("purchasing_price") is not None and cleaned_data.get("purchasing_price") < 0:
            self.add_error("purchasing_price", "Purchasing price cannot be negative.")
        return cleaned_data


class PaymentRequestAdminForm(forms.ModelForm):
    class Meta:
        model = PaymentRequest
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        request_type = cleaned_data.get("type")
        amount = cleaned_data.get("amount")
        status = cleaned_data.get("status")
        payout_account = cleaned_data.get("payout_account")
        reject_reason = (cleaned_data.get("reject_reason") or "").strip()
        paid_date_time = cleaned_data.get("paid_date_time")

        if amount is None or amount <= 0:
            self.add_error("amount", "Amount must be greater than 0.")

        if request_type == PaymentRequestType.WITHDRAW and not payout_account:
            self.add_error("payout_account", "Payout account is required for withdrawals.")
        if request_type == PaymentRequestType.DEPOSIT and payout_account:
            self.add_error("payout_account", "Payout account should not be set for deposits.")

        if status == PaymentRequestStatus.REJECTED and not reject_reason:
            self.add_error("reject_reason", "Reject reason is required when request is rejected.")
        if status == PaymentRequestStatus.APPROVED and request_type == PaymentRequestType.DEPOSIT and not paid_date_time:
            self.add_error("paid_date_time", "Paid date/time is required when deposit is approved.")

        setting = SystemSetting.objects.order_by("-id").first()
        if setting and amount is not None:
            if request_type == PaymentRequestType.WITHDRAW:
                if amount < setting.minimum_withdrawal:
                    self.add_error("amount", f"Amount cannot be less than minimum withdrawal ({setting.minimum_withdrawal}).")
                if amount > setting.maximum_withdrawal:
                    self.add_error("amount", f"Amount cannot be greater than maximum withdrawal ({setting.maximum_withdrawal}).")
            if request_type == PaymentRequestType.DEPOSIT:
                if amount < setting.minimum_deposit:
                    self.add_error("amount", f"Amount cannot be less than minimum deposit ({setting.minimum_deposit}).")
                if amount > setting.maximum_deposit:
                    self.add_error("amount", f"Amount cannot be greater than maximum deposit ({setting.maximum_deposit}).")

        return cleaned_data


class SalesAdminForm(forms.ModelForm):
    class Meta:
        model = Sales
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        subtotal = cleaned_data.get("subtotal") or Decimal("0")
        discount = cleaned_data.get("discount") or Decimal("0")
        shipping = cleaned_data.get("shipping_charge") or Decimal("0")
        total = cleaned_data.get("total")
        payment_status = cleaned_data.get("payment_status")
        payment_method = cleaned_data.get("payment_method")

        if any(v < 0 for v in [subtotal, discount, shipping]):
            raise ValidationError("Subtotal, discount and shipping charge cannot be negative.")
        if total is not None and total < 0:
            self.add_error("total", "Total cannot be negative.")
        if payment_status and str(payment_status).lower() == "paid" and not payment_method:
            self.add_error("payment_method", "Payment method is required when payment status is paid.")
        return cleaned_data


class PurchaseAdminForm(forms.ModelForm):
    class Meta:
        model = Purchase
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        subtotal = cleaned_data.get("subtotal") or Decimal("0")
        discount = cleaned_data.get("discount") or Decimal("0")
        total = cleaned_data.get("total")

        if subtotal < 0 or discount < 0:
            raise ValidationError("Subtotal and discount cannot be negative.")
        if total is not None and total < 0:
            self.add_error("total", "Total cannot be negative.")
        return cleaned_data


class CampaignSubmissionAdminForm(forms.ModelForm):
    class Meta:
        model = CampaignSubmission
        fields = "__all__"

    def clean(self):
        cleaned_data = super().clean()
        status = cleaned_data.get("status")
        reject_reason = (cleaned_data.get("reject_reason") or "").strip()
        if status == SubmissionStatus.REJECTED and not reject_reason:
            self.add_error("reject_reason", "Reject reason is required when submission is rejected.")
        return cleaned_data
