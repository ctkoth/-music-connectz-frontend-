"""CollabZ interest-note per-tier character limit (StatZ = unlimited)."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.accounts.models import Profile
from apps.collabz.models import CollabPost

User = get_user_model()


def _mk(name, tier="free"):
    u = User.objects.create_user(username=name, password="pw12345678")
    Profile.objects.create(user=u, tier=tier)
    return u


class CollabNoteLimitTests(APITestCase):
    def setUp(self):
        self.author = _mk("author")
        self.post = CollabPost.objects.create(author=self.author, title="Need a mixer")

    def test_free_note_capped_at_280(self):
        u = _mk("free")
        self.client.force_authenticate(u)
        r = self.client.post(f"/api/collabz/{self.post.id}/interest/",
                             {"note": "x" * 281}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_statz_note_unlimited(self):
        u = _mk("statz", tier="statz")
        self.client.force_authenticate(u)
        r = self.client.post(f"/api/collabz/{self.post.id}/interest/",
                             {"note": "x" * 5000}, format="json")
        self.assertEqual(r.status_code, 201)
