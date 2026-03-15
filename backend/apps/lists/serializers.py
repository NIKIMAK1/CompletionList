from rest_framework import serializers

from apps.lists.models import GameEntry


class GameEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = GameEntry
        fields = ["id", "title", "platform", "status", "note", "created_at"]
