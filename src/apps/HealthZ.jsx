import { useEffect, useState } from "react";
import { Loader2, Moon, Stethoscope, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToTab } from "../goto.js";
import { HIDE_HEALTH } from "../platform.js";

// HealthZ — your own sleep log and the conditions you say you have. Free, private, and typed by you.
//
// It records; it never concludes. Nothing here is inferred from your activity, nothing is scored,
// nothing is shown to anybody else, and the screen says so BEFORE anything is typed (the server's
// own `note`). The seven-day average is arithmetic over the nights you logged, and reads "no nights
// logged" — never 0 — when there are none. A failed save says why and that nothing changed.
//
// iOS 1.0 ships without it (`platform.js`): health data has its own review and privacy answers.

const today = () => new Date().toLocaleDateString("en-CA");

function Sleep({ data, onData, onError }) {
  const [f, setF] = useState({ night: today(), hours: "", quality: "", note: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setBusy(true); onError("");
    try {
      const d = await api("/api/economy/healthz/sleep/", { method: "POST", body: { ...f, quality: f.quality || null } });
      onData(d); setF({ night: today(), hours: "", quality: "", note: "" });
    } catch (err) { onError(err.message || "That didn't save — nothing changed."); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    try { onData(await api(`/api/economy/healthz/sleep/${id}/`, { method: "DELETE" })); }
    catch (err) { onError(err.message || "That didn't delete — nothing changed."); }
  }

  return (
    <div className="re-card space-y-3" data-tour="healthz-sleep">
      <span className="re-label flex items-center gap-2"><Moon size={14} className="text-mcz-cyan" /> Sleep</span>
      <p className="text-xs text-white/60">
        {data.avg_hours_7d != null
          ? `Average of the ${data.nights_7d} night${data.nights_7d === 1 ? "" : "s"} you logged this week: ${data.avg_hours_7d} h. That's arithmetic, not a score.`
          : "No nights logged this week yet."}
      </p>
      <form onSubmit={save} className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-white/50">Night
          <input className="neon-input !py-2 text-sm" type="date" max={today()} value={f.night} onChange={set("night")} />
        </label>
        <label className="text-[11px] text-white/50">Hours
          <input className="neon-input !py-2 w-24 text-sm" type="number" min="0.5" max="24" step="0.25" inputMode="decimal"
                 placeholder="7.5" value={f.hours} onChange={set("hours")} />
        </label>
        <label className="text-[11px] text-white/50">How it felt
          <select data-nomemo="true" className="neon-input !py-2 text-sm" value={f.quality} onChange={set("quality")}>
            <option value="">—</option>
            {[[1, "1 · poor"], [2, "2"], [3, "3 · okay"], [4, "4"], [5, "5 · rested"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="Note (optional)" maxLength={300} value={f.note} onChange={set("note")} />
        <button className="neon-btn-primary !w-auto px-4 py-2 text-sm disabled:opacity-40" disabled={busy || !f.hours}>
          {busy ? <Loader2 className="animate-spin" size={14} /> : "Save night"}
        </button>
      </form>
      <p className="text-[11px] text-white/40">Free. Logging a night again edits it.</p>
      {data.sleep.length > 0 && (
        <ul className="space-y-1 text-sm">
          {data.sleep.slice(0, 14).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 border-t border-white/10 pt-1">
              <span className="min-w-0 truncate">
                {s.night} · <b>{s.hours} h</b>{s.quality ? ` · felt ${s.quality}/5` : ""}{s.note ? ` · ${s.note}` : ""}
              </span>
              <button aria-label={`Delete ${s.night}`} className="text-white/40 hover:text-mcz-ember" onClick={() => remove(s.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Conditions({ data, onData, onError }) {
  const [f, setF] = useState({ name: "", since_year: "", note: "", shared: false });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function share(id, shared) {
    try { onData(await api(`/api/economy/healthz/conditions/${id}/`, { method: "PATCH", body: { shared } })); }
    catch (err) { onError(err.message || "That didn't change — nothing was shared."); }
  }

  async function add(e) {
    e.preventDefault(); setBusy(true); onError("");
    try {
      onData(await api("/api/economy/healthz/conditions/", { method: "POST", body: { ...f, since_year: f.since_year || null } }));
      setF({ name: "", since_year: "", note: "", shared: false });
    } catch (err) { onError(err.message || "That didn't save — nothing changed."); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    try { onData(await api(`/api/economy/healthz/conditions/${id}/`, { method: "DELETE" })); }
    catch (err) { onError(err.message || "That didn't delete — nothing changed."); }
  }

  return (
    <div className="re-card space-y-3" data-tour="healthz-conditions">
      <span className="re-label flex items-center gap-2"><Stethoscope size={14} className="text-mcz-cyan" /> Conditions you've been told you have</span>
      <p className="text-xs text-white/60">
        In your own words, for your own reference. Nobody else can see this, nothing reads it to rate, price or
        recommend anything, and it's deleted with your account. HealthZ never suggests one.
      </p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="e.g. Asthma" maxLength={120} value={f.name} onChange={set("name")} />
        <input className="neon-input !py-2 w-24 text-sm" type="number" inputMode="numeric" placeholder="Since (year)" value={f.since_year} onChange={set("since_year")} />
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="Note (optional)" maxLength={500} value={f.note} onChange={set("note")} />
        <label className="flex w-full items-center gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={f.shared} onChange={(e) => setF({ ...f, shared: e.target.checked })} />
          Let adults find me in Social ConnectZ by this
        </label>
        <button className="neon-btn-primary !w-auto px-4 py-2 text-sm disabled:opacity-40" disabled={busy || !f.name.trim()}>
          {busy ? <Loader2 className="animate-spin" size={14} /> : "Add"}
        </button>
      </form>
      <p className="text-[11px] text-white/40">
        Free. Off by default, one condition at a time. Turned on, an adult who searches for that condition can find you;
        nobody gets a list of your conditions, and members under 18 are never shown or shown to anyone.
      </p>
      {data.conditions.length === 0 ? (
        <p className="text-sm text-white/45">Nothing added.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.conditions.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 border-t border-white/10 pt-1">
              <span className="min-w-0">
                <b>{c.name}</b>{c.since_year ? ` · since ${c.since_year}` : ""}{c.note ? ` · ${c.note}` : ""}
              </span>
              <label className="flex shrink-0 items-center gap-1 text-[11px] text-white/55">
                <input type="checkbox" checked={!!c.shared} onChange={(e) => share(c.id, e.target.checked)} /> findable
              </label>
              <button aria-label={`Remove ${c.name}`} className="text-white/40 hover:text-mcz-ember" onClick={() => remove(c.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HealthZInner() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/economy/healthz/").then(setData).catch((e) => setErr(e.message || "Couldn't load HealthZ."));
  }, []);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="healthz.jpg" alt="HealthZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#4ade80" }}>HealthZ</h2>
          <p className="text-sm text-white/60">Your sleep and the conditions you say you have — typed by you, private to you.</p>
        </div>
      </header>

      {data && <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">{data.note}</p>}
      {err && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-ember">{err}</p>}
      {!data && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {data && <Sleep data={data} onData={setData} onError={setErr} />}
      {data && <Conditions data={data} onData={setData} onError={setErr} />}

      <div className="flex flex-wrap gap-2">
        <button className="pill text-xs" onClick={() => goToTab("bodiez")}>💪 Open BodieZ — workouts and recovery</button>
        <button className="pill text-xs" onClick={() => goToTab("breathz")}>🫁 Open BreathZ — free breathing practice</button>
      </div>
    </div>
  );
}

export default function HealthZ() {
  if (HIDE_HEALTH()) {
    return <div className="re-card text-sm text-white/70">HealthZ isn't available in this version of the app.</div>;
  }
  return <HealthZInner />;
}
