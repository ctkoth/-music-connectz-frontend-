"""SingZ blueprint drills. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:
    from apps.skillz.seeds import seed_app

APP_KEY = "singz"

DRILLS = [
    {"key": "checkin", "title": "Voice Check-In", "category": "checkin", "description": "Log voice condition, hydration, rest, energy.", "xp": 30, "order": 1},
    {"key": "warmup-quest", "title": "Warmup Quest", "category": "warmup", "description": "Complete a warmup chain before advanced work.", "xp": 40, "order": 2},
    {"key": "pitch-lanes", "title": "Pitch Lanes", "category": "skill", "description": "Guided pitch accuracy in your safe range.", "xp": 60, "order": 3},
    {"key": "breath-hold", "title": "Breath Keeper", "category": "skill", "description": "Hold and support a note for 10 seconds.", "xp": 70, "order": 4},
    {"key": "range-run", "title": "Range Run", "category": "range", "description": "Climb the pitch ladder at your safe edges.", "xp": 90, "order": 5},
    {"key": "agility-riffs", "title": "Agility Riffs", "category": "skill", "description": "Runs and interval movement under control.", "xp": 100, "order": 6},
    {"key": "boss-take", "title": "Boss Take", "category": "boss", "description": "One scored final take of a song section.", "xp": 130, "order": 7},
    {"key": "cooldown", "title": "Recovery Cooldown", "category": "recovery", "description": "Cooldown + recovery notes end the session.", "xp": 40, "order": 8},
]

BADGES = [
    {"code": "first-note", "name": "First Note", "rule": "drills", "threshold": 1, "description": "Completed your first SingZ quest.", "order": 1},
    {"code": "pitch-sniper", "name": "Pitch Sniper", "rule": "xp", "threshold": 500, "description": "500 XP of accuracy work.", "order": 2},
    {"code": "cooldown-loyalist", "name": "Cooldown Loyalist", "rule": "streak", "threshold": 7, "description": "7-day voice-safe streak.", "order": 3},
    {"code": "range-builder", "name": "Range Builder", "rule": "xp", "threshold": 1500, "description": "1500 XP toward your goal range.", "order": 4},
    {"code": "stage-boss", "name": "Stage Boss", "rule": "xp", "threshold": 3000, "description": "3000 XP — audition ready.", "order": 5},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
