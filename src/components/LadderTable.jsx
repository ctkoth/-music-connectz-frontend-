// What each plan holds — every gate in the app, from /api/economy/ladders/, which reads each row off the
// constant that actually gates it. Nothing here is typed: the old typed matrix said DistributeZ was
// "1 / month" for a day after the server moved it to 3 / 6 / 12. Every row opens the app it
// gates (cross-pollination), the member's own column is marked, and a search finds a limit by name.
import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";

export default function LadderTable() {
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/economy/ladders/").then(setD).catch((e) => setErr(e.message || "The plan list didn't load.")); }, []);
  const groups = useMemo(() => {
    if (!d) return [];
    const needle = q.trim().toLowerCase();
    const rows = d.rows.filter((r) => !needle || `${r.label} ${r.group} ${r.note || ""}`.toLowerCase().includes(needle));
    const by = new Map();
    for (const r of rows) { if (!by.has(r.group)) by.set(r.group, []); by.get(r.group).push(r); }
    return [...by.entries()];
  }, [d, q]);
  if (err) return <p className="text-xs text-mcz-ember">{err}</p>;
  if (!d) return null;
  return (
    <div className="space-y-2" data-tour="membershipz-ladders">
      <div className="flex flex-wrap items-center gap-2">
        <p className="re-label">What each plan holds — every limit in the app</p>
        <input className="neon-input !w-48 !py-1 text-xs" placeholder="Find a limit (tracks, storage…)" value={q}
               onChange={(e) => setQ(e.target.value)} aria-label="Find a limit" />
      </div>
      <p className="text-[11px] text-white/60">{d.rule} Tap a row to open the app it's in.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-left text-[11px]">
          <thead className="text-white/55">
            <tr><th className="py-1">&nbsp;</th>
              {d.tiers.map((t) => <th key={t} className={`py-1 text-center ${t === d.mine ? "text-mcz-ember" : ""}`}>{d.labels[t]}{t === d.mine ? " · yours" : ""}</th>)}
            </tr>
          </thead>
          {groups.map(([g, rows]) => (
            <tbody key={g}>
              <tr><td colSpan={4} className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">{g}</td></tr>
              {rows.map((r) => (
                <tr key={r.key} className={`border-t border-white/[0.06] ${r.tab ? "cursor-pointer hover:bg-white/5" : ""}`}
                    onClick={() => r.tab && goToSpot(r.tab, r.target || "")} title={r.note || (r.tab ? "Open it" : "")}>
                  <td className="py-1.5 pr-2 text-white/70">{r.label}</td>
                  {d.tiers.map((t) => {
                    const v = r.values[t];
                    return <td key={t} className={`py-1.5 text-center ${t === d.mine ? "font-semibold text-mcz-ember" : v === "—" ? "text-white/20" : "text-white/60"}`}>{v}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {groups.length === 0 && <p className="text-[11px] text-white/60">Nothing matches "{q}".</p>}
    </div>
  );
}
