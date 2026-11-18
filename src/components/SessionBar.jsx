// The bar that follows a live BodieZ session around the app.
//
// A session the member chose to keep on screen (sessionHold.js) keeps running when they open another
// app: BodieZ stays mounted, hidden, so its rest clock and its beep carry on. This bar is the part you can
// see — the rest left and which lift is next — with a way back and a way to switch it off. Nothing is
// shown for the app that is on screen: BodieZ's own Today screen already says all of this.
import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { clockText, restLineText, restNow } from "../sessionHold.js";

export default function SessionBar({ hold, activeTab, labelOf, onOpen }) {
  const away = !!hold && hold.tab !== activeTab && !hold.seeded;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!away) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [away]);
  if (!away) return null;
  const app = labelOf(hold.tab) || "BodieZ";
  const r = restNow(hold.rest, now);
  const next = hold.rest?.next || "";
  const sinceSec = hold.since ? Math.max(0, Math.floor((now - hold.since) / 1000)) : null;
  return (
    <div className="sticky top-16 z-40 mb-3">
      <div role="status" aria-label={`${app} session running`}
           className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-lg backdrop-blur ${r?.done
             ? "border-emerald-400/60 bg-black/90 text-white" : "border-mcz-cyan/40 bg-black/85 text-white"}`}>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r?.done ? "animate-pulse bg-emerald-400" : "bg-mcz-cyan"}`} aria-hidden="true" />
          <span className="font-semibold">{hold.title || "Session"}</span>
          {/* aria-hidden: a status region re-announces whatever changes inside it, and this changes every second. */}
          <span className={`tabular-nums ${r?.done ? "text-emerald-300" : "text-white/80"}`} aria-hidden="true">{restLineText(r, next)}</span>
          {sinceSec != null && <span className="tabular-nums text-white/40" aria-hidden="true">· {clockText(sinceSec)} in</span>}
        </span>
        {r && (
          <span className="h-1 w-full overflow-hidden rounded-full bg-white/10 sm:w-24" aria-hidden="true">
            <span className={`block h-full rounded-full ${r.done ? "bg-emerald-400" : "bg-mcz-cyan"}`} style={{ width: `${r.pct}%` }} />
          </span>
        )}
        <span className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => onOpen(hold.tab)}
                  className="flex items-center gap-1 rounded-lg border border-white/25 px-2.5 py-1.5 font-semibold hover:bg-white/10">
            Back to {app} <ArrowRight size={12} aria-hidden="true" />
          </button>
          {hold.off && (
            <button type="button" onClick={() => hold.off()} title="Stop keeping this session on screen (the session itself keeps going in BodieZ)"
                    aria-label="Stop keeping this session on screen"
                    className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
