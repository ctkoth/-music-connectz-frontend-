from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

APP_KEY = "violinz"


class OverviewView(APIView):
    """ViolinZ — teen-safe instrument training on the SkillZ engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "app_key": APP_KEY,
            "name": "ViolinZ",
            "tagline": "Violin training — posture, bowing, intonation, repertoire.",
            "teen_safe": True,
        })
