from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

APP_KEY = "drumz"


class OverviewView(APIView):
    """DrumZ — teen-safe instrument training on the SkillZ engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "app_key": APP_KEY,
            "name": "DrumZ",
            "tagline": "Drum training — technique, timing, rudiments, chops & fills.",
            "teen_safe": True,
        })
