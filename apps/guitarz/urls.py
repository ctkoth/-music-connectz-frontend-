from django.urls import path

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
    path("overview/", OverviewView.as_view(), name="guitarz-overview"),
] + training_urlpatterns("guitarz")
