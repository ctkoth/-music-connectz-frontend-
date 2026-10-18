import { useEffect, useState } from "react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";
import { shellHas } from "../standalone.js";

// This week's challenge: one prompt, the same for everybody, so scores compare.
// The prompt is the server's (challengez.py, derived from the ISO week), the
// week's top cards are shared ones only, and "Set it up" just fills the pickers —
// nothing is locked, a take outside it is scored exactly the same.
export default function WeeklyChallenge({ appKey, challenge, onSetup }) {
  const [top, setTop] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!challenge) return;
    api(`/api/economy/challenge/${encodeURIComponent(appKey)}/`, { auth: false })
      .then((d) => setTop(d.top || [])).catch(() => setTop([]));
  }, [appKey, challenge?.week]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!challenge) return null;
  return (
    <div className="space-y-1.5 rounded-lg border border-mcz-gold/30 bg-mcz-gold/[0.06] p-3 text-[12px]" data-tour={`${appKey}-challenge`}>
      <p className="text-[10px] uppercase tracking-widest text-mcz-gold/90">🏁 This week's challenge · {challenge.week}</p>
      <p className="text-sm font-semibold text-white">{challenge.title} · {challenge.difficulty}</p>
      <p className="text-white/60">{challenge.rule}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onSetup?.(challenge)}
                className="rounded-md bg-mcz-gold/15 px-2 py-1 text-[11px] text-mcz-gold hover:bg-mcz-gold/25">
          Set it up for me
        </button>
        {shellHas("metz") && (
          <button type="button" onClick={() => handOff("metz", "metz", { bpm: challenge.bpm })}
                  className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10">
            Open the metronome at {challenge.bpm} BPM
          </button>
        )}
        {top?.length > 0 && (
          <button type="button" className="re-link text-[11px]" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : `Top cards this week (${top.length})`}
          </button>
        )}
      </div>
      {top?.length === 0 && <p className="text-white/45">No cards shared yet — yours could be the first.</p>}
      {open && top?.map((r, i) => (
        <a key={r.token} href={`/s/${r.token}`} target="_blank" rel="noreferrer"
           className="flex items-center gap-2 text-white/75 hover:text-white">
          <span className="w-5 text-white/40">{i + 1}.</span>
          <b className="tabular-nums">{r.shown}</b>
          <span>@{r.username}{r.human ? " · human-made" : ""}</span>
        </a>
      ))}
    </div>
  );
}
