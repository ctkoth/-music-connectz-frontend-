from django.urls import path

from .views import GroupListView, GroupMemberView

urlpatterns = [
    path("", GroupListView.as_view(), name="groupz-list"),
    path("<int:pk>/<str:action>/", GroupMemberView.as_view(), name="groupz-member"),
]
