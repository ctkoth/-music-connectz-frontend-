import { useEffect, useState } from "react";
import { Loader2, Lock, Plus, Sparkles, Tag } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { loadSocial, saveSocial, isStatZ, SPEC_APPS } from "./socialData.js";

// SpecZ price in SpinaZ (blueprint economy currency).
const SPEC_PRICE = 250;

export default function SpecZ() {
  const [me, setMe] = useState(null);
  const [specs, setSpecs] = useState(() => loadSocial().specz || []);
  const [app, setApp] = useState(SPEC_APPS[0][1]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/auth/me/").then(setMe).catch(() => setMe({ username: "you", tier: "free", spinaz: 0 }));
  }, []);

  useEffect(() => {
    const h = () => setSpecs(loadSocial().specz || []);
    window.addEventListener("mcz-social", h);
    return () => window.removeEventListener("mcz-social", h);
  }, []);

  const statz = isStatZ(me);

  function persist(next) {
    setSpecs(next);
    saveSocial({ ...loadSocial(), specz: next });
  }

  function buySpec() {
    if (!statz) return;
    if (!label.trim() || !value.trim()) {
      setMsg("❌ Add both a SpecZ label and value.");
      return;
    }
    const spec = {
      id: Date.now(),
      app,
      label: label.trim(),
      value: value.trim(),
      owner: me?.username || "you",
      price: SPEC_PRICE,
      boughtAt: new Date().toLocaleDateString(),
    };
    persist([spec, ...specs]);
    setLabel(""); setValue("");
    setMsg(`✨ SpecZ purchased for ${SPEC_PRICE} SpinaZ and attached to ${app}.`);
    setTimeout(() => setMsg(""), 3200);
  }

  function remove(id) {
    persist(specs.filter((s) => s.id !== id));
  }

  if (!me) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading SpecZ…</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="specz.png" alt="SpecZ" className="h-14 w-14 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-2xl font-extrabold text-mcz-cyan">SpecZ ⭐</h2>
          <p className="text-sm text-white/55">User metadata &amp; UGC you attach to any app — a StatZ perk.</p>
        </div>
      </header>

      {/* Purchase / author panel */}
      <div className="neon-frame space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
            <Sparkles size={13} className="text-mcz-cyan" /> Buy a SpecZ
          </p>
          <span className="pill !text-mcz-pink">{SPEC_PRICE} SpinaZ each</span>
        </div>

        {statz ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] text-white/45">Target app</label>
                <select className="neon-input py-2" value={app} onChange={(e) => setApp(e.target.value)}>
                  {SPEC_APPS.map(([, name]) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-white/45">SpecZ label</label>
                <input className="neon-input py-2" placeholder="e.g. Preferred BPM" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/45">SpecZ value (UGC)</label>
              <input className="neon-input py-2" placeholder="e.g. 140–150, dark strings, halftime hats" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <button className="neon-btn-primary !w-auto px-5" onClick={buySpec}>
              <Plus size={15} /> Purchase SpecZ
            </button>
          </>
        ) : (
          <div className="rounded-xl border border-mcz-gold/30 bg-mcz-gold/10 p-4 text-sm">
            <p className="mb-1 flex items-center gap-2 font-semibold text-mcz-gold">
              <Lock size={14} /> SpecZ is a StatZ perk
            </p>
            <p className="text-white/70">
              Upgrade to the <span className="font-semibold text-mcz-cyan">StatZ</span> tier to purchase SpecZ
              and attach custom metadata &amp; UGC to your apps. Your current tier is
              <span className="ml-1 uppercase text-white/90">{me.tier || "free"}</span>.
            </p>
          </div>
        )}
        {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-cyan">{msg}</p>}
      </div>

      {/* Owned SpecZ */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Your SpecZ ({specs.length})</p>
        {specs.length === 0 ? (
          <p className="text-sm text-white/45">No SpecZ yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {specs.map((s) => {
              const appIcon = (SPEC_APPS.find(([, n]) => n === s.app) || [])[0] || "specz.png";
              return (
                <div key={s.id} className="neon-frame flex items-start gap-3 p-4">
                  <IconImg icon={appIcon} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                      <Tag size={11} /> {s.app} · {s.boughtAt}
                    </div>
                    <div className="text-sm font-bold text-white">{s.label}</div>
                    <div className="text-sm text-white/75">{s.value}</div>
                  </div>
                  <button className="text-[11px] text-white/40 hover:text-mcz-pink" onClick={() => remove(s.id)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
