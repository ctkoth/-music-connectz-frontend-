from django.urls import path

from .views import InboxView, SendView

urlpatterns = [
    path("send/", SendView.as_view(), name="messagez-send"),
    path("inbox/", InboxView.as_view(), name="messagez-inbox"),
]
