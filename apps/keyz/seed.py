"""KeyZ SkillZ content. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:  # pragma: no cover
    from apps.skillz.seeds import seed_app

APP_KEY = "keyz"

DRILLS = [
    {"key": "five-finger", "title": "Five-Finger Position", "category": "technique", "description": "C position, even touch both hands.", "xp": 40, "order": 1},
    {"key": "major-scales", "title": "Major Scales", "category": "scales", "description": "C, G, F — hands separate then together.", "xp": 60, "order": 2},
    {"key": "chord-triads", "title": "Triads & Inversions", "category": "chords", "description": "Root, 1st, 2nd inversions smooth.", "xp": 70, "order": 3},
    {"key": "hands-together", "title": "Hands Together", "category": "technique", "description": "Simple piece, both hands in sync.", "xp": 80, "order": 4},
    {"key": "sight-read-1", "title": "Sight Reading I", "category": "reading", "description": "Read 8 bars cold, steady tempo.", "xp": 90, "order": 5},
    {"key": "pedal-control", "title": "Pedal Control", "category": "technique", "description": "Legato pedaling without smear.", "xp": 100, "order": 6},
    {"key": "piece-perform", "title": "Perform a Piece", "category": "repertoire", "description": "Full piece, memorized or read.", "xp": 130, "order": 7},
]

BADGES = [
    {"code": "first-keys", "name": "First Keys", "rule": "drills", "threshold": 1, "description": "Completed your first KeyZ drill.", "order": 1},
    {"code": "scale-runner", "name": "Scale Runner", "rule": "xp", "threshold": 400, "description": "400 XP of scales and chords.", "order": 2},
    {"code": "practice-week", "name": "Practice Week", "rule": "streak", "threshold": 7, "description": "7-day keyboard streak.", "order": 3},
    {"code": "concert-ready", "name": "Concert Ready", "rule": "xp", "threshold": 1800, "description": "1800 XP — stage lights on.", "order": 4},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
