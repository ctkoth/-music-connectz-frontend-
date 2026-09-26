// What each trial door SAYS, built from what the door actually is.
//
// `/api/economy/trialdoorz/` already publishes, per door, the performer
// ("drummer"), the coach ("drum coach") and what one take is scored on
// (["Timing ⏱️", "Groove 🕺", …]) — read off the instrument's own profile. The
// door page ignored all of it: every door shared one headline, and the
// "What comes back" example said *"Pitch accuracy is solid, but breath control
// cost you 2 points"* whether you had walked into SingZ or DrumZ. trialdoorz.py
// says why that matters in so many words — a drummer reading "pitch, breath,
// range" correctly concludes the place is not for drummers.
//
// So nothing here is typed per instrument. It is a template over the server's
// own fields, which means a door added tomorrow speaks its own language the day
// it is mounted, and a wording change happens once. When the fields are not
// there (endpoint down, the two-door FALLBACK) it returns the generic copy that
// shipped before — less specific, never wrong.
//
// It does NOT invent a claim. What is promised is what the coach does: score
// the take on the dimensions listed, and name what cost points.

/** "Timing ⏱️" → "timing". The label the server sends leads with the name. */
export function dimName(label) {
  return String(label || "").trim().split(/\s+/)[0].toLowerCase();
}

/** A short list read aloud: "a, b and c". */
function readAloud(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const GENERIC = {
  headline: "One take scored — free, instantly",
  scoredOn: "",
};

/**
 * @param {{label?:string, coach?:string, performer?:string, scores?:string[]}|undefined} door
 * @param {string} label  the door's display name, used when `door` is missing
 */
export function doorCopy(door, label = "SingZ") {
  const coach = door?.coach || "";
  const scores = Array.isArray(door?.scores) ? door.scores.filter(Boolean) : [];
  const names = scores.map(dimName).filter(Boolean);
  const specific = !!(coach && names.length >= 2);

  const scoredOn = specific ? `Scored on ${readAloud(scores)}.` : GENERIC.scoredOn;

  return {
    specific,
    headline: specific ? `A ${coach} scores your take — free, no account` : GENERIC.headline,
    // What it is scored on, then the promise it can keep: it names what cost
    // points. Length of clip and daily limit stay in TrialTake's own copy.
    scoredOn,
    // An illustration of the SHAPE of the answer, built from this door's own
    // first two dimensions. Not somebody's take, and the heading says so.
    example: specific
      ? `${names[0][0].toUpperCase()}${names[0].slice(1)} is solid, but ${names[1]} cost you 2 points. Work on ${names[1]} and you'll hit 9+.`
      : "Pitch accuracy is solid, but breath control cost you 2 points. Work on sustain, and you'll hit 9+.",
    shareText: (score) => {
      const who = specific ? `a real ${coach}` : "a real AI coach";
      return score != null
        ? `I scored ${score}/10 on my ${label} take 🎤 — ${who} named exactly what cost me points. Free, no account. Get yours scored:`
        : `Got my ${label} take scored free by ${who} 🎤 — it named what to fix. No account needed. Try it:`;
    },
  };
}
