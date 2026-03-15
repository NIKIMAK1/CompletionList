from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.lists.igdb import (
    IGDBConfigurationError,
    IGDBRequestError,
    discover_games,
    get_game_details,
    search_games,
)
from apps.lists.models import GameEntry
from apps.lists.serializers import GameEntrySerializer


class GameEntryViewSet(viewsets.ModelViewSet):
    serializer_class = GameEntrySerializer

    def get_queryset(self):
        return GameEntry.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class IGDBSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response([], status=status.HTTP_200_OK)

        try:
            return Response(search_games(query))
        except IGDBConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except IGDBRequestError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class IGDBDiscoverView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            return Response(discover_games())
        except IGDBConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except IGDBRequestError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class IGDBGameDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, identifier: str):
        try:
            game = get_game_details(identifier)
            if game is None:
                return Response({"detail": "Game not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(game)
        except IGDBConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except IGDBRequestError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
