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

# Per-tier character limit for post content and comments. StatZ is unlimited
# (blueprint: "StatZ users get expanded content, limits"); this is the
# platform-wide policy in apps.accounts.char_limit_for.
CHAR_LIMIT_DEFAULT = 1000


def char_limit_for(user):
    from apps.accounts.models import char_limit_for as _limit
    return _limit(user, CHAR_LIMIT_DEFAULT)  # None => unlimited (StatZ)


class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="postz")
    content = models.TextField()
    genre = models.CharField(max_length=40, blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    media_url = models.URLField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    view_count = models.PositiveIntegerField(default=0)
    comment_reward_settled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["-created_at"])]

    def __str__(self):
        return f"Post<{self.author}:{self.pk}>"


# Public visibility — pages are viewable without an account. Each unique view
# rewards the CONTENT OWNER Energy by THEIR tier (free +1 / premium +5 / statZ
# +20). Dedup is one reward per viewer (logged-in) or per anonymous IP, per post.
VIEW_REWARD = {"free": 1, "premium": 5, "statz": 20}


class PostView(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="viewz")
    key = models.CharField(max_length=80)  # "u:<user_id>" or "a:<ip_hash>"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "key")


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def record_view(post, request):
    """Count a unique view and reward the owner by their tier. Returns True if
    this was a new unique view (counted), False if a repeat."""
    import hashlib
    from apps.accounts.models import grant_energy

    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        key = f"u:{user.id}"
        is_owner = user.id == post.author_id
    else:
        ip = _client_ip(request)
        key = "a:" + hashlib.sha256(f"{ip}|mcz-view".encode()).hexdigest()[:40]
        is_owner = False

    _, created = PostView.objects.get_or_create(post=post, key=key)
    if not created:
        return False
    from django.db.models import F
    Post.objects.filter(pk=post.pk).update(view_count=F("view_count") + 1)
    post.view_count += 1
    if not is_owner:
        prof = getattr(post.author, "profile", None)
        grant_energy(post.author, VIEW_REWARD.get(getattr(prof, "tier", "free"), 1))
    return True


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
