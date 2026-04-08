from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_campaignsubmission_reward_credited_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchase",
            name="payment_status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("paid", "Paid"), ("failed", "Failed")],
                default="pending",
                max_length=20,
            ),
        ),
    ]
