from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RapzProfile

FIELDS = ["top_styles","bpm_min","bpm_max","style_mastery","delivery_confidence","breath_control","writing_confidence"]


def _ser(p):
    d = {f: getattr(p, f) for f in FIELDS}
    d["boss_unlocked"] = p.boss_unlocked

    return d


class GameProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        p, _ = RapzProfile.objects.get_or_create(user=request.user)
        return Response(_ser(p))

    def patch(self, request):
        p, _ = RapzProfile.objects.get_or_create(user=request.user)
        data = request.data or {}
        for f in FIELDS:
            if f in data:
                setattr(p, f, data[f])
        if isinstance(p.top_styles, list):
            p.top_styles = p.top_styles[:3]
        p.save()
        return Response(_ser(p))
