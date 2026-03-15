from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.lists.views import GameEntryViewSet, IGDBDiscoverView, IGDBGameDetailView, IGDBSearchView


router = DefaultRouter()
router.register("games", GameEntryViewSet, basename="games")

urlpatterns = [
    path("igdb/search/", IGDBSearchView.as_view(), name="igdb-search"),
    path("igdb/discover/", IGDBDiscoverView.as_view(), name="igdb-discover"),
    path("igdb/game/<str:identifier>/", IGDBGameDetailView.as_view(), name="igdb-game-detail"),
    *router.urls,
]
