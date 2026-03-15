from django.conf import settings
from django.db import models


class GameEntry(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Планирую"
        PLAYING = "playing", "Играю"
        COMPLETED = "completed", "Прошел"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_entries",
        null=True,
        blank=True,
    )
    igdb_id = models.PositiveIntegerField(null=True, blank=True)
    title = models.CharField(max_length=255)
    platform = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    cover_url = models.URLField(blank=True)
    release_year = models.PositiveSmallIntegerField(null=True, blank=True)
    genres = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    rating = models.PositiveSmallIntegerField(default=0)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"
