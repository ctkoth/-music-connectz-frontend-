"""BassZ SkillZ content. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:  # pragma: no cover
    from apps.skillz.seeds import seed_app

APP_KEY = "bassz"

DRILLS = [
    {"key": "finger-alternate", "title": "Alternating Fingers", "category": "technique", "description": "Index-middle plucking, even tone.", "xp": 40, "order": 1},
    {"key": "root-notes", "title": "Root Note Grooves", "category": "groove", "description": "Lock roots to a drum loop.", "xp": 50, "order": 2},
    {"key": "scale-major", "title": "Major Scale Runs", "category": "scales", "description": "One octave, clean fretting.", "xp": 60, "order": 3},
    {"key": "groove-lock", "title": "Groove Lock", "category": "groove", "description": "Sit in the pocket with a metronome drop-out.", "xp": 80, "order": 4},
    {"key": "slap-basics", "title": "Slap Basics", "category": "slap", "description": "Thumb slap + pop, muted and clean.", "xp": 90, "order": 5},
    {"key": "walking-line", "title": "Walking Line", "category": "groove", "description": "Walk a 12-bar blues.", "xp": 110, "order": 6},
]

BADGES = [
    {"code": "first-pluck", "name": "First Pluck", "rule": "drills", "threshold": 1, "description": "Completed your first BassZ drill.", "order": 1},
    {"code": "low-end", "name": "Low End Theory", "rule": "xp", "threshold": 400, "description": "400 XP of groove.", "order": 2},
    {"code": "pocket-week", "name": "Pocket Week", "rule": "streak", "threshold": 7, "description": "7-day bass streak.", "order": 3},
    {"code": "groove-monster", "name": "Groove Monster", "rule": "xp", "threshold": 1500, "description": "1500 XP — the pocket is home.", "order": 4},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
