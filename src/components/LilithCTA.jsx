// Lilith's call-to-action routines: the ones she keeps FOR you because the platform's own records
// show you did the thing (a scored take, a post, a message), the ones she suggests from who you say
// you are and what you actually do, and the starter library.
//
// It decides nothing. The suggestions and their reasons, every starter's name and description, the
// cadence, the goal, the progress and the milestones are the server's. A routine marked verified is
// never ticked here — the board asks the server to sweep and the server answers from its records —
// so there is no button that could turn a checked claim into a typed one.
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Flame, Sparkles } from "lucide-react";
import { goToSpot } from "../goto.js";
import { ENERGY, SPINAZ } from "../resources.js";

export const CADENCE = {
  daily: { emoji: "🌅", label: "Daily", unit: "d", per: "day" },
  weekly: { emoji: "📅", label: "Weekly", unit: "w", per: "week" },
  monthly: { emoji: "🗓️", label: "Monthly", unit: "mo", per: "month" },
};

const Rung = ({ m }) => (
  <span className="whitespace-nowrap text-[11px] font-semibold text-emerald-300">
    {m.spinaz ? `+${m.spinaz} ${SPINAZ} ` : ""}{m.energy ? `+${m.energy} ${ENERGY}` : ""}
  </span>
);

function Progress({ p, cadence }) {
  if (!p) return null;
  return (
    <span className={`text-[11px] ${p.met ? "text-emerald-300" : "text-white/55"}`}>
      {p.met ? "✅" : "⏳"} {p.done} of {p.goal} {p.period}
      {cadence && !p.met ? "" : ""}
    </span>
  );
}

/** Every routine the member has, grouped by how often it is kept. */
export function RoutineList({ routines, keep }) {
  return Object.keys(CADENCE).map((c) => {
    const rows = routines.filter((r) => (r.cadence || "daily") === c);
    if (!rows.length) return null;
    return (
      <div key={c} className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {CADENCE[c].emoji} {CADENCE[c].label}
        </p>
        {rows.map((r) => (
          <div key={r.id} className="space-y-1 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
              <span className="text-[12px] text-mcz-ember">🔥 {r.streak}{CADENCE[c].unit}</span>
              {r.verified && <span className="text-[11px] text-mcz-cyan" title="Lilith keeps this one from your real activity">✨ verified</span>}
              {r.next_milestone && (
                <span className="text-[11px] text-white/45">
                  {r.next_milestone.away} {r.next_milestone.unit}{r.next_milestone.away === 1 ? "" : "s"} →{" "}
                  <Rung m={r.next_milestone} />
                </span>
              )}
              {r.open_in?.tab && (
                <button onClick={() => goToSpot(r.open_in.tab, r.open_in.target)}
                        className="flex items-center gap-1 rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">
                  Do it <ArrowRight size={12} />
                </button>
              )}
              {r.verified ? (
                <span className={`rounded-md border px-2 py-1 text-[11px] ${r.done_period
                  ? "border-emerald-400/40 text-emerald-300" : "border-white/10 text-white/40"}`}>
                  {r.done_period ? `Kept ${r.period_now}` : "Lilith keeps it"}
                </span>
              ) : (
                <button onClick={() => keep(r)} disabled={r.done_period}
                        className="rounded-md border border-emerald-400/40 px-2 py-1 text-[11px] text-emerald-300 disabled:border-white/10 disabled:text-white/30">
                  {r.done_period ? `Kept ${r.period_now}` : "Keep it"}
                </button>
              )}
            </div>
            {r.note && <p className="text-[11px] text-white/40">{r.note}</p>}
            {r.verified && <Progress p={r.progress} cadence={c} />}
          </div>
        ))}
      </div>
    );
  });
}

