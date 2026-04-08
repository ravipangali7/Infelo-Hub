from django.db import migrations, models


def backfill_order_sort(apps, schema_editor):
    Product = apps.get_model("core", "Product")
    for i, p in enumerate(Product.objects.order_by("id")):
        Product.objects.filter(pk=p.pk).update(order_sort=i)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_product_is_featured"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="order_sort",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(backfill_order_sort, noop_reverse),
    ]
