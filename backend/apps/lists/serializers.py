from rest_framework import serializers

from apps.lists.models import GameEntry


class GameEntrySerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = GameEntry
        fields = ["id", "title", "platform", "status", "note", "created_at", "owner_username"]
