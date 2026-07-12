from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SQUASH_REWARD_SPINAZ, BugReport


def _ser(b):
    return {"id": b.id, "reporter": b.reporter.username, "title": b.title,
            "body": b.body, "status": b.status, "created_at": b.created_at}


class BugListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([_ser(b) for b in BugReport.objects.all()[:100]])

    def post(self, request):
        d = request.data or {}
        if not (d.get("title") or "").strip():
            return Response({"detail": "title required."}, status=400)
        b = BugReport.objects.create(reporter=request.user, title=d["title"].strip(),
                                     body=(d.get("body") or "").strip())
        return Response(_ser(b), status=201)


class BugStatusView(APIView):
    """Admins only (blueprint). Squashed pays the reporter 200 SpinAZ once."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            b = BugReport.objects.get(pk=pk)
        except BugReport.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        status_new = (request.data or {}).get("status")
        if status_new not in ("in_progress", "squashed", "open"):
            return Response({"detail": "status must be open/in_progress/squashed."}, status=400)
        b.status = status_new
        if status_new == "squashed" and not b.rewarded:
            try:
                from apps.accounts.models import Profile
                from django.db.models import F

                Profile.objects.filter(user=b.reporter).update(
                    spinaz=F("spinaz") + SQUASH_REWARD_SPINAZ)
                b.rewarded = True
            except Exception:
                pass
        b.save()
        return Response(_ser(b))
