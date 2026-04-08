from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_systemsetting_is_kyc_compulsory'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesetting',
            name='google_analytics_script',
            field=models.TextField(
                blank=True,
                help_text='Paste the full Google Analytics snippet (script tags). Injected on the public site and admin panel.',
            ),
        ),
    ]
