from django.urls import path

from .views import MemberDirectoryView

urlpatterns = [
    path("members/", MemberDirectoryView.as_view(), name="social-members"),
]
