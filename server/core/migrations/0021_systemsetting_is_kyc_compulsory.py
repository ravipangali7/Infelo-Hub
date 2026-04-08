from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_city_district_province'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsetting',
            name='is_kyc_compulsory',
            field=models.BooleanField(
                default=True,
                help_text='When enabled, users must have approved KYC to create withdrawal requests.',
            ),
        ),
    ]
