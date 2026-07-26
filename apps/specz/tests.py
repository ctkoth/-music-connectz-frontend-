"""SpecZ tests — StatZ gating, SpinaZ debit, ownership."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.accounts.models import Profile
from apps.specz.models import SPEC_PRICE, SpecEntry

User = get_user_model()


def _mkuser(name, tier="free", spinaz=1000):
    u = User.objects.create_user(username=name, password="pw12345678")
    Profile.objects.create(user=u, tier=tier, spinaz=spinaz)
    return u


class SpecZTests(APITestCase):
    def test_non_statz_cannot_buy(self):
        u = _mkuser("free", tier="free")
        self.client.force_authenticate(u)
        r = self.client.post("/api/specz/",
                            {"app": "PostZ", "label": "BPM", "value": "140"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_statz_insufficient_spinaz(self):
        u = _mkuser("broke", tier="statz", spinaz=SPEC_PRICE - 1)
        self.client.force_authenticate(u)
        r = self.client.post("/api/specz/",
                            {"app": "PostZ", "label": "BPM", "value": "140"}, format="json")
        self.assertEqual(r.status_code, 402)

    def test_statz_unknown_app(self):
        u = _mkuser("s1", tier="statz")
        self.client.force_authenticate(u)
        r = self.client.post("/api/specz/",
                            {"app": "Nope", "label": "x", "value": "y"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_statz_purchase_debits_spinaz(self):
        u = _mkuser("rich", tier="statz", spinaz=1000)
        self.client.force_authenticate(u)
        r = self.client.post("/api/specz/",
                            {"app": "PostZ", "label": "Preferred BPM", "value": "140-150"},
                            format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["spinaz"], 1000 - SPEC_PRICE)
        self.assertEqual(r.data["spec"]["app"], "PostZ")
        u.profile.refresh_from_db()
        self.assertEqual(u.profile.spinaz, 1000 - SPEC_PRICE)
        # And it shows up in the owner's list.
        lst = self.client.get("/api/specz/")
        self.assertEqual(len(lst.data), 1)

    def test_delete_only_own(self):
        owner = _mkuser("owner", tier="statz")
        other = _mkuser("other", tier="statz")
        spec = SpecEntry.objects.create(owner=owner, app="PostZ", label="a", value="b")
        # other can't delete it
        self.client.force_authenticate(other)
        self.assertEqual(self.client.delete(f"/api/specz/{spec.id}/").status_code, 404)
        # owner can
        self.client.force_authenticate(owner)
        self.assertEqual(self.client.delete(f"/api/specz/{spec.id}/").status_code, 204)
        self.assertFalseIfExists(spec.id)

    def assertFalseIfExists(self, pk):
        self.assertFalse(SpecEntry.objects.filter(pk=pk).exists())
