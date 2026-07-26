from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (ForgotPasswordView, LoginView, MeView, OAuthConfigView,
                    OAuthLoginView, OnboardCompleteView, ReferralView,
                    RegisterView, ResetPasswordView, StatsView)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("referrals/", ReferralView.as_view(), name="auth-referrals"),
    path("onboard/complete/", OnboardCompleteView.as_view(), name="auth-onboard-complete"),
    # config/ must precede oauth/<provider>/ so it isn't captured as a provider.
    path("oauth/config/", OAuthConfigView.as_view(), name="auth-oauth-config"),
    path("oauth/<str:provider>/", OAuthLoginView.as_view(), name="auth-oauth"),
    path("password/forgot/", ForgotPasswordView.as_view(), name="auth-forgot"),
    path("password/reset/", ResetPasswordView.as_view(), name="auth-reset"),
    path("stats/", StatsView.as_view(), name="auth-stats"),
]
