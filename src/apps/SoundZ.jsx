// SoundZ — pick what the app sounds like.
//
// Sound itself is free at every tier and always was: the header toggle turns
// it on, the house set plays, nobody is charged to hear their own wallet move.
// What Premium buys is CHOOSING A DIFFERENT ONE, which is the right thing to
// sell because it is decoration — the same line KeyConnectZ draws when it puts
// the wallpaper behind Premium and leaves translate free at every tier. Nobody
// loses a capability by staying on the house sound.
//
// A pack is a transform over the one vocabulary, never a second copy of it, so
// the grammar survives every choice: gains rise, spends fall, and a coin never
// sounds like a prompt no matter which pack is on. That is what keeps the set
// learnable — the pack changes the voice, not the language.
import { useEffect, useState } from "react";
import { Loader2, Volume2, Lock, RotateCcw, ArrowRight } from "lucide-react";

import { api } from "../api.js";
import { PACKS, PACK_KEYS, SOUND_KEYS, playSoundNow, setSoundPack,
         isSoundOn, setSoundOn } from "../sound.js";
import { goToTab } from "../goto.js";

// The sounds worth auditioning, in the order they make sense as a demo: money
// moving, then the things that happen to you, then the things you do.
const DEMO = ["spinaz_gain", "energy_spend", "money_earn", "badge",
              "message", "call_ring", "build_done", "post"];

const LABEL = {
  spinaz_gain: "Coin in", energy_spend: "Energy out", money_earn: "Money in",
  badge: "Badge earned", message: "Message", call_ring: "Incoming call",
  build_done: "Build finished", post: "Posted",
};

export default function SoundZ() {
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(isSoundOn());

  useEffect(() => {
    api("/api/economy/soundz/")
      .then((d) => {
        setState(d);
        // Mirror the account's choice into the engine so every other tab in
        // this session sounds right without waiting for its own fetch.
        setSoundPack(d.pack, d.overrides);
      })
      .catch((e) => setErr(e.message || "Couldn't load SoundZ."));
  }, []);

  async function choose(pack) {
    // Audition first, then save. Hearing it after committing is the same
    // mistake as showing a price after the button.
    playSoundNow("spinaz_gain", pack);
    if (!state?.can_customize) return;
    setBusy(true);
    try {
      const d = await api("/api/economy/soundz/", {
        method: "PATCH", body: { pack },
      });
      setState(d);
      setSoundPack(d.pack, d.overrides);
    } catch (e) {
      setErr(e.message || "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  async function overrideOne(soundKey, pack) {
    if (!state?.can_customize) return;
    const next = { ...(state.overrides || {}) };
    if (!pack || pack === state.pack) delete next[soundKey];
    else next[soundKey] = pack;
    playSoundNow(soundKey, pack || state.pack);
    setBusy(true);
    try {
      const d = await api("/api/economy/soundz/", {
        method: "PATCH", body: { overrides: next },
      });
      setState(d);
      setSoundPack(d.pack, d.overrides);
    } catch (e) {
      setErr(e.message || "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundOn(next);
    if (next) playSoundNow("spinaz_gain");
  }

  if (err) return <p className="re-card text-sm text-mcz-ember">{err}</p>;
  if (!state) {
    return <p className="flex items-center gap-2 text-sm text-white/50">
      <Loader2 className="animate-spin" size={15} /> Loading SoundZ…
    </p>;
  }

  const current = state.pack && PACKS[state.pack] ? state.pack : "house";
  const overrides = state.overrides || {};

  return (
    <div className="space-y-4">
      <div className="re-card space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="re-label flex items-center gap-2">
            <Volume2 size={13} className="text-mcz-cyan" /> Sound
          </span>
          <button className={`re-btn !w-auto px-4 ${on ? "re-btn-emerald" : ""}`}
                  onClick={toggle}>
            {on ? "On" : "Off"}
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-white/45">
          Off by default, because a site that makes noise at a stranger is
          hostile. Every sound accompanies a number that's already on screen —
          nothing here is the only way to know something happened.
        </p>
      </div>

      <div className="space-y-2">
        <p className="re-label">Sound pack</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PACK_KEYS.map((k) => {
            const p = PACKS[k];
            const active = k === current;
            const locked = !state.can_customize && k !== "house";
            return (
              <button key={k} disabled={busy}
                      onClick={() => choose(k)}
                      className={`re-card space-y-1 text-left transition ${
                        active ? "!border-mcz-ember" : "hover:!border-white/25"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-extrabold">{p.name}</span>
                  {active && <span className="re-badge">On</span>}
                  {locked && <Lock size={12} className="text-white/30" />}
                </span>
                <span className="block text-[11px] leading-relaxed text-white/45">
                  {p.blurb}
                </span>
                <span className="block text-[10px] text-white/30">
                  {locked ? "Tap to hear it — Premium to keep it" : "Tap to hear it"}
                </span>
              </button>
            );
          })}
        </div>
        {!state.can_customize && (
          <div className="re-card space-y-2 text-[13px] text-white/65">
            <p>
              <b className="text-white/85">Every pack is audible right now</b> — tap
              one and it plays. Keeping one is a Premium perk; the house set and
              the on/off switch are free at every tier, because sound is how you
              hear your own balance move and that shouldn't be sold.
            </p>
            <button className="re-btn re-btn-gold !w-auto px-4"
                    onClick={() => goToTab("membershipz")}>
              See MembershipZ <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="re-label">Hear them</p>
        <div className="flex flex-wrap gap-2">
          {DEMO.map((k) => (
            <button key={k} className="re-btn re-btn-cyan !w-auto px-3 !py-2 !text-xs"
                    onClick={() => playSoundNow(k)}>
              {LABEL[k] || k}
            </button>
          ))}
        </div>
      </div>

      {state.can_customize && (
        <div className="space-y-2">
          <p className="re-label">One sound at a time</p>
          <p className="text-[11px] text-white/45">
            Like the house set but want a louder coin? Take a single sound from
            another pack. {Object.keys(overrides).length}/{state.max_overrides} set.
          </p>
          <ul className="space-y-1.5">
            {SOUND_KEYS.map((k) => (
              <li key={k}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
                <button className="min-w-0 flex-1 truncate text-left text-[12px] text-white/75 hover:text-white"
                        onClick={() => playSoundNow(k, overrides[k])}>
                  {k}
                </button>
                <select
                  className="shrink-0 rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none"
                  value={overrides[k] || ""}
                  disabled={busy}
                  onChange={(e) => overrideOne(k, e.target.value)}>
                  <option value="">same as pack</option>
                  {PACK_KEYS.map((p) => <option key={p} value={p}>{PACKS[p].name}</option>)}
                </select>
              </li>
            ))}
          </ul>
          {Object.keys(overrides).length > 0 && (
            <button className="re-btn !w-auto px-4 !text-xs" disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const d = await api("/api/economy/soundz/", {
                          method: "PATCH", body: { overrides: {} },
                        });
                        setState(d); setSoundPack(d.pack, d.overrides);
                      } finally { setBusy(false); }
                    }}>
              <RotateCcw size={13} /> Clear all overrides
            </button>
          )}
        </div>
      )}
    </div>
  );
}
