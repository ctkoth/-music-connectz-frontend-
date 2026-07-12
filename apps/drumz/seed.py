"""DrumZ SkillZ content. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:  # pragma: no cover
    from apps.skillz.seeds import seed_app

APP_KEY = "drumz"

DRILLS = [
    {"key": "grip-basics", "title": "Grip & Stroke Basics", "category": "technique", "description": "Matched grip, full strokes, clean rebounds.", "xp": 40, "order": 1},
    {"key": "single-stroke", "title": "Single Stroke Roll", "category": "rudiments", "description": "Even singles at a steady BPM.", "xp": 50, "order": 2},
    {"key": "paradiddle", "title": "Paradiddle Power", "category": "rudiments", "description": "RLRR LRLL locked to the click.", "xp": 70, "order": 3},
    {"key": "timing-40", "title": "Timing Trainer 40BPM", "category": "timing", "description": "Stay glued to a slow click for 2 minutes.", "xp": 60, "order": 4},
    {"key": "groove-8th", "title": "First 8th-Note Groove", "category": "grooves", "description": "Kick, snare, hats — pocket steady.", "xp": 80, "order": 5},
    {"key": "fills-1bar", "title": "One-Bar Fills", "category": "fills", "description": "Land a fill and hit beat 1 clean.", "xp": 90, "order": 6},
    {"key": "chops-16th", "title": "16th-Note Chops", "category": "fills", "description": "Speed with control around the kit.", "xp": 110, "order": 7},
]

BADGES = [
    {"code": "first-hit", "name": "First Hit", "rule": "drills", "threshold": 1, "description": "Completed your first DrumZ drill.", "order": 1},
    {"code": "pocket-keeper", "name": "Pocket Keeper", "rule": "xp", "threshold": 400, "description": "400 XP of groove.", "order": 2},
    {"code": "rudiment-week", "name": "Rudiment Week", "rule": "streak", "threshold": 7, "description": "7-day drum streak.", "order": 3},
    {"code": "chop-machine", "name": "Chop Machine", "rule": "xp", "threshold": 1500, "description": "1500 XP — hands of fury.", "order": 4},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
