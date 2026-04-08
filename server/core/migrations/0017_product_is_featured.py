from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_transactional_push_and_stock_threshold"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="is_featured",
            field=models.BooleanField(default=False),
        ),
    ]
