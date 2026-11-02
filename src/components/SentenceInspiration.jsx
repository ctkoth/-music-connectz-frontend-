import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "../api.js";
import { PROMPTZ } from "../resources.js";

// Inspiration for Sentence ConnectZ: pick a song you admire and the coach
// describes HOW it does the thing this kind is for (punchlines, depth, rhymes…)
// — never its words. The direction is added to the brief; Write is still its own
// priced step. Price on the button, failed run free, song not kept.
export default function SentenceInspiration({ info, kind, label, onDirection }) {
  const [file, setFile] = useState(null);
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
      f.append("kind", kind);
      const d = await api("/api/economy/sentencez/inspiration/", { method: "POST", body: f });
      setRes(d);
      if (!d.unscorable) onDirection(d.direction);
    } catch (e) { setErr(`${e.message} Nothing was charged.`); } finally { setBusy(false); }
  };

  return (
    <details className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 text-xs text-white/75">
      <summary className="cursor-pointer text-sm font-semibold text-white">✨ Inspiration — write {label.toLowerCase()} the way a song you admire does</summary>
      <div className="mt-2 space-y-2">
        <p>{info.inspiration_note}</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2">
          <Upload size={14} /><span className="min-w-0 flex-1 truncate">{file ? file.name : "Pick the song"}</span>
          <input type="file" accept="audio/*,video/*" className="hidden" disabled={busy}
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={run} disabled={!file || busy}
                  className="rounded-full border border-mcz-cyan bg-mcz-cyan/15 px-4 py-1.5 font-semibold text-white disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : "Get the direction"}
          </button>
          <span className="text-mcz-ember">{info.free_today ? "Free today — uses 1 free prompt" : `−${info.cost_cents} ${PROMPTZ}`}</span>
          <span className="text-white/40">Not charged if it fails · Write is priced separately</span>
        </div>
        {err && <p className="text-red-300">{err}</p>}
        {res?.unscorable && <p className="text-amber-200">{res.unscorable}</p>}
        {res?.direction && <p className="text-emerald-300">Added to your brief: {res.direction}{res.moves?.length ? ` (${res.moves.join(", ")})` : ""}</p>}
      </div>
    </details>
  );
}
