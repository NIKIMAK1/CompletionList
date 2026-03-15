from django.contrib import admin

from apps.lists.models import GameEntry


@admin.register(GameEntry)
class GameEntryAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "platform", "status", "rating", "created_at")
    list_filter = ("status", "platform", "rating")
    search_fields = ("title", "platform", "owner__username")
