"""Auth tests — OAuth config endpoint + registration (birthday → ZodiacZ)."""
import os
from unittest import mock

from rest_framework.test import APITestCase


class OAuthConfigTests(APITestCase):
    def test_empty_when_nothing_configured(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            for k in list(os.environ):
                if k.endswith("_OAUTH_CLIENT_ID"):
                    os.environ.pop(k, None)
            r = self.client.get("/api/auth/oauth/config/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["providers"], [])

    def test_lists_only_configured_providers_with_public_ids(self):
        with mock.patch.dict(os.environ, {
            "GOOGLE_OAUTH_CLIENT_ID": "goog-123.apps",
            "GITHUB_OAUTH_CLIENT_ID": "gh-abc",
        }, clear=False):
            r = self.client.get("/api/auth/oauth/config/")
        keys = {p["key"]: p["client_id"] for p in r.data["providers"]}
        self.assertEqual(keys.get("google"), "goog-123.apps")
        self.assertEqual(keys.get("github"), "gh-abc")
        # No secrets are ever exposed in the payload.
        self.assertNotIn("secret", str(r.data).lower())

    def test_config_is_public(self):
        # No auth header — endpoint must be reachable pre-login.
        r = self.client.get("/api/auth/oauth/config/")
        self.assertEqual(r.status_code, 200)


class RegisterTests(APITestCase):
    def test_register_sets_birthday_and_zodiac(self):
        r = self.client.post("/api/auth/register/", {
            "username": "zodiacuser", "email": "z@x.com",
            "password": "pw12345678", "birthday": "1994-08-15",
        }, format="json")
        self.assertEqual(r.status_code, 201)
        me = self.client.get("/api/auth/me/",
                             HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(str(me.data["birthday"]), "1994-08-15")
        self.assertEqual(me.data["zodiac"], "Leo")  # Aug 15


class ReferralTests(APITestCase):
    def _register(self, username, email, ref=None):
        body = {"username": username, "email": email, "password": "pw12345678"}
        if ref:
            body["ref"] = ref
        return self.client.post("/api/auth/register/", body, format="json")

    def test_legit_join_rewards_both_sides(self):
        from apps.accounts.models import Profile
        self._register("hostz", "h@x.com")
        base = Profile.objects.get(user__username="hostz").spinaz
        r = self._register("newbie", "n@x.com", ref="hostz")
        # referrer +300
        self.assertEqual(Profile.objects.get(user__username="hostz").spinaz, base + 300)
        # invited user gets the +100 welcome bonus on top of the signup default
        joinee = Profile.objects.get(user__username="newbie")
        self.assertEqual(joinee.spinaz, 25 + 100)

    def test_referrals_endpoint_lists_members(self):
        h = self._register("host2", "h2@x.com")
        self._register("m1", "m1@x.com", ref="host2")
        self._register("m2", "m2@x.com", ref="host2")
        r = self.client.get("/api/auth/referrals/",
                           HTTP_AUTHORIZATION=f"Bearer {h.data['access']}")
        self.assertEqual(r.data["code"], "host2")
        self.assertEqual(r.data["reward_per_join"], 300)
        self.assertEqual(r.data["count"], 2)
        self.assertEqual(r.data["spinaz_earned"], 600)
        self.assertEqual({m["username"] for m in r.data["members"]}, {"m1", "m2"})

    def test_unknown_ref_code_is_ignored(self):
        r = self._register("solo", "s@x.com", ref="doesnotexist")
        self.assertEqual(r.status_code, 201)  # join still succeeds

    def test_same_email_sybil_blocked(self):
        from apps.accounts.models import Profile, Referral
        self._register("sybil", "same@x.com")
        base = Profile.objects.get(user__username="sybil").spinaz
        self._register("friend", "friend@x.com", ref="sybil")
        self.assertEqual(Profile.objects.get(user__username="sybil").spinaz, base + 300)
        self.assertTrue(Referral.objects.filter(referred__username="friend").exists())


class OnboardCompleteTests(APITestCase):
    def _register(self, username, email):
        return self.client.post("/api/auth/register/", {
            "username": username, "email": email, "password": "pw12345678",
        }, format="json")

    def test_complete_grants_once(self):
        from apps.accounts.models import Profile
        r = self._register("obuser", "ob@x.com")
        auth = {"HTTP_AUTHORIZATION": f"Bearer {r.data['access']}"}
        base = Profile.objects.get(user__username="obuser")
        s0, e0 = base.spinaz, base.energy

        first = self.client.post("/api/auth/onboard/complete/", **auth)
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.data["granted"])
        self.assertEqual(first.data["spinaz"], s0 + 150)
        self.assertEqual(first.data["energy"], e0 + 50)

        # Second call is idempotent — no double reward.
        second = self.client.post("/api/auth/onboard/complete/", **auth)
        self.assertFalse(second.data["granted"])
        self.assertEqual(second.data["spinaz"], s0 + 150)

    def test_me_exposes_onboarded_flag(self):
        r = self._register("obuser2", "ob2@x.com")
        auth = {"HTTP_AUTHORIZATION": f"Bearer {r.data['access']}"}
        self.assertFalse(self.client.get("/api/auth/me/", **auth).data["onboarded"])
        self.client.post("/api/auth/onboard/complete/", **auth)
        self.assertTrue(self.client.get("/api/auth/me/", **auth).data["onboarded"])
