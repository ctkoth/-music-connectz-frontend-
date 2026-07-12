from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SingzProfile

FIELDS = ["detected_low","detected_high","goal_low","goal_high","safe_low","safe_high","fatigue_risk","cooldown_compliance"]


def _ser(p):
    d = {f: getattr(p, f) for f in FIELDS}
    d["boss_unlocked"] = p.boss_unlocked
    d["range_work_allowed"] = p.range_work_allowed
    return d


class GameProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        p, _ = SingzProfile.objects.get_or_create(user=request.user)
        return Response(_ser(p))

    def patch(self, request):
        p, _ = SingzProfile.objects.get_or_create(user=request.user)
        data = request.data or {}
        for f in FIELDS:
            if f in data:
                setattr(p, f, data[f])

        p.save()
        return Response(_ser(p))
