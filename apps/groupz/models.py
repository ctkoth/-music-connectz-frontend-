"""GroupZ — user-local groups (blueprint): Friends 🙂 Fans 👋🏽 Partners 👏🏽
Blocked 🤚🏽 Custom ❓. Blocked feeds the MessageZ can_dm policy."""
from django.conf import settings
from django.db import models

KIND_CHOICES = [("friends","Friends"),("fans","Fans"),("partners","Partners"),
                ("blocked","Blocked"),("custom","Custom")]


class Group(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="groupz")
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    title = models.CharField(max_length=60, blank=True, default="")  # custom only
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="in_groupz", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("kind", "title")

    def __str__(self):
        return f"{self.owner}:{self.kind}:{self.title or ''}"


def is_blocked(owner, other) -> bool:
    return Group.objects.filter(owner=owner, kind="blocked", members=other).exists()