/** What Lilith suggests, and why. Suggests only — nothing is added until it is tapped. */
export function Suggested({ items, add, busyKey }) {
  if (!items?.length) return null;
  return (
    <section className="space-y-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-3">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold text-fuchsia-200">
        <Sparkles size={15} /> Lilith suggests
      </h3>
      <p className="text-[11px] text-white/45">From who you say you are and what you actually do. Nothing is added until you tap it.</p>
      {items.map((s) => (
        <div key={s.key} className="space-y-1 rounded-lg bg-white/5 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 text-sm font-semibold">
              {CADENCE[s.cadence]?.emoji} {s.title}
              <span className="ml-2 text-[11px] font-normal text-white/40">{CADENCE[s.cadence]?.label}</span>
            </span>
            <button onClick={() => add("routine", s.key, s.app_key)} disabled={busyKey === s.key}
                    className="re-btn !w-auto px-3 py-1 text-[11px]">
              {busyKey === s.key ? "…" : "Add"}
            </button>
          </div>
          <p className="text-[11px] text-fuchsia-200/80">{s.why}</p>
          <p className="text-[11px] text-white/40">{s.note}</p>
        </div>
      ))}
    </section>
  );
}

/** The whole library: every routine by cadence, and the one-off tasks. */
export function Starters({ starters, add, busyKey }) {
  const [open, setOpen] = useState(false);
  if (!starters) return null;
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left font-display text-sm font-bold">
        <Flame size={15} className="text-mcz-ember" /> Starter routines &amp; tasks
        <ChevronDown size={14} className={`ml-auto ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3">
          {Object.keys(CADENCE).map((c) => (
            <div key={c} className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{CADENCE[c].emoji} {CADENCE[c].label} routines</p>
              {starters.routines.filter((r) => r.cadence === c).map((r) => (
                <div key={r.key} className="flex flex-wrap items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.title} {r.verified && <span title="Lilith keeps it from your real activity">✨</span>}</p>
                    <p className="text-[11px] text-white/45">{r.note}</p>
                  </div>
                  {r.on_board ? <span className="text-[11px] text-emerald-300"><Check size={12} className="inline" /> on your board</span>
                    : <button onClick={() => add("routine", r.key)} disabled={busyKey === r.key} className="re-btn !w-auto px-3 py-1 text-[11px]">Add</button>}
                </div>
              ))}
            </div>
          ))}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">✅ One-off tasks</p>
            {starters.tasks.map((t) => (
              <div key={t.key} className="flex flex-wrap items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t.title} {t.verified && <span title="Lilith ticks it from your real activity">✨</span>}</p>
                  <p className="text-[11px] text-white/45">{t.note}</p>
                </div>
                {t.on_board ? <span className="text-[11px] text-emerald-300"><Check size={12} className="inline" /> on your board</span>
                  : <button onClick={() => add("task", t.key)} disabled={busyKey === t.key} className="re-btn !w-auto px-3 py-1 text-[11px]">Add</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Build your own call-to-action from the actions the server can verify. */
export function BuildCTA({ actions, onMake }) {
  const [f, setF] = useState({ title: "", action: "", cadence: "weekly", goal: 1 });
  if (!actions?.length) return null;
  const sel = actions.find((a) => a.key === f.action);
  return (
    <form className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"
          onSubmit={(e) => { e.preventDefault(); if (sel) { onMake({ ...f, title: f.title.trim() || sel.label }); setF({ ...f, title: "" }); } }}>
      <p className="font-display text-sm font-bold">🎯 Build a call-to-action</p>
      <p className="text-[11px] text-white/45">Pick something the platform can see you do. Lilith keeps it for you when the records show it — no ticking.</p>
      <div className="flex flex-wrap gap-2">
        <select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} data-nomemo="true" aria-label="What to do"
                className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm">
          <option value="">What to do…</option>
          {actions.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <select value={f.cadence} onChange={(e) => setF({ ...f, cadence: e.target.value })} data-nomemo="true" aria-label="How often"
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm">
          {Object.entries(CADENCE).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        <input type="number" min={1} max={50} value={f.goal} data-nomemo="true"
               onChange={(e) => setF({ ...f, goal: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
               className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm" aria-label="How many per period" />
        <button type="submit" disabled={!sel} className="re-btn !w-auto px-4 disabled:opacity-40">Add</button>
      </div>
      {sel && <p className="text-[11px] text-white/40">{f.goal} {sel.unit}{f.goal === 1 ? "" : "s"} {f.cadence === "daily" ? "a day" : f.cadence === "weekly" ? "a week" : "a month"} — opens {sel.app_key}.</p>}
    </form>
  );
}
