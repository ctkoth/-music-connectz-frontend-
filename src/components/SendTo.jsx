// "Send to…" — any thing, to any app, in the order the member picks.
//
// Logic is sendto.js. This lists every tab, labels which ones open WITH the thing
// (they read the hand-off) and which only open, and hands the envelope over with
// handOff. Free: sending moves no resource; whatever the destination charges, it
// states on its own control before it is pressed.
import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { IconImg, tabIndex } from "../App.jsx";
import { handOff } from "../handoff.js";
import { SORTS, bump, rankApps, searchApps } from "../sendto.js";

const USAGE_KEY = "mcz_sendto_usage";
const SORT_KEY = "mcz_sendto_sort";
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked */ } };

export default function SendTo({ item, kind = "", from = "", label = "Send to any app" }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(() => read(SORT_KEY, "fit"));
  const [q, setQ] = useState("");
  const usage = read(USAGE_KEY, {});
  const rows = useMemo(() => searchApps(rankApps(tabIndex(), { sort, kind, item, usage, from }), q),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sort, kind, item, from, q, open]);

  const send = (key) => {
    write(USAGE_KEY, bump(read(USAGE_KEY, {}), key));
    handOff(key, null, { ...item, kind: item?.kind || kind, from });
  };

  if (!open) {
    return (
      <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
              onClick={() => setOpen(true)} title="Open this in any other app">
        <Send size={12} /> {label}
      </button>
    );
  }
  return (
    <div className="re-card space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-white">Send to…</p>
        <select aria-label="Order apps by" data-memo="own" value={sort}
                className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                onChange={(e) => { setSort(e.target.value); write(SORT_KEY, e.target.value); }}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <input className="neon-input !py-1 min-w-0 flex-1 text-xs" placeholder="Find an app" aria-label="Find an app"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="text-xs text-white/50 hover:text-white" onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="text-[10px] text-white/35">
        Free. ✓ opens with it; the others open the app. Last and most used count sends from this device.
      </p>
      <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
        {rows.map((r) => (
          <button key={r.key} onClick={() => send(r.key)}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10">
            <IconImg icon={r.icon} alt="" className="h-6 w-6 shrink-0 rounded" />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            {r.carries && <span className="text-emerald-300" title="Opens with it">✓</span>}
          </button>
        ))}
        {rows.length === 0 && <p className="col-span-full text-xs text-white/40">No app matches that.</p>}
      </div>
    </div>
  );
}
