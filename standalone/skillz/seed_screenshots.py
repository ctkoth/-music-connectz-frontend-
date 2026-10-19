# Seed for the SkillZ Play screenshots. Idempotent — re-run for a clean slate.
#
#   cd $MCZ_BACKEND && python manage.py shell < /path/to/standalone/skillz/seed_screenshots.py
#
# WHY THIS EXISTS, STATED PLAINLY: CI and this dev box have no Gemini or Anthropic
# key, so a take cannot be scored live. What is seeded here is the member's HISTORY —
# the TakeScore rows the real coach endpoint writes after a take — so the hub's counts
# and "Recent takes", and each coach's progress panel, are the real app reading real
# rows. The scores themselves are hand-written numbers for a fictional member and are
# NOT the output of a model. The one screen that shows a fresh result
# (take_screenshots.mjs, "scored take") is the real UI rendering a hand-written reply
# to the real POST route, intercepted in the browser; it says so in the README. Set
# LIVE=1 on a box with a Gemini key and that screen is a real run instead.
#
# The account is local to the dev database. It is not the Play reviewer account
# (review-notes.md says to make a real one on production).
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.economy.models import InstrumentProfile, TakeScore, profile_for, voice_prefs_for, wallet_for

User = get_user_model()
NAME = "szreview"
PASSWORD = "pw12345!"

u = User.objects.filter(username=NAME).first()
if not u:
    u = User.objects.create_user(username=NAME, email=f"{NAME}@example.test")
# Always re-set: a password hashed by an older run verifies as "Incorrect password".
u.set_password(PASSWORD)
u.save()
profile_for(u).save()

TakeScore.objects.filter(user=u).delete()
InstrumentProfile.objects.filter(user=u).delete()

# One of the Free tier's three free prompts is already used today, so the hub reads
# "2 of 3 left" the way it would for somebody who has already had a take scored.
w = wallet_for(u)
w.prompt_day = timezone.now().strftime("%Y-%m-%d")
w.prompts_used_today = 1
w.promptz = 0
w.save()
vp = voice_prefs_for(u)
vp.style, vp.emoji = "standard", "none"
vp.save()

# (app_key, days ago, genre, difficulty, scores). Keys are each instrument's own
# dimensions (apps/economy/instruments.py); `overall` is the mean the real recorder
# computes, so the history reads the way a real one would.
ROWS = [
    ("singz", 12, "Soul", "builder", {"pitch": 5, "tone": 6, "breath": 5, "range": 6, "agility": 4, "style_match": 6}),
    ("singz", 9, "Soul", "builder", {"pitch": 6, "tone": 6, "breath": 5, "range": 6, "agility": 5, "style_match": 6}),
    ("singz", 5, "R&B", "builder", {"pitch": 6, "tone": 7, "breath": 6, "range": 6, "agility": 5, "style_match": 7}),
    ("singz", 2, "R&B", "performer", {"pitch": 7, "tone": 7, "breath": 6, "range": 7, "agility": 5, "style_match": 7}),
    ("rapz", 6, "Hip-Hop", "builder", {"flow": 6, "timing": 7, "breath": 5, "clarity": 7, "delivery": 6, "style_match": 6}),
    ("rapz", 1, "Hip-Hop", "builder", {"flow": 7, "timing": 7, "breath": 6, "clarity": 7, "delivery": 7, "style_match": 7}),
    ("guitarz", 3, "Blues", "starter", {"timing": 6, "tone": 7, "technique": 5, "dynamics": 5, "cleanliness": 6, "style_match": 6}),
    ("drumz", 4, "Funk", "builder", {"timing": 7, "groove": 6, "dynamics": 5, "consistency": 6, "fills": 5, "style_match": 6}),
]
now = timezone.now()
for key, days, genre, diff, scores in ROWS:
    perf = {k: v for k, v in scores.items() if k != "style_match"}
    row = TakeScore.objects.create(
        user=u, app_key=key, scores=scores, overall=round(sum(perf.values()) / len(perf)),
        weakest=min(perf, key=perf.get), difficulty=diff, genre=genre, source="upload")
    TakeScore.objects.filter(pk=row.pk).update(created_at=now - timedelta(days=days, hours=2))

print(f"{NAME} / {PASSWORD} — {TakeScore.objects.filter(user=u).count()} takes across "
      f"{TakeScore.objects.filter(user=u).values('app_key').distinct().count()} coaches; "
      f"free prompts used today: {wallet_for(u).prompts_used_today}")
