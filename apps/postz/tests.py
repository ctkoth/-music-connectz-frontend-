"""PostZ API tests — windows, authorization, currency, feed.

Posts are backdated with a queryset .update() (bypassing auto_now_add) to
simulate age without real waits.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Profile
from apps.postz.models import Comment, Post, Rating

User = get_user_model()


def _mkuser(name, energy=100):
    u = User.objects.create_user(username=name, password="pw12345678")
    Profile.objects.create(user=u, energy=energy)
    return u


def _age(post, seconds):
    """Force the post to look `seconds` old."""
    Post.objects.filter(pk=post.pk).update(
        created_at=timezone.now() - timedelta(seconds=seconds))
    post.refresh_from_db()
    return post


class PostZTests(APITestCase):
    def setUp(self):
        self.author = _mkuser("author")
        self.rater = _mkuser("rater", energy=100)

    # ---- create / list -------------------------------------------------
    def test_create_requires_content(self):
        self.client.force_authenticate(self.author)
        r = self.client.post("/api/postz/", {"content": "  "}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_create_and_list(self):
        self.client.force_authenticate(self.author)
        r = self.client.post("/api/postz/",
                             {"content": "8 bars", "genre": "Drill", "skills": ["FL Studio"]},
                             format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["author"], "author")
        self.assertTrue(r.data["is_mine"])
        lst = self.client.get("/api/postz/")
        self.assertEqual(lst.status_code, 200)
        self.assertEqual(len(lst.data), 1)

    # ---- rating windows / rules ---------------------------------------
    def _post(self, age=0):
        p = Post.objects.create(author=self.author, content="rate me")
        return _age(p, age) if age else p

    def test_rate_before_30s_conflicts(self):
        p = self._post(age=10)
        self.client.force_authenticate(self.rater)
        r = self.client.post(f"/api/postz/{p.id}/rate/", {"stars": 8}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertIn("20s", r.data["detail"])

    def test_rate_own_post_forbidden(self):
        p = self._post(age=60)
        self.client.force_authenticate(self.author)
        r = self.client.post(f"/api/postz/{p.id}/rate/", {"stars": 8}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_rate_out_of_range(self):
        p = self._post(age=60)
        self.client.force_authenticate(self.rater)
        for bad in (0, 11, -3):
            r = self.client.post(f"/api/postz/{p.id}/rate/", {"stars": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)

    def test_valid_rate_awards_energy_and_updates_avg(self):
        p = self._post(age=40)
        self.client.force_authenticate(self.rater)
        r = self.client.post(f"/api/postz/{p.id}/rate/", {"stars": 9}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["avg_rating"], 9)
        self.assertEqual(r.data["rating_count"], 1)
        self.assertEqual(r.data["my_rating"], 9)
        self.rater.profile.refresh_from_db()
        self.assertEqual(self.rater.profile.energy, 101)  # +1

    def test_re_rate_overwrites_without_extra_energy(self):
        p = self._post(age=40)
        self.client.force_authenticate(self.rater)
        self.client.post(f"/api/postz/{p.id}/rate/", {"stars": 5}, format="json")
        r = self.client.post(f"/api/postz/{p.id}/rate/", {"stars": 10}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["avg_rating"], 10)
        self.assertEqual(r.data["rating_count"], 1)       # still one rating
        self.rater.profile.refresh_from_db()
        self.assertEqual(self.rater.profile.energy, 101)  # only paid once

    def test_ratings_are_anonymous(self):
        p = self._post(age=40)
        self.client.force_authenticate(self.rater)
        r = self.client.post(f"/api/postz/{p.id}/rate/", {"stars": 7}, format="json")
        # No rater identity anywhere in the payload.
        self.assertNotIn("ratings", r.data)
        self.assertNotIn("rater", str(r.data))

    # ---- comment windows ----------------------------------------------
    def test_comment_before_60s_conflicts(self):
        p = self._post(age=45)
        self.client.force_authenticate(self.rater)
        r = self.client.post(f"/api/postz/{p.id}/comment/", {"text": "hard"}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertIn("15s", r.data["detail"])

    def test_comment_after_60s_ok(self):
        p = self._post(age=61)
        self.client.force_authenticate(self.rater)
        r = self.client.post(f"/api/postz/{p.id}/comment/", {"text": "hard"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["comment_count"], 1)
        self.assertEqual(r.data["comments"][-1]["user"], "rater")

    def test_comment_requires_text(self):
        p = self._post(age=61)
        self.client.force_authenticate(self.rater)
        r = self.client.post(f"/api/postz/{p.id}/comment/", {"text": "   "}, format="json")
        self.assertEqual(r.status_code, 400)

    # ---- per-tier character limit -------------------------------------
    def test_free_user_char_limit_1000(self):
        p = self._post(age=61)
        self.client.force_authenticate(self.rater)  # free tier
        r = self.client.post(f"/api/postz/{p.id}/comment/", {"text": "x" * 1001}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_statz_user_char_limit_50000(self):
        statz = _mkuser("statz")
        statz.profile.tier = "statz"
        statz.profile.save()
        p = self._post(age=61)
        self.client.force_authenticate(statz)
        # 1001 chars — blocked for free, allowed for StatZ
        r = self.client.post(f"/api/postz/{p.id}/comment/", {"text": "x" * 1001}, format="json")
        self.assertEqual(r.status_code, 201)
        # 50001 chars — over the StatZ ceiling
        r2 = self.client.post(f"/api/postz/{p.id}/comment/", {"text": "y" * 50001}, format="json")
        self.assertEqual(r2.status_code, 400)

    def test_statz_post_content_50000(self):
        statz = _mkuser("statz2")
        statz.profile.tier = "statz"
        statz.profile.save()
        self.client.force_authenticate(statz)
        r = self.client.post("/api/postz/", {"content": "z" * 20000}, format="json")
        self.assertEqual(r.status_code, 201)

    # ---- deferred reward job ------------------------------------------
    def test_settle_comment_rewards(self):
        from django.core.management import call_command
        p = self._post(age=3700)  # > 1h old
        Rating.objects.create(post=p, user=self.rater, stars=8)
        commenter = _mkuser("commenter", energy=100)
        Comment.objects.create(post=p, user=commenter, text="fire")
        call_command("settle_comment_rewards")
        commenter.profile.refresh_from_db()
        self.assertEqual(commenter.profile.energy, 108)   # +median(8)
        p.refresh_from_db()
        self.assertTrue(p.comment_reward_settled)
