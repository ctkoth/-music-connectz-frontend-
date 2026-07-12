from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

APP_KEY = "bassz"


class OverviewView(APIView):
    """BassZ — teen-safe instrument training on the SkillZ engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "app_key": APP_KEY,
            "name": "BassZ",
            "tagline": "Bass training — groove, fingerstyle, slap, locking with drums.",
            "teen_safe": True,
        })
