from django.urls import path

from .views import CollabInterestView, CollabListCreateView

urlpatterns = [
    path("", CollabListCreateView.as_view(), name="collabz-list"),
    path("<int:pk>/interest/", CollabInterestView.as_view(), name="collabz-interest"),
]
