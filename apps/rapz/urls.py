from django.urls import path

from .profile_views import GameProfileView
from .views import OverviewView

try:
    from apps.common.training import training_urlpatterns  # noqa
except Exception:  # pragma: no cover
    try:
        from apps.skillz.training import training_urlpatterns  # noqa
    except Exception:  # pragma: no cover
        def training_urlpatterns(app_key):
            return []

urlpatterns = [
    path("overview/", OverviewView.as_view(), name="rapz-overview"),
    path("profile/", GameProfileView.as_view(), name="rapz-profile"),
] + training_urlpatterns("rapz")
