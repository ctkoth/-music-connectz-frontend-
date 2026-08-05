// HabitZ 🫠 — and CodeZ 🧩 / PathZ 🛤️ / MistakeZ 😢, which are the same screen.
//
// Four kinds over one table: notice something, tally it, say which repeats
// matter. The kinds, their emoji and their blurbs come from the server so this
// file cannot disagree with what is actually being recorded.
//
// Nothing is watched until the member switches it on, and switching it off
// forgets what it collected — the toggle IS the consent, so it says what it
// will record before it starts.
import { useEffect, useState } from "react";
import { Loader2, Trash2, EyeOff, ArrowRight } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";

const OPEN_LABEL = { singz: "SingZ", rapz: "RapZ", postz: "PostZ", profilez: "ProfileZ",
                     social: "Social ConnectZ", messagez: "MessageZ", logz: "LogZ" };

export default function HabitZ() {
  const [data, setData] = useState(null);
  const [kind, setKind] = useState("habit");
  const [order, setOrder] = useState("desc");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    api(`/api/economy/observationz/?kind=${kind}&order=${order}`)
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load."))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(); }, [kind, order]); // eslint-disable-line react-hooks/exhaustive-deps

  const kinds = asList(data?.kinds);
  const active = kinds.find((k) => k.key === kind);
  const rows = asList(data?.observations);

  async function setWatching(next) {
    const warn = !next && (active?.count || 0) > 0;
    if (warn && !window.confirm(
      `Turn ${active.label} off? The ${active.count} thing${active.count === 1 ? "" : "s"} it has noticed will be forgotten.`)) return;
    try {
      await api("/api/economy/observationz/consent/", { method: "POST", body: { kind, enabled: next } });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function dismiss(row) {
    try {
      await api("/api/economy/observationz/", { method: "POST", body: { kind, key: row.key, dismissed: true } });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function forgetAll() {
    if (!window.confirm(`Forget everything ${active?.label || "this"} has noticed? This can't be undone.`)) return;
    try {
      await api(`/api/economy/observationz/?kind=${kind}`, { method: "DELETE" });
      load();
    } catch (e) { setErr(e.message); }
  }

  if (!data && !err) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="habitz.png" alt="HabitZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">{active?.label || "HabitZ"}</h2>
          <p className="text-xs text-white/45">{active?.blurb}</p>
        </div>
      </header>

      {err && <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>}

      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button key={k.key} onClick={() => setKind(k.key)}
            className={`pill text-[11px] ${kind === k.key ? "!border-mcz-cyan/70 !text-white" : ""}`}>
            {k.emoji} {k.label}{k.count ? ` · ${k.count}` : ""}
          </button>
        ))}
      </div>

      {/* The toggle IS the consent. It says what it will record before it starts. */}
      <div className="re-card flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-white">
            {active?.watching ? "Watching" : "Not watching"} — {active?.label}
          </p>
          <p className="text-[11px] leading-relaxed text-white/50">
            {active?.watching
              ? "Turning this off forgets everything it has noticed, not just future ones."
              : `Nothing is recorded until you switch this on. ${active?.blurb || ""}`}
          </p>
        </div>
        <button onClick={() => setWatching(!active?.watching)}
          className={active?.watching ? "re-btn !w-auto px-4 !text-red-300" : "neon-btn-primary !w-auto px-4"}>
          {active?.watching ? "Stop watching" : "Start watching"}
        </button>
      </div>

      {active?.watching && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button onClick={() => setOrder(order === "desc" ? "asc" : "desc")} className="pill">
              {order === "desc" ? "Most repeated first" : "Least repeated first"}
            </button>
            <span className="text-white/35">
              {data?.significant || 0} worth noting · {data?.threshold}+ repeats counts
            </span>
            <button onClick={forgetAll} className="ml-auto flex items-center gap-1 text-red-300/70 hover:text-red-300">
              <Trash2 size={12} /> Forget everything
            </button>
          </div>

          <div className="neon-frame divide-y divide-white/[0.06]">
            {rows.length === 0 && (
              <p className="p-4 text-sm text-white/45">
                Nothing noticed yet {busy ? "…" : "— it needs a few repeats before anything shows."}
              </p>
            )}
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className={`w-12 shrink-0 text-right font-bold tabular-nums ${
                  r.significant ? "text-mcz-cyan" : "text-white/35"}`}>×{r.count}</span>
                <span className="flex-1 text-[12px] text-white/75">{r.label}</span>
                {r.significant && (
                  <span className="pill !text-mcz-gold text-[10px]">significance {r.significance}/10</span>
                )}
                {/* Cross-pollination: take it somewhere, don't just read it. */}
                {r.open_in && (
                  <button onClick={() => goToSpot(r.open_in, r.target?.split(":")[1])}
                    className="flex items-center gap-1 text-[11px] font-semibold text-mcz-ember hover:brightness-125">
                    Open in {OPEN_LABEL[r.open_in] || r.open_in} <ArrowRight size={12} />
                  </button>
                )}
                <button onClick={() => dismiss(r)} title="Not a habit — stop showing this"
                  className="text-white/30 hover:text-white/60"><EyeOff size={13} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
