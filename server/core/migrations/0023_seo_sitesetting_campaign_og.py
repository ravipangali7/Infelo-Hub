from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0022_sitesetting_google_analytics_script'),
    ]

    operations = [
        migrations.AddField(
            model_name='campaign',
            name='og_share_description',
            field=models.TextField(blank=True, help_text='Optional. Social preview description when sharing this campaign.'),
        ),
        migrations.AddField(
            model_name='campaign',
            name='og_share_image',
            field=models.ImageField(
                blank=True,
                help_text='Optional. Overrides main campaign image for Open Graph / link previews.',
                null=True,
                upload_to='campaigns/og/',
            ),
        ),
        migrations.AddField(
            model_name='campaign',
            name='og_share_title',
            field=models.CharField(
                blank=True,
                help_text='Optional. Social preview title when sharing this campaign.',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_campaigns_list_meta_description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_campaigns_list_meta_keywords',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_campaigns_list_meta_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_campaigns_list_og_image',
            field=models.ImageField(blank=True, null=True, upload_to='site/seo/'),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_home_meta_description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_home_meta_keywords',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_home_meta_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_home_og_image',
            field=models.ImageField(blank=True, null=True, upload_to='site/seo/'),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_learn_meta_description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_learn_meta_keywords',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_learn_meta_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_learn_og_image',
            field=models.ImageField(blank=True, null=True, upload_to='site/seo/'),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_shop_meta_description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_shop_meta_keywords',
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_shop_meta_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='sitesetting',
            name='seo_shop_og_image',
            field=models.ImageField(blank=True, null=True, upload_to='site/seo/'),
        ),
    ]
