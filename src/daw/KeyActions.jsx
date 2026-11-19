// The Actions window — Azrael's front door (Reaper's action list and themes). Every DAW action with
// its shortcut: press Change, then the key you want. One key does one thing, so a key taken from
// another action is said. And skins: a colour for the whole DAW. On this device, free; skins ladder by
// Corey's numbers (Free 3, Premium 6, StatZ all).
import { useEffect, useState } from "react";
import { ACTIONS, DEFAULTS, SKINS, assign, keyName } from "./keymap.js";
import { loadLimits, TIER_LABEL } from "../limits.js";
import { goToSpot } from "../goto.js";

export default function KeyActions({ keymap, onKeymap, skin, onSkin }) {
  const [listening, setListening] = useState(null);
  const [note, setNote] = useState("");
  const [lim, setLim] = useState(null);
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;
  useEffect(() => {
    if (!listening) return undefined;
    const grab = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === "Escape") { setListening(null); return; }
      const name = keyName(e);
      if (!name) return;
      const taken = ACTIONS.find(([id]) => id !== listening && keymap[id] === name);
      onKeymap(assign(keymap, listening, name));
      setNote(taken ? `${name} now does "${ACTIONS.find(([id]) => id === listening)[1]}" — it no longer does "${taken[1]}".` : "");
      setListening(null);
    };
    window.addEventListener("keydown", grab, true);
    return () => window.removeEventListener("keydown", grab, true);
  }, [listening, keymap, onKeymap]);
  return (
    <div className="neon-frame space-y-3 p-4" data-tour="daw-actions">
      <h3 className="font-semibold">Actions &amp; shortcuts <span className="text-xs font-normal text-emerald-300">free</span></h3>
      <div className="space-y-1">
        {ACTIONS.map(([id, label]) => (
          <div key={id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs">
            <span className="flex-1">{label}</span>
            <kbd className="min-w-[90px] rounded bg-black/40 px-2 py-0.5 text-center">{listening === id ? "press a key…" : keymap[id] || "—"}</kbd>
            <button className="re-btn !w-auto px-2" onClick={() => { setNote(""); setListening(id); }}>Change</button>
            {keymap[id] !== DEFAULTS[id] && <button className="re-link" onClick={() => onKeymap(assign(keymap, id, DEFAULTS[id]))}>default</button>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button className="re-btn !w-auto px-3" onClick={() => onKeymap({ ...DEFAULTS })}>Reset all shortcuts</button>
        <span className="text-white/60">Escape cancels. Kept on this device, for this DAW.</span>
      </div>
      {note && <p className="text-xs text-mcz-gold">{note}</p>}
      <h3 className="pt-2 font-semibold">Skin</h3>
      <div className="flex flex-wrap gap-1.5">
        {SKINS.map(([k, label], i) => {
          const ok = cap == null || i < cap;
          return (
            <button key={k} disabled={!ok} onClick={() => onSkin(k)}
              className={`pill text-[11px] ${skin === k ? "!border-mcz-cyan !text-mcz-cyan" : ""} ${ok ? "" : "opacity-50"}`}>{label}{ok ? "" : " — upgrade"}</button>
          );
        })}
      </div>
      {cap != null && cap < SKINS.length && (
        <p className="text-[11px] text-white/60">{cap} of {SKINS.length} skins on {TIER_LABEL[lim?.tier] || "your tier"}.{" "}
          <button className="re-link" onClick={() => goToSpot("membershipz", "")}>Premium has 6; StatZ has all</button></p>
      )}
    </div>
  );
}
