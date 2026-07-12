from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

APP_KEY = "guitarz"


class OverviewView(APIView):
    """GuitarZ — teen-safe instrument training on the SkillZ engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "app_key": APP_KEY,
            "name": "GuitarZ",
            "tagline": "Guitar training — chords, strumming, riffs, lead.",
            "teen_safe": True,
        })
