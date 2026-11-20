// The key of a song, read from the audio ON THIS DEVICE and said to be an estimate. Free: nothing is
// uploaded and nothing is charged, and the control says so before it is pressed. The key opens ChordZ, which
// shows it at the top with the notes that belong in it (cross-pollination: a fact with somewhere to go).
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { detectKeyFromUrl, detectKeyFromChannels } from "../songKey.js";
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

// A small one for a DAW track's header, where there is room for a word and no more: "🎹" to find the key
// of what that track plays (the DAW's own render of it, solo, so other tracks never muddy the answer), then
// the key itself — "Am" / "C" — which opens ChordZ on it. `version` changes when the track's audio does,
// so a key is never left on a track that has been replaced.
export function KeyChip({ measure, version = "" }) {
  const [state, setState] = useState("idle");
  const [key, setKey] = useState(null);
  useEffect(() => { setState("idle"); setKey(null); }, [version]);
  const run = async () => {
    if (state === "working") return;
    setState("working");
    try { const k = detectKeyFromChannels(await measure()); setKey(k); setState(k ? "done" : "none"); }
    catch { setState("error"); }
  };
  if (state === "done" && key) {
    const short = key.mode === "minor" ? `${key.root}m` : key.root;
    return (
      <button type="button" onClick={() => handOff("chordz", "scalez", { root: key.root, mode: key.mode })}
              title={`Key of this track: ${key.label} (estimated; or its relative, ${key.relative}). Tap for its notes and chords in ChordZ.`}
              className="shrink-0 rounded bg-mcz-cyan/15 px-1.5 py-0.5 text-[10px] font-bold text-mcz-cyan">🎹 {short}</button>
    );
  }
  return (
    <button type="button" onClick={run} disabled={state === "working"}
            title={state === "none" ? "No clear key in this track — it may be drums or very short. Tap to try again."
              : state === "error" ? "Couldn't read this track. Tap to try again."
              : "Find this track's key — free, on your device"}
            className="shrink-0 rounded px-1 text-[11px] text-white/50 hover:text-mcz-cyan">
      {state === "working" ? <Loader2 size={11} className="animate-spin" /> : state === "none" ? "🎹 ?" : "🎹"}
    </button>
  );
}
