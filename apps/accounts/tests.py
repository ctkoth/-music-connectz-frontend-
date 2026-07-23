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
