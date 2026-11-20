// The key of a song, read from the audio ON THIS DEVICE and said to be an estimate. Free: nothing is
// uploaded and nothing is charged, and the control says so before it is pressed. The key opens ChordZ, which
// shows it at the top with the notes that belong in it (cross-pollination: a fact with somewhere to go).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { detectKeyFromUrl } from "../songKey.js";
import { handOff } from "../handoff.js";

export default function KeyBadge({ url, auto = false, className = "" }) {
  const [state, setState] = useState("idle");        // idle | working | done | none | error
  const [key, setKey] = useState(null);
  useEffect(() => { setState("idle"); setKey(null); }, [url]);
  const run = () => {
    if (!url || state === "working") return;
    setState("working");
    detectKeyFromUrl(url)
      .then((k) => { setKey(k); setState(k ? "done" : "none"); })
      .catch(() => setState("error"));
  };
  useEffect(() => { if (auto && url) run(); }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!url) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 text-[11px] ${className}`} data-keybadge>
      {state === "idle" && (
        <>
          <button type="button" className="pill !text-mcz-cyan" onClick={run}>🎹 Find the key</button>
          <span className="text-white/50"><span className="text-emerald-300">Free</span> · read on your device, nothing uploaded</span>
        </>
      )}
      {state === "working" && <span className="flex items-center gap-1.5 text-white/60"><Loader2 size={12} className="animate-spin" /> Listening for the key…</span>}
      {state === "done" && key && (
        <>
          <span className="rounded-full border border-mcz-cyan/50 bg-mcz-cyan/10 px-3 py-1 text-sm font-bold text-mcz-cyan">🎹 Key: {key.label}</span>
          <span className="text-white/50">estimated · or its relative, {key.relative}</span>
          <button type="button" className="re-link" onClick={() => handOff("chordz", "scalez", { root: key.root, mode: key.mode })}>
            Notes & chords in this key →
          </button>
        </>
      )}
      {state === "none" && <span className="text-white/55">No clear key in this one — it may be drums, speech or a very short clip.</span>}
      {state === "error" && (
        <span className="text-white/55">Couldn't read this audio here.{" "}
          <button type="button" className="underline" onClick={run}>Try again</button></span>
      )}
    </div>
  );
}
