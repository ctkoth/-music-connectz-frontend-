"""GuitarZ SkillZ content. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:  # pragma: no cover
    from apps.skillz.seeds import seed_app

APP_KEY = "guitarz"

DRILLS = [
    {"key": "first-chords", "title": "First Chords", "category": "chords", "description": "G, C, D — clean and buzz-free.", "xp": 40, "order": 1},
    {"key": "chord-changes", "title": "Chord Changes", "category": "chords", "description": "60 changes per minute G↔C.", "xp": 60, "order": 2},
    {"key": "strum-patterns", "title": "Strumming Patterns", "category": "rhythm", "description": "Down-down-up-up-down-up in time.", "xp": 50, "order": 3},
    {"key": "power-chords", "title": "Power Chords", "category": "riffs", "description": "Palm-muted power chord runs.", "xp": 70, "order": 4},
    {"key": "pentatonic-1", "title": "Pentatonic Box 1", "category": "lead", "description": "Minor pentatonic up and down clean.", "xp": 80, "order": 5},
    {"key": "riff-master", "title": "Riff Master", "category": "riffs", "description": "Nail a full riff at tempo.", "xp": 100, "order": 6},
    {"key": "first-solo", "title": "First Solo", "category": "lead", "description": "Improvise 8 bars over a backing track.", "xp": 120, "order": 7},
]

BADGES = [
    {"code": "first-strum", "name": "First Strum", "rule": "drills", "threshold": 1, "description": "Completed your first GuitarZ drill.", "order": 1},
    {"code": "chord-lock", "name": "Chord Lock", "rule": "xp", "threshold": 400, "description": "400 XP of chord work.", "order": 2},
    {"code": "callus-week", "name": "Callus Week", "rule": "streak", "threshold": 7, "description": "7-day guitar streak.", "order": 3},
    {"code": "shredder", "name": "Shredder", "rule": "xp", "threshold": 1600, "description": "1600 XP — fingers fly.", "order": 4},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
