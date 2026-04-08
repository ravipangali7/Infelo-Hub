from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_paymentrequest_withdrawal_wallet_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="campaignsubmission",
            name="reward_credited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
