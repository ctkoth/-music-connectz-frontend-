import re

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OAuthIdentity, Profile, daily_refill, touch_presence
from .oauth import CODE_EXCHANGERS, OAuthError, verify_apple, verify_google
from .serializers import (
    LoginSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    issue_tokens,
)

User = get_user_model()


def _unique_username(base):
    base = re.sub(r"[^a-zA-Z0-9_.-]", "", (base or "user")).strip(".-_") or "user"
    candidate = base[:140]
    i = 1
    while User.objects.filter(username__iexact=candidate).exists():
        candidate = f"{base[:140]}{i}"
        i += 1
    return candidate


def _user_from_oauth(info):
    """Find-or-create a user from a verified OAuth payload, return (user)."""
    identity = OAuthIdentity.objects.filter(
        provider=info["provider"], provider_uid=info["uid"]
    ).first()
    if identity:
        return identity.user

    user = None
    if info.get("email"):
        user = User.objects.filter(email__iexact=info["email"]).first()

    if not user:
        base = info.get("name") or (info["email"].split("@")[0] if info.get("email") else info["provider"])
        user = User.objects.create_user(
            username=_unique_username(base),
            email=info.get("email", ""),
        )
        user.set_unusable_password()
        user.save()

    Profile.objects.get_or_create(
        user=user, defaults={"avatar_url": info.get("avatar_url", "")}
    )
    OAuthIdentity.objects.get_or_create(
        provider=info["provider"],
        provider_uid=info["uid"],
        defaults={"user": user, "email": info.get("email", "")},
    )
    return user


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = issue_tokens(user)
        return Response(
            {"user": PublicUserSerializer(user).data, **tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        tokens = issue_tokens(user)
        return Response({"user": PublicUserSerializer(user).data, **tokens})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        touch_presence(request.user)
        return Response(self._payload(request.user))

    @staticmethod
    def _payload(user):
        data = PublicUserSerializer(user).data
        # Re-fetch the profile so a PATCH in the same request reflects the saved
        # row (the reverse `user.profile` may be cached with pre-save values).
        prof = Profile.objects.filter(user=user).first()
        if prof:
            data.update({
                "energy": prof.energy, "spinaz": prof.spinaz, "tier": prof.tier,
                "zodiac": prof.zodiac, "birthday": prof.birthday, "personas": prof.personas,
                "nationalities": prof.nationalities,
            })
        return data

    def patch(self, request):
        """Update identity: birthday and personaZ roles (tier is admin/billing only)."""
        prof, _ = Profile.objects.get_or_create(user=request.user)
        data = request.data or {}
        if "birthday" in data:
            from datetime import date
            try:
                prof.birthday = date.fromisoformat(data["birthday"]) if data["birthday"] else None
            except ValueError:
                return Response({"detail": "birthday must be YYYY-MM-DD."}, status=400)
        if "personas" in data:
            allowed = {"arscout","designer","developer","director","ghostwriter",
                       "indieartist","manager","mime","mixengineer","producer","videographer"}
            personas = [p for p in (data["personas"] or []) if p in allowed]
            prof.personas = personas[:11]
        if "nationalities" in data:
            from .models import ALLOWED_NATIONALITIES_SET
            nats, seen = [], set()
            for n in (data["nationalities"] or []):
                if n in ALLOWED_NATIONALITIES_SET and n not in seen:
                    seen.add(n)
                    nats.append(n)
            prof.nationalities = nats[:10]
        prof.save()
        return Response(self._payload(request.user))


ONLINE_WINDOW_MIN = 5


class StatsView(APIView):
    """Community stats for the Home screen. Auth required (touches presence)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        touch_presence(request.user)
        refilled = daily_refill(request.user)
        cutoff = timezone.now() - timedelta(minutes=ONLINE_WINDOW_MIN)
        online_qs = Profile.objects.filter(last_seen__gte=cutoff).select_related("user")
        prof = getattr(request.user, "profile", None)
        return Response({
            "my_tier": getattr(prof, "tier", "free") if prof else "free",
            "my_spinaz": getattr(prof, "spinaz", 0) if prof else 0,
            "my_zodiac": getattr(prof, "zodiac", "") if prof else "",
            "total_members": User.objects.filter(is_active=True).count(),
            "online_now": online_qs.count(),
            # presence is shown as usernames only — no last-seen timestamps leak
            "online_members": [p.user.username for p in online_qs.order_by("-last_seen")[:12]],
            "my_energy": getattr(prof, "energy", 0) if prof else 0,
            "refilled_today": refilled,
        })


class OAuthConfigView(APIView):
    """GET /api/auth/oauth/config/ — which social providers are configured on the
    server, with their PUBLIC client IDs. Lets the frontend render only working
    buttons without any VITE_* build-time env vars."""

    permission_classes = [AllowAny]

    def get(self, request):
        from .oauth import public_oauth_config
        return Response({"providers": public_oauth_config()})


class OAuthLoginView(APIView):
    """POST /api/auth/oauth/<provider>/ — verify provider token, return JWT."""

    permission_classes = [AllowAny]

    def post(self, request, provider):
        data = request.data or {}
        try:
            if provider == "google":
                info = verify_google(data.get("credential") or data.get("id_token"))
            elif provider == "apple":
                info = verify_apple(data.get("id_token") or data.get("credential"))
            elif provider in CODE_EXCHANGERS:
                info = CODE_EXCHANGERS[provider](
                    data.get("code"),
                    data.get("redirect_uri", ""),
                    data.get("code_verifier", ""),
                )
            else:
                return Response(
                    {"detail": f"Unsupported provider '{provider}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except OAuthError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        user = _user_from_oauth(info)
        tokens = issue_tokens(user)
        return Response({"user": PublicUserSerializer(user).data, **tokens})


# ------------------------------------------------------- Password recovery
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings as dj_settings
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

GENERIC_MSG = (
    "If an account matches that username, email, or phone, a reset link has "
    "been sent to its email address."
)


class ForgotPasswordView(APIView):
    """POST {identifier} — email a reset link. Response is ALWAYS generic so
    attackers can't probe which accounts exist."""

    permission_classes = [AllowAny]

    def post(self, request):
        ident = ((request.data or {}).get("identifier") or "").strip()
        if not ident:
            return Response({"detail": "identifier is required."}, status=400)
        user = (
            User.objects.filter(
                Q(username__iexact=ident) | Q(email__iexact=ident) | Q(profile__phone=ident)
            ).distinct().first()
        )
        if user and user.email:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{dj_settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            try:
                send_mail(
                    "Reset your Music ConnectZ password",
                    f"Hey {user.username},\n\nTap to set a new password:\n{link}\n\n"
                    "The link expires soon. If you didn't ask for this, ignore it.",
                    None,
                    [user.email],
                    fail_silently=True,
                )
            except Exception:
                pass
        return Response({"detail": GENERIC_MSG})


class ResetPasswordView(APIView):
    """POST {uid, token, new_password} — set a new password, return fresh JWT."""

    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data or {}
        uid, token = data.get("uid", ""), data.get("token", "")
        new_password = data.get("new_password", "")
        if len(new_password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=400)
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except Exception:
            return Response({"detail": "That reset link is invalid."}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "That reset link is invalid or expired."}, status=400)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        tokens = issue_tokens(user)
        return Response({"user": PublicUserSerializer(user).data, **tokens})
