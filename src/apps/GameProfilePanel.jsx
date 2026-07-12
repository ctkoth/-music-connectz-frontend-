import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { api } from "../api.js";

const RAP_STYLES = ["boom-bap","trap","chopper","drill","conscious","emo","melodic","grime",
  "west-coast","east-coast","dirty-south","lofi","hyperpop","freestyle","battle","storytelling"];

export function RapzProfilePanel() {
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api("/api/rapz/profile/").then(setP).catch(() => {}); }, []);
  if (!p) return null;
  const toggle = (s) => setP({ ...p, top_styles: p.top_styles.includes(s) ? p.top_styles.filter((x) => x !== s) : [...p.top_styles, s].slice(0, 3) });
  async function save() {
    try { setP(await api("/api/rapz/profile/", { method: "PATCH", body: p })); setMsg("RapZ profile saved."); }
    catch (e) { setMsg(e.message); }
  }
  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Your RapZ game profile {p.boss_unlocked && "· 👑 BOSS"}</p>
      <p className="text-xs text-white/50">Top 3 styles ({p.top_styles.length}/3):</p>
      <p className="flex flex-wrap gap-1">
        {RAP_STYLES.map((s) => (
          <button key={s} onClick={() => toggle(s)}
            className={`pill text-[10px] ${p.top_styles.includes(s) ? "!border-mcz-gold/60 !text-mcz-gold" : ""}`}>{s}</button>
        ))}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/50">BPM comfort:</span>
        <input className="neon-input !w-20 !py-1.5 text-center" inputMode="numeric" value={p.bpm_min} onChange={(e) => setP({ ...p, bpm_min: +e.target.value || 0 })} />
        <span>—</span>
        <input className="neon-input !w-20 !py-1.5 text-center" inputMode="numeric" value={p.bpm_max} onChange={(e) => setP({ ...p, bpm_max: +e.target.value || 0 })} />
      </div>
      {msg && <p className="text-xs text-mcz-gold">{msg}</p>}
      <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={save}><Save size={14} /> Save</button>
    </div>
  );
}

export function SingzProfilePanel() {
  const [p, setP] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api("/api/singz/profile/").then(setP).catch(() => {}); }, []);
  if (!p) return null;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  async function save() {
    try { setP(await api("/api/singz/profile/", { method: "PATCH", body: p })); setMsg("SingZ profile saved."); }
    catch (e) { setMsg(e.message); }
  }
  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
        Your SingZ voice profile {p.boss_unlocked && "· 🎤 BOSS"}
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[["detected_low","Detected low"],["detected_high","Detected high"],["goal_low","Goal low"],["goal_high","Goal high"]].map(([k, label]) => (
          <label key={k} className="space-y-1 text-xs text-white/50">{label}
            <input className="neon-input !py-1.5 text-center uppercase" placeholder="A2" maxLength={4} value={p[k] || ""} onChange={set(k)} />
          </label>
        ))}
      </div>
      <p className={`rounded-lg px-3 py-2 text-xs ${p.range_work_allowed ? "bg-emerald-400/10 text-emerald-300" : "bg-mcz-pink/10 text-mcz-pink"}`}>
        {p.range_work_allowed
          ? "✅ Voice fresh — range work unlocked."
          : "⛔ Fatigue high — range work paused. Recovery overrides progression. Do a cooldown drill."}
      </p>
      {msg && <p className="text-xs text-mcz-gold">{msg}</p>}
      <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={save}><Save size={14} /> Save</button>
    </div>
  );
}
