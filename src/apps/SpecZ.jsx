// SpecZ — metadata you write and attach to an app, and it charges now.
//
// Everything below the download card used to be a lie of omission. `persist()`
// wrote the SpecZ to localStorage: no API call, no balance touched, nothing on
// the server — so it cost nothing, and it did not survive a new browser. And
// MembershipZ sells the SpecZ marketplace as THE StatZ-only perk, which made
// this the one thing advertised as worth a subscription that charged nothing
// at all.
//
// The endpoint that existed sold six analytics products nothing generated, so
// wiring this tab to that catalog would have taken 999 real SpinaZ for a
// report that does not exist. SpecZ is what this tab always did — a label and
// a value on an app — and the server holds it and bills it.
//
// Every number here comes from the server: the price, the balance, whether it
// is affordable, the app list, and both length caps. Nothing is retyped.
import { useEffect, useState } from "react";
import { Download, Loader2, Lock, Plus, Sparkles, Tag, ArrowRight } from "lucide-react";

import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { asList } from "../shape.js";
import { SPINAZ } from "../resources.js";
import { goToTab } from "../goto.js";
import { playSound } from "../sound.js";
import { BUILDS } from "../downloadBuilds.js";

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function SpecZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [app, setApp] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // SpecZ written before this tab talked to the server lived in localStorage
  // and nowhere else. It was never charged and never left the browser, so it
  // cannot be imported — importing it would be handing out free SpecZ. It can
  // still be SAID, which beats somebody's list quietly emptying itself.
  const [stranded] = useState(() => {
    try {
      const old = JSON.parse(localStorage.getItem("mcz_social_v1") || "{}").specz;
      return Array.isArray(old) ? old : [];
    } catch {
      return [];
    }
  });

  const load = () =>
    api("/api/economy/specz/")
      .then((d) => {
        setData(d);
        setErr("");
        setApp((a) => a || asList(d.apps)[0]?.key || "");
      })
      .catch((e) => setErr(e.message || "Couldn't load SpecZ."));
  useEffect(() => { load(); }, []);

  async function buySpec() {
    setBusy(true); setMsg("");
    try {
      await api("/api/economy/specz/buy/", {
        method: "POST", body: { app_key: app, label: label.trim(), value: value.trim() },
      });
      playSound("money_spend");
      setLabel(""); setValue("");
      setMsg(`SpecZ attached — −${data.price_spinaz} ${SPINAZ}.`);
      load();
    } catch (e) {
      // The real error, never a cheerful lie. This screen used to answer
      // "purchased" unconditionally because nothing could fail.
      setMsg(e.message || "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true);
    try {
      await api(`/api/economy/specz/${id}/`, { method: "DELETE" });
      setMsg("");
      load();
    } catch (e) {
      setMsg(e.message || "Couldn't remove that.");
    } finally {
      setBusy(false);
    }
  }

  if (err) return <p className="re-card text-sm text-mcz-ember">{err}</p>;

  if (!data) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading SpecZ…</p>;
  }

  const apps = asList(data.apps);
  const specs = asList(data.items);
  const statz = data.tier === data.tier_required;
  const price = data.price_spinaz;
  const canPay = data.affordable;
  const ready = label.trim() && value.trim() && app;

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

      {stranded.length > 0 && (
        <div className="re-card space-y-1 text-[12px] text-white/60">
          <p className="font-semibold text-white/80">
            {stranded.length} older SpecZ stayed in this browser
          </p>
          <p>
            SpecZ used to be saved to this browser only — never to your account,
            and never charged for. They're listed below so you can write the ones
            you still want; they'd have vanished on your next device either way.
          </p>
          <ul className="pt-1 text-white/45">
            {stranded.slice(0, 8).map((o, i) => (
              <li key={i} className="truncate">· {o.app} — {o.label}: {o.value}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Write a SpecZ */}
      <div className="re-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="re-label flex items-center gap-2">
            <Sparkles size={13} className="text-mcz-ember" /> Write a SpecZ
          </span>
          {/* The price and what you hold, side by side, before anything is
              typed — not discovered by pressing the button. */}
          <span className="flex items-center gap-2 text-sm font-bold">
            <span className="text-mcz-ember">−{price} {SPINAZ}</span>
            <span className="text-[11px] font-normal text-white/40">
              you have {data.spinaz} {SPINAZ}
            </span>
          </span>
        </div>

        {statz ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="re-label mb-1 block">Target app</label>
                {/* The list comes from the server, so this cannot offer an app
                    the server would refuse. */}
                <select className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
                        value={app} onChange={(e) => setApp(e.target.value)}>
                  {apps.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="re-label mb-1 block">SpecZ label</label>
                <input className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
                       maxLength={data.label_max} placeholder="e.g. Preferred BPM"
                       value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="re-label mb-1 block">SpecZ value</label>
              <input className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
                     maxLength={data.value_max} placeholder="e.g. 140–150, dark strings, halftime hats"
                     value={value} onChange={(e) => setValue(e.target.value)} />
              <p className="mt-1 text-[10px] text-white/30">
                Up to {data.value_max} characters. Charged only if it saves, and
                removing one later doesn't refund it.
              </p>
            </div>
            <button className="re-btn !w-auto px-5" onClick={buySpec}
                    disabled={busy || !ready || !canPay}>
              <Plus size={15} /> Attach for −{price} {SPINAZ}
            </button>
            {!canPay && (
              // Not a dead end: the earn screen is one press away.
              <p className="text-[12px] text-white/50">
                That's {price} {SPINAZ} and you have {data.spinaz}.{" "}
                <button className="re-link" onClick={() => goToTab("adz")}>
                  Earn some {SPINAZ} <ArrowRight size={11} className="inline" />
                </button>
              </p>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-sm">
            <p className="mb-1 flex items-center gap-2 font-bold text-mcz-ember">
              <Lock size={14} /> SpecZ is a StatZ perk
            </p>
            <p className="text-white/70">
              Upgrade to <span className="font-semibold text-white">StatZ</span> to attach
              custom metadata to your apps. Your current tier is{" "}
              <span className="uppercase text-white/90">{data.tier || "free"}</span>.
            </p>
            <button className="re-btn re-btn-gold mt-3 !w-auto px-4"
                    onClick={() => goToTab("membershipz")}>
              See MembershipZ <ArrowRight size={13} />
            </button>
          </div>
        )}
        {msg && <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/80">{msg}</p>}
      </div>

      {/* Owned SpecZ */}
      <div>
        <p className="re-label mb-2">Your SpecZ · {specs.length}</p>
        {specs.length === 0 ? (
          <p className="text-sm text-white/45">No SpecZ yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {specs.map((sp) => {
              const meta = apps.find((a) => a.key === sp.app_key);
              return (
                <div key={sp.id} className="re-card flex items-start gap-3">
                  <IconImg icon={meta?.icon || "specz.png"} alt=""
                           className="h-10 w-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    {/* Nothing is a dead end: a SpecZ describes an app, so it
                        opens that app rather than only naming it. */}
                    <button className="flex items-center gap-1.5 text-[11px] text-white/45 hover:text-mcz-ember"
                            onClick={() => goToTab(sp.app_key)}>
                      <Tag size={11} /> {meta?.name || sp.app_key} · {when(sp.created_at)}
                      <ArrowRight size={10} />
                    </button>
                    <div className="truncate text-sm font-bold text-white">{sp.label}</div>
                    <div className="text-sm text-white/75">{sp.value}</div>
                  </div>
                  <button className="shrink-0 text-[11px] text-white/40 hover:text-mcz-ember"
                          title="Remove — this does not refund the SpinaZ"
                          disabled={busy} onClick={() => remove(sp.id)}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
