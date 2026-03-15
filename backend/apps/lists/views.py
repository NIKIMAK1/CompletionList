from rest_framework import viewsets

from apps.lists.models import GameEntry
from apps.lists.serializers import GameEntrySerializer


class GameEntryViewSet(viewsets.ModelViewSet):
    serializer_class = GameEntrySerializer

    def get_queryset(self):
        return GameEntry.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
