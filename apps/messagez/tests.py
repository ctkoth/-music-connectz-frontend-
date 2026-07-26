"""MessageZ per-tier character limit (StatZ = unlimited)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.accounts.models import Profile

User = get_user_model()


def _mk(name, tier="free", energy=100):
    u = User.objects.create_user(username=name, password="pw12345678")
    Profile.objects.create(user=u, tier=tier, energy=energy)
    return u


class MessageLimitTests(APITestCase):
    def test_free_user_capped_at_1000(self):
        s, _r = _mk("sender"), _mk("recip")
        self.client.force_authenticate(s)
        resp = self.client.post("/api/messagez/send/",
                               {"to": "recip", "body": "x" * 1001}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_statz_user_unlimited(self):
        s, _r = _mk("sender2", tier="statz"), _mk("recip2")
        self.client.force_authenticate(s)
        resp = self.client.post("/api/messagez/send/",
                               {"to": "recip2", "body": "x" * 5000}, format="json")
        self.assertEqual(resp.status_code, 201)
