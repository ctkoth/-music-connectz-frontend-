"""SpecZ API — list / purchase / delete user metadata.

Purchase is gated to the StatZ tier and charges SPEC_PRICE SpinaZ atomically.
Follows the repo's plain-APIView + hand-rolled `_ser()` convention.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Profile, spend_spinaz

from .models import SPEC_APPS_SET, SPEC_PRICE, SpecEntry


def _ser(s):
    return {
        "id": s.id,
        "app": s.app,
        "label": s.label,
        "value": s.value,
        "price": s.price_spinaz,
        "bought_at": s.created_at,
    }


class SpecListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = SpecEntry.objects.filter(owner=request.user)
        return Response([_ser(s) for s in rows])

    def post(self, request):
        prof = getattr(request.user, "profile", None)
        tier = getattr(prof, "tier", "free")
        if tier != "statz":
            return Response({"detail": "SpecZ is a StatZ perk."}, status=403)

        d = request.data or {}
        app = (d.get("app") or "").strip()
        label = (d.get("label") or "").strip()
        value = (d.get("value") or "").strip()
        if app not in SPEC_APPS_SET:
            return Response({"detail": "Unknown target app."}, status=400)
        if not label or not value:
            return Response({"detail": "label and value are required."}, status=400)

        if not spend_spinaz(request.user, SPEC_PRICE):
            return Response({"detail": "Not enough SpinaZ."}, status=402)

        spec = SpecEntry.objects.create(
            owner=request.user, app=app, label=label[:80], value=value[:280],
            price_spinaz=SPEC_PRICE)
        # Return the fresh balance so the UI can update immediately.
        new_balance = Profile.objects.values_list("spinaz", flat=True).get(user=request.user)
        return Response({"spec": _ser(spec), "spinaz": new_balance}, status=201)


class SpecDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = SpecEntry.objects.filter(pk=pk, owner=request.user).delete()
        if not deleted:
            return Response({"detail": "SpecZ not found."}, status=404)
        return Response(status=204)
