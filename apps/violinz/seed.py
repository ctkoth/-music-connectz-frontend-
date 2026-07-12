"""ViolinZ SkillZ content. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:  # pragma: no cover
    from apps.skillz.seeds import seed_app

APP_KEY = "violinz"

DRILLS = [
    {"key": "posture-hold", "title": "Posture & Hold", "category": "technique", "description": "Chin, shoulder, scroll — set the frame.", "xp": 40, "order": 1},
    {"key": "open-strings", "title": "Open String Bowing", "category": "bowing", "description": "Straight bow, even tone, full length.", "xp": 50, "order": 2},
    {"key": "first-finger", "title": "First Finger Patterns", "category": "intonation", "description": "In-tune 1st position notes.", "xp": 60, "order": 3},
    {"key": "scales-g", "title": "G Major Scale", "category": "scales", "description": "Two octaves, clean shifts.", "xp": 80, "order": 4},
    {"key": "bow-dynamics", "title": "Bow Dynamics", "category": "bowing", "description": "pp to ff on one string.", "xp": 90, "order": 5},
    {"key": "vibrato-intro", "title": "Vibrato Intro", "category": "technique", "description": "Slow wrist vibrato on long tones.", "xp": 110, "order": 6},
    {"key": "piece-1", "title": "First Piece", "category": "repertoire", "description": "Perform a short piece end-to-end.", "xp": 130, "order": 7},
]

BADGES = [
    {"code": "first-bow", "name": "First Bow", "rule": "drills", "threshold": 1, "description": "Completed your first ViolinZ drill.", "order": 1},
    {"code": "in-tune", "name": "In Tune", "rule": "xp", "threshold": 400, "description": "400 XP of intonation work.", "order": 2},
    {"code": "bow-week", "name": "Bow Week", "rule": "streak", "threshold": 7, "description": "7-day violin streak.", "order": 3},
    {"code": "virtuoso-path", "name": "Virtuoso Path", "rule": "xp", "threshold": 1800, "description": "1800 XP — the path opens.", "order": 4},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
