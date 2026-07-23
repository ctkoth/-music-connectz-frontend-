"""
Profile extends the default Django User without swapping AUTH_USER_MODEL
(swapping mid-project is risky). Phone lives here; username/email/password
stay on User. OAuth links are stored so a Google/GitHub/Apple login maps back
to the same account on return visits.
"""
from django.conf import settings
from django.db import models


class Profile(models.Model):
    PROVIDER_PASSWORD = "password"
    PROVIDER_GOOGLE = "google"
    PROVIDER_GITHUB = "github"
    PROVIDER_APPLE = "apple"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    phone = models.CharField(max_length=32, blank=True, default="", db_index=True)
    avatar_url = models.URLField(blank=True, default="")
    last_seen = models.DateTimeField(null=True, blank=True, db_index=True)
    energy = models.PositiveIntegerField(default=100)   # dual currency: Energy (actions)
    spinaz = models.PositiveIntegerField(default=25)    # dual currency: SpinaZ (premium spins)
    TIER_FREE, TIER_PREMIUM, TIER_STATZ = "free", "premium", "statz"
    tier = models.CharField(max_length=10, default=TIER_FREE,
                            choices=[(TIER_FREE, "Free"), (TIER_PREMIUM, "Premium"), (TIER_STATZ, "StatZ")])
    birthday = models.DateField(null=True, blank=True)
    personas = models.JSONField(default=list, blank=True)  # e.g. ["producer","ghostwriter"]
    nationalities = models.JSONField(default=list, blank=True)  # NationalitieZ heritage
    last_refill = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    ZODIAC = [((1,20),"Capricorn"),((2,19),"Aquarius"),((3,21),"Pisces"),((4,20),"Aries"),
              ((5,21),"Taurus"),((6,21),"Gemini"),((7,23),"Cancer"),((8,23),"Leo"),
              ((9,23),"Virgo"),((10,23),"Libra"),((11,22),"Scorpio"),((12,22),"Sagittarius"),
              ((12,32),"Capricorn")]

    @property
    def zodiac(self):
        """ZodiacZ — auto-detected from birthday (blueprint signature feature)."""
        if not self.birthday:
            return ""
        m, d = self.birthday.month, self.birthday.day
        for (zm, zd), sign in self.ZODIAC:
            if (m, d) <= (zm, zd - 1) if False else (m < zm or (m == zm and d < zd)):
                return sign
        return "Capricorn"

    def __str__(self):
        return f"Profile<{self.user}>"


class OAuthIdentity(models.Model):
    """A verified third-party identity linked to a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="oauth_identities",
    )
    provider = models.CharField(max_length=20)
    provider_uid = models.CharField(max_length=191)
    email = models.EmailField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("provider", "provider_uid")
        verbose_name_plural = "OAuth identities"

    def __str__(self):
        return f"{self.provider}:{self.provider_uid}"


def grant_energy(user, amount):
    """Additive Energy award (PostZ ratings, comment-reward job, etc.).
    Uses an F() update so concurrent awards don't clobber each other."""
    from django.db.models import F

    if not amount:
        return 0
    try:
        Profile.objects.filter(user=user).update(energy=F("energy") + amount)
    except Exception:
        return 0
    return amount


def char_limit_for(user, default=1000):
    """Platform-wide per-tier character ceiling, applied across all appz.
    StatZ is unlimited (returns None); every other tier gets `default`."""
    prof = getattr(user, "profile", None)
    return None if getattr(prof, "tier", "free") == "statz" else default


def spend_spinaz(user, amount):
    """Atomic SpinaZ debit (SpecZ purchases). Returns True only if the balance
    covered the cost — the WHERE spinaz>=amount makes it race-safe."""
    from django.db.models import F

    updated = Profile.objects.filter(user=user, spinaz__gte=amount).update(
        spinaz=F("spinaz") - amount)
    return bool(updated)


# NationalitieZ — user-selected heritage/ancestry. Kept in sync with the
# frontend list in src/apps/socialData.js; used to validate profile writes and
# to power the Social ConnectZ heritage filter.
ALLOWED_NATIONALITIES = [
    "African American", "Nigerian", "Ghanaian", "Ethiopian", "South African",
    "Kenyan", "Egyptian", "Moroccan", "American", "Canadian", "Mexican",
    "Brazilian", "Jamaican", "Haitian", "Dominican", "Puerto Rican", "Cuban",
    "Colombian", "Argentine", "Peruvian", "British", "Irish", "French",
    "German", "Italian", "Spanish", "Portuguese", "Greek", "Polish",
    "Ukrainian", "Russian", "Swedish", "Dutch", "Turkish", "Israeli",
    "Lebanese", "Saudi", "Iranian", "Indian", "Pakistani", "Bangladeshi",
    "Chinese", "Japanese", "Korean", "Vietnamese", "Filipino", "Thai",
    "Indonesian", "Australian", "Māori / NZ", "Pacific Islander",
    "Native American",
]
ALLOWED_NATIONALITIES_SET = set(ALLOWED_NATIONALITIES)

REFILL_BY_TIER = {"free": 25, "premium": 50, "statz": 100}


def daily_refill(user):
    """Accrual v1: once/day energy += tier amount. Replaced by the blueprint's
    follower-median hourly accrual when external account linking ships."""
    from django.utils import timezone

    try:
        prof, _ = Profile.objects.get_or_create(user=user)
        today = timezone.localdate()
        if prof.last_refill != today:
            from django.db.models import F

            amount = REFILL_BY_TIER.get(prof.tier, 25)
            Profile.objects.filter(pk=prof.pk).update(
                energy=F("energy") + amount, last_refill=today)
            return amount
    except Exception:
        pass
    return 0


def touch_presence(user):
    """Mark user online now (throttled to 1/min). Safe to call anywhere."""
    from django.utils import timezone

    try:
        now = timezone.now()
        prof, _ = Profile.objects.get_or_create(user=user)
        if not prof.last_seen or (now - prof.last_seen).total_seconds() > 60:
            Profile.objects.filter(pk=prof.pk).update(last_seen=now)
    except Exception:
        pass
