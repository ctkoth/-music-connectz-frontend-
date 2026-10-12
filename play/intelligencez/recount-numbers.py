# Recount every number the IntelligenceZ listing quotes, from the code that owns it.
#
#   cd $MCZ_BACKEND && python manage.py shell < /path/to/play/intelligencez/recount-numbers.py
#
# A number in a store listing is a tier number in copy: right the day it is
# written, wrong the day the ladder moves, and nothing fails when it does. This
# is the check that fails. It reads the figures out of the backend (catalog.py,
# models.py, the three writers) and the frontend (the mastering length cap), then
# looks for each one in listing/full-description.txt in the form it is quoted. It
# exits non-zero, with the line to fix, if the listing and the code disagree.
# BodieZ's precedent is tools/count_adaptive_exercises.py; this is the same idea
# for numbers that live in policy rather than in a table.
#
# Run it before every release, and after anyone touches PROMPT_ALLOWANCE,
# WRITER_BRIEF_CHARS, TIER_LIMITS, the Instrumental constants or MAX_SECONDS.
import os
import re

from apps.economy import instrumentalz, sentencez
from apps.economy.catalog import MASTERING, TIER_LIMITS, WRITER_BRIEF_CHARS
from apps.economy.models import PROMPT_ALLOWANCE

# `manage.py shell < file` has no __file__; the listing is found from the
# frontend checkout next to the backend, or from FRONTEND=<path>.
FRONTEND = os.environ.get("FRONTEND") or os.path.join(os.path.dirname(os.getcwd()), "-music-connectz-frontend-")
LISTING = os.path.join(FRONTEND, "play", "intelligencez", "listing", "full-description.txt")
CLIENT = os.path.join(FRONTEND, "src", "mastering", "client.js")

text = open(LISTING, encoding="utf-8").read()
_m = re.search(r"MAX_SECONDS\s*=\s*(\d+)\s*\*\s*(\d+)", open(CLIENT).read())
max_seconds = int(_m.group(1)) * int(_m.group(2))

# Writer kinds the IntelligenceZ app lists: the persona-gated agreements are
# dropped in a shell (there is no ProfileZ to add the persona in).
shell_kinds = [k for k, v in sentencez.KINDS.items() if not v.get("personas")]

figures = [
    # (what it is, the value, the phrase the listing quotes it in)
    ("free daily prompts (Free tier)", PROMPT_ALLOWANCE["free"], f"{PROMPT_ALLOWANCE['free']} free prompts a day"),
    ("Write brief limit, Free tier (characters)", WRITER_BRIEF_CHARS["free"], f"{WRITER_BRIEF_CHARS['free']:,} characters"),
    ("Free storage (MB)", TIER_LIMITS["free"]["storage_mb"], f"{TIER_LIMITS['free']['storage_mb']} MB of storage"),
    ("Compose bar lengths", instrumentalz.BARS, "Four or eight bars" if instrumentalz.BARS == (4, 8) else "BARS CHANGED"),
    ("Compose most instruments", instrumentalz.MAX_TRACKS, "up to six instruments" if instrumentalz.MAX_TRACKS == 6 else "MAX_TRACKS CHANGED"),
    ("Mastering longest song (minutes)", max_seconds // 60, f"up to {max_seconds // 60} minutes of audio"),
    ("Kinds Write lists in the app", len(shell_kinds),
     "Resumes, cover letters, lyrics, poems, bios, Instagram captions, posts and essays" if len(shell_kinds) == 8 else "KINDS CHANGED"),
]

bad = 0
for what, value, phrase in figures:
    ok = phrase in text
    bad += not ok
    print(f"{'ok ' if ok else 'BAD'}  {what}: {value}  -> {phrase!r}")

# The things the listing says Free gets from mastering, which are a ladder row.
free_master = MASTERING["free"]
print(f"info Free mastering: intensities {free_master['intensities']}, glue up to {free_master['glue_db_max']} dB"
      " (the listing quotes neither)")

if bad:
    print(f"\n{bad} figure(s) in the listing no longer match the code.")
    raise SystemExit(1)
print("\nEvery quoted figure matches the code.")
