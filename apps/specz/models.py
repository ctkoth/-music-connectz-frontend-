"""SpecZ — user metadata/UGC attached to a target app.

A StatZ perk: purchasing a SpecZ costs SPEC_PRICE SpinaZ (debited atomically via
accounts.spend_spinaz). The price is a server constant — never trusted from the
client. `app` is validated against SPEC_APPS.
"""
from django.conf import settings
from django.db import models

SPEC_PRICE = 250

# Apps a SpecZ can attach to — kept in sync with SPEC_APPS in
# src/apps/socialData.js.
SPEC_APPS = [
    "PostZ", "BattleZ", "CollabZ", "SingZ", "RapZ", "LabelZ", "GroupZ",
    "Social ConnectZ", "LessonZ", "MessageZ",
]
SPEC_APPS_SET = set(SPEC_APPS)


class SpecEntry(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="specz")
    app = models.CharField(max_length=40)
    # SpecZ is a StatZ-only purchase, and StatZ is unlimited across all appz,
    # so label/value are TextFields with no hard cap.
    label = models.TextField()
    value = models.TextField()
    price_spinaz = models.PositiveIntegerField(default=SPEC_PRICE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"SpecZ<{self.owner}:{self.app}:{self.label}>"
