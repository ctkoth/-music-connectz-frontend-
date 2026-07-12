"""RapZ blueprint drills. Idempotent."""
try:
    from apps.common.training_seed import seed_app
except Exception:
    from apps.skillz.seeds import seed_app

APP_KEY = "rapz"

DRILLS = [
    {"key": "warmup-chain", "title": "Warmup Chain", "category": "warmup", "description": "Breath, diction, cadence, pocket drills.", "xp": 40, "order": 1},
    {"key": "boom-bap-16", "title": "Boom Bap: 16 Clean Bars", "category": "style", "description": "Every word lands, rhyme map stays strong.", "xp": 80, "order": 2},
    {"key": "trap-triplets", "title": "Trap: Triplet Run", "category": "style", "description": "Ride the hi-hat pocket with intentional ad-libs.", "xp": 80, "order": 3},
    {"key": "chopper-ladder", "title": "Chopper: Speed Ladder", "category": "style", "description": "Stay understandable at high speed.", "xp": 100, "order": 4},
    {"key": "drill-pause", "title": "Drill: Pause Strike", "category": "style", "description": "Cold pressure with controlled pauses.", "xp": 90, "order": 5},
    {"key": "conscious-thesis", "title": "Conscious: 4-Bar Thesis", "category": "style", "description": "Listener can explain your message.", "xp": 80, "order": 6},
    {"key": "emo-true-line", "title": "Emo: True Line", "category": "style", "description": "Personal and believable.", "xp": 70, "order": 7},
    {"key": "boss-take", "title": "Boss Take", "category": "boss", "description": "One scored final take at the end of the run.", "xp": 130, "order": 8},
]

BADGES = [
    {"code": "first-bars", "name": "First Bars", "rule": "drills", "threshold": 1, "description": "Completed your first RapZ run.", "order": 1},
    {"code": "pocket-lock", "name": "Pocket Lock", "rule": "xp", "threshold": 500, "description": "500 XP of flow discipline.", "order": 2},
    {"code": "combo-keeper", "name": "Combo Keeper", "rule": "streak", "threshold": 7, "description": "7-day combo — streak shield earned.", "order": 3},
    {"code": "style-crowned", "name": "Crowned", "rule": "xp", "threshold": 2500, "description": "2500 XP — a style mastered.", "order": 4},
]


def seed():
    return seed_app(APP_KEY, drills=DRILLS, badges=BADGES)
