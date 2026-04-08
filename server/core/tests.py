from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from core.models import (
    User,
    OtpVerification,
    OtpPurpose,
    SmsLog,
    Product,
    Sales,
    SalesItem,
    SalesStatus,
    PaymentStatus,
    DiscountType,
)
from core.sales_rewards import try_credit_sales_rewards


class AuthOtpFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.phone = "9812345678"

    @patch("core.views.auth_views.send_sms")
    def test_register_flow_creates_user_only_after_verified_otp(self, mock_send_sms):
        res = self.client.post("/api/auth/register/request-otp/", {"phone": self.phone}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(User.objects.filter(phone=self.phone).exists())

        otp = OtpVerification.objects.filter(phone=self.phone, purpose=OtpPurpose.REGISTER).latest("id")
        verify = self.client.post("/api/auth/register/verify-otp/", {"phone": self.phone, "otp": otp.otp_code}, format="json")
        self.assertEqual(verify.status_code, 200)

        complete = self.client.post(
            "/api/auth/register/complete/",
            {"phone": self.phone, "name": "Test User", "password": "Abcd@123", "confirm_password": "Abcd@123"},
            format="json",
        )
        self.assertEqual(complete.status_code, 201)
        self.assertTrue(User.objects.filter(phone=self.phone).exists())
        mock_send_sms.assert_called()

    @patch("core.views.auth_views.send_sms")
    def test_forgot_password_requires_verified_otp(self, mock_send_sms):
        user = User.objects.create_user(phone=self.phone, password="Old@1234")
        res = self.client.post("/api/auth/forgot-password/request-otp/", {"phone": user.phone}, format="json")
        self.assertEqual(res.status_code, 200)

        reset_without_verify = self.client.post(
            "/api/auth/forgot-password/reset/",
            {"phone": user.phone, "password": "New@1234", "confirm_password": "New@1234"},
            format="json",
        )
        self.assertEqual(reset_without_verify.status_code, 400)

        otp = OtpVerification.objects.filter(phone=user.phone, purpose=OtpPurpose.FORGOT_PASSWORD).latest("id")
        verify = self.client.post("/api/auth/forgot-password/verify-otp/", {"phone": user.phone, "otp": otp.otp_code}, format="json")
        self.assertEqual(verify.status_code, 200)

        reset = self.client.post(
            "/api/auth/forgot-password/reset/",
            {"phone": user.phone, "password": "New@1234", "confirm_password": "New@1234"},
            format="json",
        )
        self.assertEqual(reset.status_code, 200)
        self.assertGreaterEqual(mock_send_sms.call_count, 1)


class SmsLogModelTests(TestCase):
    def test_sms_log_persists_payload(self):
        row = SmsLog.objects.create(phone="9800000000", purpose=OtpPurpose.REGISTER, status="success", response_payload={"ok": True})
        self.assertEqual(row.phone, "9800000000")
        self.assertEqual(row.response_payload.get("ok"), True)


class SalesDeferredRewardsTests(TestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(phone="9811111111", password="Test@1234")
        self.affiliate = User.objects.create_user(phone="9822222222", password="Test@1234")
        self.product = Product.objects.create(
            name="Affiliate SKU",
            is_affiliation=True,
            affiliation_reward_type=DiscountType.FLAT,
            affiliation_reward=Decimal("40"),
            stock=20,
            selling_price=Decimal("200"),
        )

    def test_try_credit_no_wallet_until_paid_and_delivered(self):
        sale = Sales.objects.create(
            user=self.buyer,
            deferred_reward_settlement=True,
            status=SalesStatus.PENDING,
            payment_status=PaymentStatus.PENDING,
            subtotal=Decimal("200"),
            total=Decimal("200"),
        )
        SalesItem.objects.create(
            sales=sale,
            product=self.product,
            selling_price=Decimal("200"),
            quantity=1,
            total=Decimal("200"),
            referred_by=self.affiliate,
            reward=Decimal("40"),
        )
        try_credit_sales_rewards(sale.pk)
        self.affiliate.refresh_from_db()
        self.buyer.refresh_from_db()
        self.assertEqual(self.affiliate.earning_wallet, Decimal("0"))
        self.assertEqual(self.buyer.earning_wallet, Decimal("0"))

        sale.payment_status = PaymentStatus.PAID
        sale.status = SalesStatus.DELIVERED
        sale.save()
        try_credit_sales_rewards(sale.pk)
        self.affiliate.refresh_from_db()
        self.assertEqual(self.affiliate.earning_wallet, Decimal("40"))
        item = sale.items.get()
        self.assertIsNotNone(item.rewards_credited_at)

    def test_legacy_sale_skips_deferred_settlement(self):
        sale = Sales.objects.create(
            user=self.buyer,
            deferred_reward_settlement=False,
            status=SalesStatus.DELIVERED,
            payment_status=PaymentStatus.PAID,
            subtotal=Decimal("200"),
            total=Decimal("200"),
        )
        SalesItem.objects.create(
            sales=sale,
            product=self.product,
            selling_price=Decimal("200"),
            quantity=1,
            total=Decimal("200"),
            referred_by=self.affiliate,
            reward=Decimal("40"),
        )
        try_credit_sales_rewards(sale.pk)
        self.affiliate.refresh_from_db()
        self.assertEqual(self.affiliate.earning_wallet, Decimal("0"))
