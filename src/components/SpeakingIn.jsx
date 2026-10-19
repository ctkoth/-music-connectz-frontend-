import { useEffect, useState } from "react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";

/** "Speaking in: Night Owl — change". A door from a surface (coach, writer,
 *  occ) to the VoiceZ picker for it. Says nothing until the server has answered. */
export default function SpeakingIn({ surface, className = "" }) {
  const [row, setRow] = useState(null);
  useEffect(() => {
    let on = true;
    api("/api/economy/voicez/").then((d) => {
      const s = d?.surfaces?.find((x) => x.key === surface);
      if (on && s) setRow(s);
    }).catch(() => {});
    return () => { on = false; };
  }, [surface]);
  if (!row) return null;
  const name = row.options?.find((o) => o.choice === row.choice)?.label || "your style";
  return (
    <p className={`text-[11px] text-white/50 ${className}`}>
      Speaking in: <span className="font-semibold text-white/80">{name}</span> —{" "}
      <button type="button" className="re-link" onClick={() => goToSpot("voicez", "voicez-surfaces")}>change</button>
    </p>
  );
}
