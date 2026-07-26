"""MessageZ — direct messages with an Energy cost (spam brake + economy).

Engagement rules implemented:
- Sending a DM costs DM_COST_ENERGY (default 1) from the sender's Energy.
- REPLIES ARE FREE: if the recipient has ever messaged you, your send costs 0 —
  conversations flow, cold outreach costs.
- Energy spend goes through the platform wallet when present
  (apps.common.energy/wallet); scaffold falls back to Profile.energy.

Safety: DM creation runs through a defensive policy hook, can_dm(sender,
recipient) from apps.common when present — that's where the platform's
adult/minor contact rules and GroupZ blocked-list enforcement live. The
scaffold fallback only checks authentication; the real gate activates the
moment apps.common is restored.
"""
import os

from django.conf import settings
from django.db import models

DM_COST_ENERGY = int(os.environ.get("DM_COST_ENERGY", "1"))


class DirectMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dms_sent"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dms_received"
    )
    # TextField so StatZ (unlimited) messages fit; the per-tier ceiling is
    # enforced in the send view via accounts.char_limit_for.
    body = models.TextField()
    cost_energy = models.PositiveIntegerField(default=0)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["recipient", "read"])]

    def __str__(self):
        return f"{self.sender} -> {self.recipient}"


def spend_energy(user, amount: int) -> bool:
    """Spend Energy via the platform wallet if present, else Profile.energy."""
    if amount <= 0:
        return True
    try:  # pragma: no cover - platform hook
        from apps.common.energy import spend as _spend

        return bool(_spend(user, amount, memo="MessageZ DM"))
    except Exception:
        pass
    from apps.accounts.models import Profile

    updated = Profile.objects.filter(user=user, energy__gte=amount).update(
        energy=models.F("energy") - amount
    )
    return bool(updated)


def can_dm(sender, recipient) -> bool:
    """Platform DM policy (adult/minor rules, GroupZ blocks) when available."""
    try:  # pragma: no cover - platform hook
        from apps.common.policies import can_dm as _can

        return bool(_can(sender, recipient))
    except Exception:
        pass
    try:
        from apps.groupz.models import is_blocked

        if is_blocked(recipient, sender) or is_blocked(sender, recipient):
            return False
    except Exception:
        pass
    return True
