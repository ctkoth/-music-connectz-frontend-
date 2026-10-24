# Seed for the IntelligenceZ Play screenshots. Idempotent — re-run for a clean slate.
#
#   cd $MCZ_BACKEND && python manage.py shell < /path/to/standalone/intelligencez/seed_screenshots.py
#
# WHY THIS EXISTS, STATED PLAINLY: CI and this dev box have no Gemini or Anthropic
# key, so the AI-written text cannot be generated live. The pieces below were
# written by hand, as fictional people, and inserted as the member's own rows
# (SentenceWork, InstrumentalWork, OccOutput) — the same rows the real endpoints
# write. The screens, prices, allowance and buttons in the screenshots are the
# real app talking to the real API; only the AI's output is seeded. Mix ConnectZ
# is NOT seeded: it runs on the device, and its screenshots are a real run on a
# synthesized WAV (see take_screenshots.mjs).
#
# The account is local to the dev database. It is not the Play reviewer account
# (review-notes.md says to make a real one on production).
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.economy.instrumentalz import clean_tracks
from apps.economy.models import (InstrumentalWork, MasterWork, OccOutput, SentenceWork,
                                 Upload, profile_for, voice_prefs_for, wallet_for)

User = get_user_model()
NAME = "izreview"
PASSWORD = "pw12345!"

u = User.objects.filter(username=NAME).first()
if not u:
    u = User.objects.create_user(username=NAME, email=f"{NAME}@example.test")
# Always re-set: a password hashed by an older run verifies as "Incorrect password".
u.set_password(PASSWORD)
u.save()
profile_for(u).save()

SentenceWork.objects.filter(user=u).delete()
InstrumentalWork.objects.filter(user=u).delete()
OccOutput.objects.filter(user=u).delete()
MasterWork.objects.filter(user=u).delete()
Upload.objects.filter(user=u).delete()

# One of the Free tier's three free prompts is already used today, so the hub
# reads "2 of 3 left" the way it would for somebody who has written a piece.
w = wallet_for(u)
w.prompt_day = timezone.now().strftime("%Y-%m-%d")
w.prompts_used_today = 1
w.promptz = 0
w.save()

# The member keeps OCC's default voice (the founder's, with an emoji leading each
# paragraph), so the kept reply below is written the way that voice writes.
vp = voice_prefs_for(u)
vp.style, vp.emoji = "corey", "heavy"
vp.save()

# ---- Sentence ConnectZ ------------------------------------------------------

RESUME_BRIEF = (
    "Dana Whitfield, Denver, CO. Applying for: Studio Manager.\n"
    "Larimer Street Studios, front-of-house and booking, 2021 to now. I book four rooms, "
    "run the weekly session calendar and handle the invoices.\n"
    "Brightline Recording, assistant engineer, 2018 to 2021. I set up sessions, tracked "
    "drums and vocals, and kept the gear log.\n"
    "B.A. Music Business, Metropolitan State University of Denver, 2018.\n"
    "Skills: Pro Tools, Ableton Live, scheduling, invoicing, client communication."
)
RESUME = """DANA WHITFIELD
Denver, CO · [PHONE NUMBER] · [EMAIL ADDRESS]

SUMMARY
Studio operations and booking professional with experience in both the front office and the control room. Applying for a Studio Manager role.

EXPERIENCE
Front-of-House and Booking — Larimer Street Studios, Denver, CO (2021 – present)
• Book four rooms and run the weekly session calendar.
• Handle client invoicing.

Assistant Engineer — Brightline Recording (2018 – 2021)
• Set up sessions and tracked drums and vocals.
• Kept the studio's gear log.

EDUCATION
B.A. Music Business — Metropolitan State University of Denver (2018)

SKILLS
Pro Tools · Ableton Live · Scheduling · Invoicing · Client communication
"""

POEM_BRIEF = "The first cold morning of the year, from the window of a kitchen where somebody is already awake."
POEM = """First Frost

The kettle clears its throat before the light does.
Out past the glass, the yard has been signed over
to a thin, white handwriting nobody practised.

Someone's breath fogs the window, then leaves it —
the way a thought arrives at the door
and thinks better of knocking.

I hold the cup like a small, warm decision.
Everything outside is exactly as it was,
only more honest about the cold.
"""

BIO_BRIEF = "Short bio for the About page of a two-person recording studio in Denver. Studio manager Dana Whitfield books the rooms; the studio opened in 2021 and has four rooms."
BIO = (
    "Larimer Street Studios is a four-room recording studio in Denver, Colorado, open since 2021. "
    "Studio manager Dana Whitfield books the rooms and runs the weekly session calendar. "
    "[ADD: one sentence on the kind of artists you work with.] "
    "[ADD: how to book a session.]"
)

