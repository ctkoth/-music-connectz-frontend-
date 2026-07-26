"""CollabZ — collaborate locally/globally (blueprint tab).

Kinds map to the blueprint's modal apps: original (+OriginalZ), cover (+CoverZ),
remix (+RemixeZ). Distance discovery reuses the LessonZ haversine pattern.
Contact happens through MessageZ, so the platform's can_dm policy (blocked
lists, adult/minor rules) governs all outreach.
"""
from django.conf import settings
from django.db import models

KIND_CHOICES = [("original", "OriginalZ"), ("cover", "CoverZ"), ("remix", "RemixeZ")]


class CollabPost(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="collab_posts")
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default="original")
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True, default="")
    roles_needed = models.JSONField(default=list, blank=True)   # persona keys
    skill = models.CharField(max_length=60, blank=True, default="")
    city = models.CharField(max_length=80, blank=True, default="")
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    remote_ok = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)


class CollabInterest(models.Model):
    post = models.ForeignKey(CollabPost, on_delete=models.CASCADE, related_name="interests")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                             related_name="collab_interests")
    # TextField so StatZ (unlimited) notes fit; the per-tier ceiling is enforced
    # in the view via accounts.char_limit_for.
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user")
