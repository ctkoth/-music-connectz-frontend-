// What a tuner says about a pitch, in words, from cents (positive = SHARP, negative = FLAT).
//
// TunerZ printed "↓ N cents flat" when the cents were POSITIVE, so a sharp note was reported as flat and
// somebody following the arrow tuned the wrong way. The sign convention is the one findClosestNote uses:
// cents = 100 * (semitonesFromA4 - roundedSemitone), so above the note is positive.

/** Within this many cents a note is called in tune. Five is inside what most people can hear. */
export const IN_TUNE_CENTS = 5;

/** { state: "in"|"sharp"|"flat", cents: <abs>, text, action } — never guesses a state for no reading. */
export function tuneVerdict(cents) {
  if (cents == null || !Number.isFinite(cents)) return null;
  const abs = Math.abs(Math.round(cents));
  if (abs <= IN_TUNE_CENTS) return { state: "in", cents: abs, text: "In tune", action: "Hold it there" };
  return cents > 0
    ? { state: "sharp", cents: abs, text: `${abs} cents sharp`, action: "Bring it down" }
    : { state: "flat", cents: abs, text: `${abs} cents flat`, action: "Bring it up" };
}
