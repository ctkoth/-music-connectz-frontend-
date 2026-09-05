// JournalZ's month, and the two things it is for.
//
// Scrolling a list works for the last fortnight and fails completely at "what
// was I doing last March" — which is the question a diary exists to answer and
// the one JournalZ could not. A month grid is how every diary since paper has
// been navigated.
//
// EVERY CELL IS A DOOR. A day you kept opens what you wrote; a day you missed
// opens the composer set to that date. Thirty cells that do nothing is not
// navigation, it is wallpaper — and this app has a rule against read-only
// surfaces.
//
// The server decides what a day IS (which entries, which mood, whether it is
// in the future) and hands back `action`. This draws it.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";

const MOOD_DOT = {
  great: "bg-emerald-400", good: "bg-mcz-cyan", ok: "bg-white/40",
  low: "bg-mcz-gold", rough: "bg-mcz-ember",
};

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

export default function JournalCalendar({ onOpenDay, onWriteDay }) {
  const [month, setMonth] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    setBusy(true);
    api(`/api/economy/journalz/calendar/${month ? `?month=${month}` : ""}`)
      .then((d) => on && setData(d))
      .catch(() => {})
      .finally(() => on && setBusy(false));
    return () => { on = false; };
  }, [month]);

  const days = asList(data?.days);

  return (
    <div className="re-card space-y-3" data-tour="journalz-calendar">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMonth(data?.prev_month || "")}
          className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <div className="font-display text-sm font-extrabold">{data?.label || "…"}</div>
          {data && (
            <div className="text-[10px] text-white/35">
              {data.kept_this_month} of {data.days_in_month} days kept
            </div>
          )}
        </div>
        <button
          onClick={() => setMonth(data?.next_month || "")}
          className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
        {busy && <Loader2 size={13} className="animate-spin text-white/30" />}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[9px] uppercase tracking-wider text-white/30">
        {DOW.map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Lead-in blanks so the 1st lands under the right weekday. */}
        {Array.from({ length: data?.first_dow ?? 0 }).map((_, i) => (
          <div key={`pad${i}`} />
        ))}
        {days.map((d) => {
          const n = Number(d.day.slice(-2));
          const dead = d.action === "none";
          return (
            <button
              key={d.day}
              disabled={dead}
              onClick={() => (d.kept ? onOpenDay?.(d) : onWriteDay?.(d.day))}
              title={
                dead ? "Not yet — a diary records what happened"
                : d.kept ? `${d.title || "Kept"}${d.mood_label ? ` · ${d.mood_label}` : ""}`
                : `Write ${d.day}`
              }
              aria-label={`${d.day}${d.kept ? `, kept${d.count > 1 ? `, ${d.count} entries` : ""}` : ", nothing written"}`}
              className={`relative aspect-square rounded-lg border text-[11px] transition
                ${d.kept
                  ? "border-mcz-cyan/40 bg-mcz-cyan/10 text-white hover:border-mcz-cyan/80"
                  : dead
                  ? "border-white/[0.04] text-white/15"
                  : "border-white/[0.07] text-white/35 hover:border-white/25 hover:text-white/70"}
                ${d.today ? "!border-mcz-gold/70" : ""}`}
            >
              {n}
              {/* The mood, as a dot. A word per cell would not fit and a
                  colour is the thing you can read at a glance across a month. */}
              {d.mood && (
                <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                  MOOD_DOT[d.mood] || "bg-white/40"}`} />
              )}
              {d.count > 1 && (
                <span className="absolute right-0.5 top-0.5 text-[8px] text-mcz-cyan">{d.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-white/30">
        A day you kept opens what you wrote. A day you missed opens writing it.
      </p>
    </div>
  );
}
