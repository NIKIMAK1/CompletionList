from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lists", "0003_gameentry_cover_url_gameentry_rating"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameentry",
            name="genres",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="gameentry",
            name="igdb_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gameentry",
            name="release_year",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gameentry",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
