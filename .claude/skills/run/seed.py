# Seed data for driving the app. Idempotent — re-run for a clean slate.
#
#   cd $MCZ_BACKEND && python manage.py shell < .claude/skills/run/seed.py
#
# The one thing to keep right: a persona skill's `name` must be the KEY the
# picker stores (`any_daw`, `protools`), never a human label. `post_cost_cents`
# matches on that name, so seeding "Drums" makes every price silently come out
# zero — the ⚡ and money you are trying to look at just never appear, and the
# screen reads as broken rather than as mis-seeded. Keys: src/personaSkills.js
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.economy.models import VenueBooking, VenueEvent, profile_for, wallet_for

User = get_user_model()
PASSWORD = "pw12345!"


def member(name, skills, energy=3000):
    u = User.objects.filter(username=name).first()
    if not u:
        u = User.objects.create_user(username=name, email=f"{name}@x.test")
    # Always re-set: a password hashed by an older run (or a different hasher)
    # verifies as "Incorrect password", which looks like the wrong credentials.
    u.set_password(PASSWORD)
    u.save()

    p = profile_for(u)
    p.personas = [{"key": "main", "name": "Main", "skills": [
        {"name": k, "rate_cents": c} for k, c in skills.items()
    ]}]
    p.save()

    w = wallet_for(u)
    w.energy = energy
    w.save()
    return u


host = member("hostie", {"any_daw": 5000, "protools": 3000})
me = member("corey", {"any_daw": 1200, "ableton": 800, "protools": 1500})

VenueBooking.objects.filter(event__host__in=[host, me]).delete()
VenueEvent.objects.filter(host__in=[host, me]).delete()

now = timezone.now()
# One of each kind, so all three money directions are on screen at once.
VenueEvent.objects.create(
    host=host, kind="performance", title="Live set at the loft",
    area="Denver — RiNo", address="12 Real Street",
    starts_at=now + timedelta(days=3), hours=2, basis="hour",
    skills=["any_daw"], capacity=8, min_age=21,
    description="Loud room, good desk.")
VenueEvent.objects.create(
    host=host, kind="session", title="Sunday session — bring rhythm",
    area="Denver — Baker", address="9 Other Road",
    starts_at=now + timedelta(days=5), hours=3, basis="hour",
    skills=[], capacity=4,
    description="Need a rhythm section. I'm paying.")
VenueEvent.objects.create(
    host=host, kind="free", title="Open jam, no money",
    area="Denver", starts_at=now + timedelta(days=7), hours=2, capacity=20)
VenueEvent.objects.create(
    host=me, kind="performance", title="My own showcase",
    area="Denver — LoDo", address="1 Mine Ave",
    starts_at=now + timedelta(days=9), hours=1, basis="total",
    skills=["protools"], capacity=3)

print(f"corey / hostie — password {PASSWORD} — "
      f"{VenueEvent.objects.filter(host__in=[host, me]).count()} rooms, "
      f"{wallet_for(me).energy} energy each")
