"""PostZ — the community post feed (blueprint tab).

Timed community moderation windows, enforced server-side (the client countdowns
are UX only):

  * A post must be OPEN >= RATE_WINDOW_SEC (30s) before ANOTHER user may rate it.
    The poster may never rate their own post.
  * A post must be OPEN >= COMMENT_WINDOW_SEC (60s) before it may be commented on.

Ratings are a 1-10 scale, anonymous (rater identities never appear in any
payload), one per user per post (re-rating overwrites). Every first-time rating
grants the rater +1 Energy (blueprint: "every rating gives 1 energy"). The
deferred "comment earns median-rating Energy 1h later" reward is settled by the
`settle_comment_rewards` management command, not inline.
"""
from django.conf import settings
from django.db import models

RATE_WINDOW_SEC = 30
COMMENT_WINDOW_SEC = 60
MAX_STARS = 10

# Per-tier character limit for post content and comments. StatZ gets the
# expanded ceiling (blueprint: "StatZ users get expanded content, limits").
CHAR_LIMIT_DEFAULT = 1000
CHAR_LIMIT_STATZ = 50000


def char_limit_for(user):
    prof = getattr(user, "profile", None)
    return CHAR_LIMIT_STATZ if getattr(prof, "tier", "free") == "statz" else CHAR_LIMIT_DEFAULT


class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="postz")
    content = models.TextField()
    genre = models.CharField(max_length=40, blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    media_url = models.URLField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    comment_reward_settled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["-created_at"])]

    def __str__(self):
        return f"Post<{self.author}:{self.pk}>"


class Rating(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="postz_ratings")
    stars = models.PositiveSmallIntegerField()  # 1..MAX_STARS
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user")


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="postz_comments")
    # TextField (not CharField) so StatZ users can post up to CHAR_LIMIT_STATZ;
    # the per-tier ceiling is enforced in the view.
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
