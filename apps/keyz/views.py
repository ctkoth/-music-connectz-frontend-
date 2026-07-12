from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

APP_KEY = "keyz"


class OverviewView(APIView):
    """KeyZ — teen-safe instrument training on the SkillZ engine."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "app_key": APP_KEY,
            "name": "KeyZ",
            "tagline": "Keyboard training — hands, chords, scales, reading, repertoire.",
            "teen_safe": True,
        })
