from rest_framework import serializers

from apps.lists.models import GameEntry


class GameEntrySerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = GameEntry
        fields = [
            "id",
            "igdb_id",
            "title",
            "platform",
            "status",
            "cover_url",
            "release_year",
            "genres",
            "tags",
            "rating",
            "note",
            "created_at",
            "owner_username",
        ]

    def validate_rating(self, value):
        if not 0 <= value <= 10:
            raise serializers.ValidationError("Оценка должна быть от 0 до 10.")
        return value
