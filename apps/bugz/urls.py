from django.urls import path

from .views import BugListCreateView, BugStatusView

urlpatterns = [
    path("", BugListCreateView.as_view(), name="bugz-list"),
    path("<int:pk>/status/", BugStatusView.as_view(), name="bugz-status"),
]
