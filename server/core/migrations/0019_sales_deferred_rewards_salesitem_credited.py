from django.db import migrations, models


def set_legacy_sales_no_deferred(apps, schema_editor):
    Sales = apps.get_model('core', 'Sales')
    Sales.objects.all().update(deferred_reward_settlement=False)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_product_order_sort'),
    ]

    operations = [
        migrations.AddField(
            model_name='sales',
            name='deferred_reward_settlement',
            field=models.BooleanField(
                default=True,
                help_text='When True, affiliate and buyer purchase rewards settle when paid+delivered. False for legacy sales already credited at creation.',
            ),
        ),
        migrations.AddField(
            model_name='salesitem',
            name='rewards_credited_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(set_legacy_sales_no_deferred, migrations.RunPython.noop),
    ]
