from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_otp_sms_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsetting',
            name='app_current_version',
            field=models.CharField(blank=True, default='1', max_length=32),
        ),
        migrations.AddField(
            model_name='systemsetting',
            name='android_file',
            field=models.FileField(blank=True, null=True, upload_to='system/android/'),
        ),
    ]
