// The Thorough mark beside a name: 💯 Thorough, 🥈 Decent, 🥇 Legendary,
// 🌟 Supreme, 💎 Perfect (Corey's tiers; the emoji are placeholders until his
// art lands). It decides nothing — the rung, label and where it opens are the
// server's (`thoroughz.mark_of`), and a member who hid the badge simply has no
// mark to render. Tapping it lands on the Thorough 💯 group in GroupZ, so the
// mark is a door and not a sticker.
import { useState } from "react";
import { goToSpot } from "../goto.js";

export const thoroughTitle = (mark) =>
  `${mark.label}: a Thorough rating of ${mark.rating}/10 — how completely they train, from finished BodieZ sessions in the last 28 days. Not strength, and it pays nothing. Tap to see the Thorough 💯 group.`;

// The mark beside a name is the sign's NUMERAL ("≥8.9"), cropped from the badge art (public/icons/badge_<key>_mark.jpg):
// the whole sign shrunk to a line of text is an unreadable blob, the glowing number is not. The emoji is the fallback if
// the file does not load.
export default function ThoroughMark({ mark, compact = false }) {
  const [noArt, setNoArt] = useState(false);
  if (!mark || !mark.emoji) return null;
  return (
    <button type="button" title={thoroughTitle(mark)}
            onClick={(e) => { e.stopPropagation(); goToSpot(mark.open_in || "groupz", mark.target || "thorough"); }}
            className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0 align-middle text-[10px] font-semibold text-white/80 hover:bg-white/20">
      {noArt
        ? <span aria-hidden>{mark.emoji}</span>
        : <img src={`/icons/badge_${mark.key}_mark.jpg`} alt="" aria-hidden onError={() => setNoArt(true)}
               className="h-4 w-auto rounded-sm" />}
      {!compact && <span>{mark.name}</span>}
      <span className="sr-only">{mark.label}</span>
    </button>
  );
}
