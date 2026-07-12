from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

APP_KEY = "singz"


class OverviewView(APIView):
    """SingZ — blueprint game loop on the SkillZ engine. Safety rule honored:
    recovery/health drills never gate behind tier, and strain warnings would
    override progression (enforced fully once apps.common analytics land)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"app_key": APP_KEY, "name": "SingZ", "tagline": "Vocal training game — pitch, breath, range, and Boss SongZ.", "teen_safe": True})
