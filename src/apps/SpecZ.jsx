import { useEffect, useState } from "react";
import { Download, Loader2, Lock, Plus, Sparkles, Tag } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { loadSocial, saveSocial, isStatZ, SPEC_APPS } from "./socialData.js";
import { SPINAZ } from "../resources.js";
import { BUILDS } from "../downloadBuilds.js";

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
    setMsg(`✨ SpecZ purchased for ${SPEC_PRICE} ${SPINAZ} and attached to ${app}.`);
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
      <header className="flex items-center gap-3">
        <IconImg icon="specz.png" alt="SpecZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">SpecZ</h2>
          <p className="text-xs text-white/45">User metadata &amp; UGC you attach to any app — a StatZ perk.</p>
        </div>
      </header>

      {/* Get the app. Not a SpecZ, but the same question — what your device can
          take — and this is the only mounted tab that asks it. */}
      <div className="re-card space-y-2">
        <span className="re-label flex items-center gap-2">
          <Download size={13} className="text-mcz-cyan" /> Get Music ConnectZ on your device
        </span>
        <p className="text-[11px] leading-relaxed text-white/45">
          The desktop and Android builds load the live site, so they are always
          whatever the web app is — there is no version to keep up to date.
          <span className="text-emerald-300"> Free</span>, and no account action:
          these are downloads, not purchases.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {BUILDS.map((b) => (
            <a key={b.key} href={b.href} target="_blank" rel="noreferrer"
               className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 transition hover:border-mcz-cyan/50">
              <p className="text-[13px] font-semibold text-white">{b.emoji} {b.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{b.note}</p>
            </a>
          ))}
        </div>
        {/* Said before the download, not discovered at the warning — the same
            rule the rest of this app follows about prices. */}
        <p className="text-[11px] leading-relaxed text-white/35">
          Neither Windows build is code-signed yet, so SmartScreen shows
          "unrecognised app" the first time: <b className="text-white/60">More info → Run anyway</b>.
        </p>
      </div>

      {/* Purchase / author panel */}
      <div className="re-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="re-label flex items-center gap-2"><Sparkles size={13} className="text-mcz-ember" /> Buy a SpecZ</span>
          <span className="text-sm font-bold text-mcz-ember">{SPEC_PRICE} SpinaZ<span className="text-[11px] font-normal text-white/40"> each</span></span>
        </div>

        {statz ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="re-label mb-1 block">Target app</label>
                <select className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60" value={app} onChange={(e) => setApp(e.target.value)}>
                  {SPEC_APPS.map(([, name]) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="re-label mb-1 block">SpecZ label</label>
                <input className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60" placeholder="e.g. Preferred BPM" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="re-label mb-1 block">SpecZ value (UGC)</label>
              <input className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60" placeholder="e.g. 140–150, dark strings, halftime hats" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <button className="re-btn !w-auto px-5" onClick={buySpec}>
              <Plus size={15} /> Purchase for −{SPEC_PRICE} {SPINAZ}
            </button>
          </>
        ) : (
          <div className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-sm">
            <p className="mb-1 flex items-center gap-2 font-bold text-mcz-ember">
              <Lock size={14} /> SpecZ is a StatZ perk
            </p>
            <p className="text-white/70">
              Upgrade to the <span className="font-semibold text-white">StatZ</span> tier to purchase SpecZ
              and attach custom metadata &amp; UGC to your apps. Your current tier is
              <span className="ml-1 uppercase text-white/90">{me.tier || "free"}</span>.
            </p>
          </div>
        )}
        {msg && <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-mcz-ember">{msg}</p>}
      </div>

      {/* Owned SpecZ */}
      <div>
        <p className="re-label mb-2">Your SpecZ · {specs.length}</p>
        {specs.length === 0 ? (
          <p className="text-sm text-white/45">No SpecZ yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {specs.map((s) => {
              const appIcon = (SPEC_APPS.find(([, n]) => n === s.app) || [])[0] || "specz.png";
              return (
                <div key={s.id} className="re-card flex items-start gap-3">
                  <IconImg icon={appIcon} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-white/45">
                      <Tag size={11} /> {s.app} · {s.boughtAt}
                    </div>
                    <div className="text-sm font-bold text-white">{s.label}</div>
                    <div className="text-sm text-white/75">{s.value}</div>
                  </div>
                  <button className="text-[11px] text-white/40 hover:text-mcz-ember" onClick={() => remove(s.id)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
