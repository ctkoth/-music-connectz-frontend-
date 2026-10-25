import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "../api.js";
import { PROMPTZ } from "../resources.js";

// Inspiration for Instrumental ConnectZ: a song to feel like, optionally the
// member's lyrics so the loop leaves room for them. It only SUGGESTS a setup
// (genre, tempo, key, instruments, brief) and fills the form; composing is
// still the separately priced Compose button. Everything shown is the server's.
export default function InstrumentalInspiration({ info, onApply }) {
  const [file, setFile] = useState(null);
  const [lyrics, setLyrics] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  if (!info?.inspiration_note) return null;

  const run = async () => {
    if (!file || busy) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const f = new FormData();
      f.append("reference", file, file.name);
      if (lyrics.trim()) f.append("lyrics", lyrics);
      const d = await api("/api/economy/instrumentalz/inspiration/", { method: "POST", body: f });
      setRes(d);
      if (!d.unscorable) onApply(d);
    } catch (e) { setErr(`${e.message} Nothing was charged.`); } finally { setBusy(false); }
  };

  return (
    <details className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 text-xs text-white/75">
      <summary className="cursor-pointer text-sm font-semibold text-white">✨ Inspiration — make it feel like a song</summary>
      <div className="mt-2 space-y-2">
        <p>{info.inspiration_note}</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2">
          <Upload size={14} /><span className="min-w-0 flex-1 truncate">{file ? file.name : "Pick the song to feel like"}</span>
          <input type="file" accept="audio/*,video/*" className="hidden" disabled={busy}
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <textarea className="neon-input w-full" rows={3} maxLength={4000} value={lyrics}
                  placeholder="Optional: paste your lyrics so the loop leaves room for them"
                  onChange={(e) => setLyrics(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={run} disabled={!file || busy}
                  className="rounded-full border border-mcz-cyan bg-mcz-cyan/15 px-4 py-1.5 font-semibold text-white disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : "Suggest a setup"}
          </button>
          <span className="text-mcz-ember">{info.free_today ? "Free today — uses 1 free prompt" : `−${info.cost_cents} ${PROMPTZ}`}</span>
          <span className="text-white/40">Not charged if it fails · then Compose is priced separately</span>
        </div>
        {err && <p className="text-red-300">{err}</p>}
        {res?.unscorable && <p className="text-amber-200">{res.unscorable}</p>}
        {res && !res.unscorable && (
          <div className="space-y-1">
            <p className="text-emerald-300">Filled in below: {res.genre} · {res.bpm} BPM{res.key ? ` · ${res.key}` : ""} · {res.instruments.join(", ")}</p>
            <p>{res.feel}</p>
            {res.fits_lyrics && <p><b>With your lyrics:</b> {res.fits_lyrics}</p>}
          </div>
        )}
      </div>
    </details>
  );
}
