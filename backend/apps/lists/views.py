from rest_framework import viewsets

from apps.lists.models import GameEntry
from apps.lists.serializers import GameEntrySerializer


class GameEntryViewSet(viewsets.ModelViewSet):
    queryset = GameEntry.objects.all()
    serializer_class = GameEntrySerializer
