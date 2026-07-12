from django.conf import settings
from django.db import models

RAP_STYLES = ["boom-bap","trap","chopper","drill","conscious","emo","melodic","grime",
              "west-coast","east-coast","dirty-south","lofi","hyperpop","freestyle","battle","storytelling"]


class RapzProfile(models.Model):
    """Blueprint RapZ state model."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                related_name="rapz_profile")
    top_styles = models.JSONField(default=list, blank=True)      # up to 3 of RAP_STYLES
    bpm_min = models.PositiveSmallIntegerField(default=70)
    bpm_max = models.PositiveSmallIntegerField(default=95)
    style_mastery = models.JSONField(default=dict, blank=True)   # {"trap": 0-100, ...}
    delivery_confidence = models.PositiveSmallIntegerField(default=0)
    breath_control = models.PositiveSmallIntegerField(default=0)
    writing_confidence = models.PositiveSmallIntegerField(default=0)
    boss_unlocked = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
