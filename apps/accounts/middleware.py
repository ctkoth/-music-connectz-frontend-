"""Update Profile.last_seen at most once per minute for authenticated requests."""
from django.utils import timezone


class PresenceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            user = getattr(request, "user", None)
            if user and user.is_authenticated:
                from .models import Profile

                now = timezone.now()
                prof, _ = Profile.objects.get_or_create(user=user)
                if not prof.last_seen or (now - prof.last_seen).total_seconds() > 60:
                    Profile.objects.filter(pk=prof.pk).update(last_seen=now)
        except Exception:
            pass
        return response
