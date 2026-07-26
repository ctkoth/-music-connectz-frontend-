"""Social ConnectZ tests — NationalitieZ filter + profile heritage write."""
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.accounts.models import Profile

User = get_user_model()


def _mkuser(name, nationalities=None, personas=None):
    u = User.objects.create_user(username=name, password="pw12345678")
    Profile.objects.create(user=u, nationalities=nationalities or [],
                           personas=personas or [])
    return u


class SocialTests(APITestCase):
    def setUp(self):
        self.me = _mkuser("me", nationalities=["American"], personas=["producer"])
        _mkuser("nova", nationalities=["Nigerian", "Jamaican"], personas=["producer"])
        _mkuser("sol", nationalities=["Mexican"], personas=["indieartist"])
        _mkuser("kx", nationalities=["Nigerian"], personas=["ghostwriter"])

    def test_directory_lists_all(self):
        self.client.force_authenticate(self.me)
        r = self.client.get("/api/social/members/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 4)
        me_row = next(x for x in r.data["results"] if x["user"] == "me")
        self.assertTrue(me_row["is_self"])
        nova = next(x for x in r.data["results"] if x["user"] == "nova")
        self.assertEqual(nova["icon"], "personaz_producer.png")

    def test_filter_by_nationality(self):
        self.client.force_authenticate(self.me)
        r = self.client.get("/api/social/members/?nationality=Nigerian")
        users = {x["user"] for x in r.data["results"]}
        self.assertEqual(users, {"nova", "kx"})

    def test_search_q(self):
        self.client.force_authenticate(self.me)
        r = self.client.get("/api/social/members/?q=sol")
        self.assertEqual([x["user"] for x in r.data["results"]], ["sol"])

    def test_pagination(self):
        self.client.force_authenticate(self.me)
        r = self.client.get("/api/social/members/?limit=2")
        self.assertEqual(r.data["count"], 4)
        self.assertEqual(len(r.data["results"]), 2)

    # ---- profile heritage write (accounts.MeView PATCH) ---------------
    def test_patch_me_saves_valid_nationalities(self):
        self.client.force_authenticate(self.me)
        r = self.client.patch("/api/auth/me/",
                              {"nationalities": ["Irish", "Korean", "NotAReal"]},
                              format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["nationalities"], ["Irish", "Korean"])  # bogus dropped

    def test_patch_me_dedupes_and_caps(self):
        self.client.force_authenticate(self.me)
        many = ["Irish", "Irish", "Korean", "French", "German", "Italian",
                "Spanish", "Greek", "Polish", "Russian", "Dutch", "Turkish"]
        r = self.client.patch("/api/auth/me/", {"nationalities": many}, format="json")
        self.assertEqual(len(r.data["nationalities"]), 10)      # capped at 10
        self.assertEqual(r.data["nationalities"].count("Irish"), 1)  # deduped
