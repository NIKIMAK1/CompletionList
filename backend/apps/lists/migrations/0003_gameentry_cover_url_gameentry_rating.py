from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lists", "0002_gameentry_owner"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameentry",
            name="cover_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="gameentry",
            name="rating",
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
