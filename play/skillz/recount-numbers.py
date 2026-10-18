# Recount every number and claim the SkillZ listing quotes, from the code that owns it.
#
#   cd $MCZ_BACKEND && python manage.py shell < /path/to/play/skillz/recount-numbers.py
#
# A number in a store listing is a tier number in copy: right the day it is written,
# wrong the day the ladder moves, and nothing fails when it does. This is the check that
# fails. It reads the figures out of the backend (catalog.py, models.py, instruments.py,
# vocalcoach.py, takescorez.py, urls) and the frontend (the recorder's video limit, the
# DrumZ kits), then looks for each one in listing/full-description.txt in the form it is
# quoted, and checks the Play field limits. It exits non-zero, with the line to fix, if
# the listing and the code disagree. Same idea as ../intelligencez/recount-numbers.py.
#
# Run it before every release, and after anyone touches PROMPT_ALLOWANCE, TIER_LIMITS,
# the instruments' score dimensions, DIFFICULTIES, RECENT_DAYS or the recorder.
import os
import re

from apps.economy import instruments, takescorez, vocalcoach
from apps.economy.catalog import TIER_LIMITS
from apps.economy.models import PROMPT_ALLOWANCE
from music_connectz.urls import INSTRUMENT_APP_KEYS

# `manage.py shell < file` has no __file__; the listing is found from the frontend
# checkout next to the backend, or from FRONTEND=<path>.
FRONTEND = os.environ.get("FRONTEND") or os.path.join(os.path.dirname(os.getcwd()), "-music-connectz-frontend-")
LISTING = os.path.join(FRONTEND, "play", "skillz", "listing")
read = lambda *p: open(os.path.join(FRONTEND, *p), encoding="utf-8").read()
text = read("play", "skillz", "listing", "full-description.txt")

video_seconds = int(re.search(r"VIDEO_MAX_SECONDS\s*=\s*(\d+)", read("src", "apps", "BossTake.jsx")).group(1))
drum_src = read("src", "apps", "DrumZ.jsx")
kits = len(re.findall(r"^  \w+: \{\n    name: \"", drum_src[drum_src.index("const DRUM_KITS"):drum_src.index("export default")], re.M))
free_mb = min(vocalcoach.MAX_MB, TIER_LIMITS["free"]["upload_mb"])

# "Flow 🌊" -> "flow": a dimension's name as the listing writes it.
plain = lambda label: re.sub(r"\s*[^\w\s&'/-]+\s*$", "", label).strip().lower()

figures = [
    # (what it is, the value, the phrase the listing quotes it in)
    ("free daily prompts (Free tier)", PROMPT_ALLOWANCE["free"], f"You get {PROMPT_ALLOWANCE['free']} free prompts a day"),
    ("instruments with a coach", len(INSTRUMENT_APP_KEYS), "a coach for seven instruments" if len(INSTRUMENT_APP_KEYS) == 7 else "COACHES CHANGED"),
    ("recorded video limit (seconds)", video_seconds, f"up to {video_seconds} seconds"),
    ("audio limit on a free account (MB)", free_mb, f"up to {free_mb} MB on a free account"),
    ("difficulty levels", len(vocalcoach.DIFFICULTIES), "one of four difficulty levels" if len(vocalcoach.DIFFICULTIES) == 4 else "DIFFICULTIES CHANGED"),
    ("scores per coach", {len(p["scores"]) for p in instruments.INSTRUMENTS.values()}, "scores five things" if {len(p["scores"]) for p in instruments.INSTRUMENTS.values()} == {5} else "SCORES CHANGED"),
    ("days in the consistency window", takescorez.RECENT_DAYS, "last fourteen" if takescorez.RECENT_DAYS == 14 else "RECENT_DAYS CHANGED"),
    ("DrumZ pad kits", kits, "two kits" if kits == 2 else "KITS CHANGED"),
    ("coaches that can read lyrics", sorted(k for k in instruments.INSTRUMENTS if instruments.rates_lyrics(k)),
     "SingZ and RapZ can read your lyrics too" if sorted(k for k in instruments.INSTRUMENTS if instruments.rates_lyrics(k)) == ["rapz", "singz"] else "LYRICS CHANGED"),
    ("every coach can rate a mix", all(instruments.rates_mix(k) for k in instruments.INSTRUMENTS), "every coach can rate your mix"),
]
# Every dimension the listing names, for every coach, must be one the coach really scores.
named = {
    "singz": "SingZ scores pitch, tone, breath, range and agility.",
    "rapz": "RapZ scores flow, timing, breath, clarity and delivery.",
    "drumz": "DrumZ scores timing, groove, dynamics, consistency and fills.",
    "violinz": "ViolinZ scores intonation, tone, bowing, timing and vibrato.",
}
for key, sentence in named.items():
    figures.append((f"{key}'s dimensions", [plain(v) for v in instruments.INSTRUMENTS[key]["scores"].values()], sentence))
fretted = [plain(v) for v in instruments.INSTRUMENTS["guitarz"]["scores"].values()]
bass = [plain(v) for v in instruments.INSTRUMENTS["bassz"]["scores"].values()]
keys_ = [plain(v) for v in instruments.INSTRUMENTS["keyz"]["scores"].values()]
figures += [
    ("guitar and bass share four dimensions", fretted[:4] == bass[:4] == ["timing", "tone", "technique", "dynamics"] and fretted[4] == "cleanliness" and bass[4] == "note length",
     "GuitarZ and BassZ score timing, tone, technique and dynamics, then cleanliness or note length."),
    ("keyz swaps one for voicing", keys_ == ["timing", "tone", "technique", "dynamics", "voicing"], "KeyZ swaps in voicing."),
]

bad = 0
for what, value, phrase in figures:
    # A check phrased as a boolean value is ok only when the value is truthy.
    ok = phrase in text and value not in (False, None)
    bad += not ok
    print(f"{'ok ' if ok else 'BAD'}  {what}: {value}  -> {phrase!r}")

# Play's field limits, so a listing is never rejected for length.
for name, limit in (("title.txt", 30), ("short-description.txt", 80), ("full-description.txt", 4000), ("release-notes.txt", 500)):
    n = len(open(os.path.join(LISTING, name), encoding="utf-8").read().strip())
    ok = 0 < n <= limit
    bad += not ok
    print(f"{'ok ' if ok else 'BAD'}  {name}: {n} of {limit} characters")

# What the listing says is NOT here has to be true: no coach, route or tree for these.
for word in ("DJ, producer, A&R, illustration and video coaches",):
    ok = word in text
    bad += not ok
    print(f"{'ok ' if ok else 'BAD'}  not-built list is in the listing: {word!r}")
from apps.economy import skillzhub  # noqa: E402
ok = [c.lower() for c in skillzhub.COMING] == ["dj", "producer", "a&r", "illustrator", "videographer"] and not (
    {c.lower() for c in skillzhub.COMING} & {p["label"].lower() for p in instruments.INSTRUMENTS.values()})
bad += not ok
print(f"{'ok ' if ok else 'BAD'}  the hub's `coming` list is the five, and none is a coach: {skillzhub.COMING}")

if bad:
    print(f"\n{bad} claim(s) in the listing no longer match the code.")
    raise SystemExit(1)
print("\nEvery quoted figure matches the code.")
