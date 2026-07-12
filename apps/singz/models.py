from django.conf import settings
from django.db import models


class SingzProfile(models.Model):
    """Blueprint SingZ state model. Voice health first: recovery overrides progression."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="singz_profile")
    detected_low = models.CharField(max_length=4, blank=True, default="")
    detected_high = models.CharField(max_length=4, blank=True, default="")
    goal_low = models.CharField(max_length=4, blank=True, default="")
    goal_high = models.CharField(max_length=4, blank=True, default="")
    safe_low = models.CharField(max_length=4, blank=True, default="")
    safe_high = models.CharField(max_length=4, blank=True, default="")
    fatigue_risk = models.PositiveSmallIntegerField(default=0)     # >=70 pauses range work
    cooldown_compliance = models.PositiveSmallIntegerField(default=100)
    boss_unlocked = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def range_work_allowed(self):
        return self.fatigue_risk < 70
