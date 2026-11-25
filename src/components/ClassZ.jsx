import { useEffect, useState } from "react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { CLASS_KEYS, toggleClass } from "../gatesQuery.js";

// ThuroZ and SeXi: a rating above the server's bar, from enough voices, as ONE word.
//
// The five range gates ask a host to type a number. A class is the same gate with the
// number chosen once, on the server (apps/economy/classz.py), so "ThuroZ only" is one
// tap wherever a member decides who they see or let in. This file decides nothing:
// which classes exist, what each means, the bar, how many voices it takes and where
// the member stands are all `/api/economy/classz/`. A failed fetch draws nothing, and
// the ranges still work.

let cached = null;
let pending = null;
const load = () => {
  if (!pending) pending = api("/api/economy/classz/").then((d) => { cached = d; return d; }).catch(() => { pending = null; return null; });
  return pending;
};

export function useClassZ() {
  const [d, setD] = useState(cached);
  useEffect(() => {
    if (cached) return undefined;
    let on = true;
    load().then((x) => { if (on && x) setD(x); });
    return () => { on = false; };
  }, []);
  return d;
}

/** One-tap class gates, on a gates value ({thuro: true}). Shown above the ranges. */
export function ClassToggles({ value = {}, onChange }) {
  const d = useClassZ();
  if (!d?.classes?.length) return null;
  const on = d.classes.filter((c) => value[c.key] === true);
  return (
    <div className="space-y-1.5 px-3 pb-2" data-tour="classz-toggles">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Rating classes">
        {d.classes.filter((c) => CLASS_KEYS.includes(c.key)).map((c) => (
          <button key={c.key} type="button" aria-pressed={value[c.key] === true} title={c.what}
                  onClick={() => onChange(toggleClass(value, c.key))}
                  className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[12px] font-semibold ${value[c.key] === true
                    ? "border-mcz-cyan bg-mcz-cyan/15 text-white" : "border-white/15 text-white/65 hover:border-white/40"}`}>
            <IconImg icon={c.icon} alt="" className="h-6 w-6 rounded-full object-cover" fallback={<span>{c.emoji}</span>} />
            {c.label} only
          </button>
        ))}
      </div>
      {on.map((c) => (
        <p key={c.key} className="text-[10px] leading-relaxed text-white/50">
          <b className="text-white/75">{c.label} only</b>: {c.rule}. Anyone without that is out, including members not rated enough yet.
        </p>
      ))}
      {on.length > 0 && <p className="text-[10px] leading-relaxed text-white/50">{d.note}</p>}
    </div>
  );
}

/** The marks beside a member's name: which classes they are in right now. */
export function ClassMarks({ classes, className = "" }) {
  const d = useClassZ();
  if (!classes?.length || !d?.classes) return null;
  const rows = d.classes.filter((c) => classes.includes(c.key));
  if (!rows.length) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {rows.map((c) => (
        <span key={c.key} title={`${c.label}: ${c.rule}. ${d.note}`}
              className="inline-flex items-center gap-1 rounded-full border border-mcz-gold/40 bg-mcz-gold/10 py-0.5 pl-0.5 pr-2 text-[10px] font-semibold text-mcz-gold">
          <IconImg icon={c.icon} alt="" className="h-4 w-4 rounded-full object-cover" fallback={<span>{c.emoji}</span>} />
          {c.label}
        </span>
      ))}
    </span>
  );
}

/** Where YOU stand on each class, in the server's own sentence, with the way to earn it. */
export function MyClassZ({ className = "" }) {
  const d = useClassZ();
  if (!d?.classes?.length) return null;
  return (
    <div className={`space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 ${className}`} data-tour="classz-mine">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Your classes</p>
      {d.classes.map((c) => {
        const mine = d.mine?.[c.key];
        if (!mine) return null;
        return (
          <div key={c.key} className="flex items-start gap-2">
            <IconImg icon={c.icon} alt="" className={`h-9 w-9 shrink-0 rounded-lg object-cover ${mine.is ? "" : "opacity-40 grayscale"}`}
                     fallback={<span className="text-xl">{c.emoji}</span>} />
            <div className="min-w-0 text-[12px]">
              <p className={`font-semibold ${mine.is ? "text-mcz-gold" : "text-white/80"}`}>{c.label}{mine.is ? " — yours" : ""}</p>
              <p className="text-white/60">{mine.line}</p>
              <p className="text-[10px] text-white/50">{c.rule}.</p>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] leading-relaxed text-white/50">
        {d.note}{" "}
        <button type="button" className="underline text-mcz-cyan" onClick={() => goToSpot("singz", "bosstake-mic")}>
          Score a take with the coach
        </button>
      </p>
    </div>
  );
}
