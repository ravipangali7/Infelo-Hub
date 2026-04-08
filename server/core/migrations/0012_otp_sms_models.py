from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_add_product_slug"),
    ]

    operations = [
        migrations.AddField(
            model_name="systemsetting",
            name="sms_api_key",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="systemsetting",
            name="sms_sender_id",
            field=models.CharField(blank=True, default="SMSBit", max_length=50),
        ),
        migrations.CreateModel(
            name="OtpVerification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone", models.CharField(db_index=True, max_length=20)),
                ("purpose", models.CharField(choices=[("register", "Register"), ("forgot_password", "Forgot Password")], max_length=30)),
                ("otp_code", models.CharField(max_length=6)),
                ("expires_at", models.DateTimeField()),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("resend_count", models.PositiveSmallIntegerField(default=0)),
                ("last_sent_at", models.DateTimeField(auto_now_add=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="SmsLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone", models.CharField(db_index=True, max_length=20)),
                ("purpose", models.CharField(choices=[("register", "Register"), ("forgot_password", "Forgot Password")], max_length=30)),
                ("message", models.TextField(blank=True)),
                ("provider", models.CharField(default="samaye", max_length=50)),
                ("status", models.CharField(default="failed", max_length=20)),
                ("response_payload", models.JSONField(blank=True, default=dict)),
                ("consumed_units", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
