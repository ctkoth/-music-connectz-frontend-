"""Social ConnectZ — creator discovery filterable by NationalitieZ heritage.

The nationality filter runs in Python so it works identically on SQLite (local
tests) and Postgres (prod); JSONField `__contains` isn't supported on SQLite.
Scan is bounded to the most-recently-seen profiles.
"""
from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Profile

from .models import PERSONA_ICON

ONLINE_WINDOW_MIN = 5
SCAN_CAP = 500


def _ser(prof, me, online_cutoff):
    personas = prof.personas or []
    persona = personas[0] if personas else "creator"
    return {
        "user": prof.user.username,
        "persona": persona,
        "icon": PERSONA_ICON.get(persona, "personaz.png"),
        "nationalities": prof.nationalities or [],
        "tier": prof.tier,
        "online": bool(prof.last_seen and prof.last_seen >= online_cutoff),
        "is_self": prof.user_id == me.id,
    }


class MemberDirectoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qp = request.query_params
        nat = (qp.get("nationality") or "").strip()
        q = (qp.get("q") or "").strip().lower()
        try:
            limit = min(max(int(qp.get("limit", 30)), 1), 100)
        except ValueError:
            limit = 30
        try:
            offset = max(int(qp.get("offset", 0)), 0)
        except ValueError:
            offset = 0

        rows = list(
            Profile.objects.select_related("user")
            .filter(user__is_active=True)
            .order_by("-last_seen")[:SCAN_CAP]
        )

        def keep(p):
            if nat and nat not in (p.nationalities or []):
                return False
            if q:
                hay = (p.user.username + " " + " ".join(p.personas or [])).lower()
                if q not in hay:
                    return False
            return True

        rows = [p for p in rows if keep(p)]
        total = len(rows)
        page = rows[offset:offset + limit]
        cutoff = timezone.now() - timedelta(minutes=ONLINE_WINDOW_MIN)
        return Response({
            "count": total,
            "results": [_ser(p, request.user, cutoff) for p in page],
        })
