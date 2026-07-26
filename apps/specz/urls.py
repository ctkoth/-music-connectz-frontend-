from django.urls import path

from .views import SpecDetailView, SpecListCreateView

urlpatterns = [
    path("", SpecListCreateView.as_view(), name="specz-list"),
    path("<int:pk>/", SpecDetailView.as_view(), name="specz-detail"),
]