now = timezone.now()
for i, (kind, topic, text, inputs) in enumerate([
    ("bio", BIO_BRIEF, BIO, {"genre": "About page"}),
    ("poem", POEM_BRIEF, POEM, {"genre": "Free verse"}),
    ("resume", RESUME_BRIEF, RESUME, {"genre": "Studio Manager"}),
]):
    row = SentenceWork.objects.create(user=u, kind=kind, topic=topic, text=text, inputs=inputs)
    # Oldest first, an hour apart, so "recent pieces" has an order a person would believe.
    SentenceWork.objects.filter(pk=row.pk).update(created_at=now - timedelta(hours=3 - i))

# ---- Instrumental ConnectZ --------------------------------------------------
# A lo-fi boom-bap loop in A minor at 90 BPM, four bars. Written note by note and
# passed through the SAME validator the composer's answer goes through, so what is
# stored is what the endpoint would have stored.

BARS, BPM, KEY = 4, 90, "A minor"
drums = []
for bar in range(BARS):
    b = bar * 4
    drums += [[36, b + 0.0, 0.25, 100], [36, b + 2.5, 0.25, 92], [38, b + 1.0, 0.25, 96], [38, b + 3.0, 0.25, 100]]
    if bar % 2 == 1:
        drums.append([36, b + 3.5, 0.25, 84])
    for h in range(8):
        drums.append([42, b + h * 0.5, 0.2, 58 + (h % 2) * 18])
chords = [(57, 60, 64, 67), (53, 57, 60, 64), (48, 52, 55, 59), (55, 59, 62, 65)]   # Am7 Fmaj7 Cmaj7 G6
piano, bass = [], []
for bar, ch in enumerate(chords):
    b = bar * 4
    for p in ch:
        piano.append([p, b + 0.0, 1.5, 70])
        piano.append([p, b + 2.0, 1.0, 62])
    root = ch[0] - 24
    bass += [[root, b + 0.0, 1.0, 98], [root, b + 1.5, 0.5, 80], [root + 7, b + 2.5, 0.75, 88], [root, b + 3.5, 0.5, 76]]
tracks = clean_tracks({"tracks": [
    {"instrument": "drums", "notes": drums},
    {"instrument": "bass", "notes": bass},
    {"instrument": "epiano", "notes": piano},
]}, ["drums", "bass", "epiano"], BARS)
assert len(tracks) == 3, "the seeded loop did not validate"
row = InstrumentalWork.objects.create(
    user=u, genre="Lo-fi boom bap", instruments=["drums", "bass", "epiano"], bpm=BPM, key=KEY, bars=BARS,
    brief="Dusty and a little sad. Room for a sample on top.", tracks=tracks)
InstrumentalWork.objects.filter(pk=row.pk).update(created_at=now - timedelta(hours=1))

# ---- OCC --------------------------------------------------------------------

ASK = ("I'm releasing a five-track EP in November. How should I split the six weeks I have left "
       "between recording, mixing and promo?")
REPLY = """🎯 Short answer: spend the first three weeks finishing what isn't recorded, the next two mixing, and start promo in week three — not after the mix.

🧠 Here's the reasoning. Weeks 1–3, finish tracking. Lock the arrangement of every song before you touch a fader. Mixing a song you're still changing is paying twice for the same work. If one of the five isn't working by the end of week two, cut it and release four — a tight four-song EP beats a loose five. 🔥

🎚️ Weeks 3–5, mix one song at a time and bounce a reference of each. Listen on a phone speaker and in a car before you call anything done. If you master it yourself, do it last, from the final mixes, and check it against a song you love at the same loudness.

📣 Promo runs alongside from week three. Cover art, a 20-second clip per song and your release-day plan all need a finished song to point at, but none of them needs a finished mix. Waiting for the master to start promo is how EPs end up released to nobody.

🛑 Week 6: nothing new. Upload, check the metadata, schedule, rest.

❓ What I'd want to know before you commit: how many of the five are already recorded, and who's mixing them. That changes the split more than anything else."""
oc = OccOutput.objects.create(user=u, tab="occ", input_text=ASK, title=ASK[:160], description=REPLY, media_type="document")
OccOutput.objects.filter(pk=oc.pk).update(created_at=now - timedelta(minutes=30))

print(f"{NAME} / {PASSWORD} — {SentenceWork.objects.filter(user=u).count()} pieces, "
      f"{InstrumentalWork.objects.filter(user=u).count()} loop, {OccOutput.objects.filter(user=u).count()} kept reply; "
      f"free prompts used today: {wallet_for(u).prompts_used_today}")
