from django.urls import path

from .views import (PostCommentView, PostDetailView, PostListCreateView,
                    PostRateView)

urlpatterns = [
    path("", PostListCreateView.as_view(), name="postz-list"),
    path("<int:pk>/", PostDetailView.as_view(), name="postz-detail"),
    path("<int:pk>/rate/", PostRateView.as_view(), name="postz-rate"),
    path("<int:pk>/comment/", PostCommentView.as_view(), name="postz-comment"),
]
