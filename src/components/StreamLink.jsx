import { useState } from "react";
import { api } from "../api.js";

// Paste a SoundCloud / Spotify / Apple Music link and see what it is called.
// The server decides the service and says plainly that the coach cannot hear
// audio from it — nothing here pretends the link is scored. Free.
export default function StreamLink() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function look() {
    if (!url.trim()) return;
    setBusy(true); setErr(""); setInfo(null);
    try { setInfo(await api(`/api/economy/streamlink/?url=${encodeURIComponent(url.trim())}`)); }
    catch (e) { setErr(e?.data?.detail || e?.message || "Couldn't read that link."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 p-2.5">
      <p className="text-[11px] text-white/50">Track on SoundCloud, Spotify or Apple Music? Paste the link (free).</p>
      <div className="flex gap-2">
        <input className="neon-input flex-1" value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && look()} />
        <button type="button" className="neon-btn-ghost !w-auto px-3 text-xs" disabled={busy} onClick={look}>
          {busy ? "…" : "Look up"}
        </button>
      </div>
      {err && <p className="text-xs text-red-300">{err}</p>}
      {info && (
        <div className="flex items-start gap-2">
          {info.thumbnail && <img src={info.thumbnail} alt="" className="h-12 w-12 rounded object-cover" />}
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-white">{info.title || `A ${info.label} link`}{info.artist ? ` — ${info.artist}` : ""}</p>
            <a className="text-white/50 underline" href={info.url} target="_blank" rel="noopener noreferrer nofollow">Open on {info.label}</a>
            <p className="mt-1 text-white/60">{info.audio_note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
