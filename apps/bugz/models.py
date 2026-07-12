"""BugZ 🐞 — submit bug as a post; admins set status. Squashed 🪦 = +200 SpinAZ."""
from django.conf import settings
from django.db import models

STATUS = [("open","Open"),("in_progress","In Progress 💭"),("squashed","Squashed 🪦")]
SQUASH_REWARD_SPINAZ = 200


class BugReport(models.Model):
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bug_reports")
    title = models.CharField(max_length=140)
    body = models.TextField(blank=True, default="")
    status = models.CharField(max_length=12, choices=STATUS, default="open")
    rewarded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
