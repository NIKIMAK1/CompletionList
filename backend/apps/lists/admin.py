from django.contrib import admin

from apps.lists.models import GameEntry


@admin.register(GameEntry)
class GameEntryAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "platform", "status", "created_at")
    list_filter = ("status", "platform")
    search_fields = ("title", "platform", "owner__username")
