from rest_framework.routers import DefaultRouter

from apps.lists.views import GameEntryViewSet


router = DefaultRouter()
router.register("games", GameEntryViewSet, basename="games")

urlpatterns = router.urls
