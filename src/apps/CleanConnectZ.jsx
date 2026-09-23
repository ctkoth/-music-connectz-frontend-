// Clean ConnectZ — free up space, MusicConnectZ storage and/or the device.
//
// Ported from the single unmounted copy in src/mcz2/Mcz2App.jsx
// (`CleanConnectZPage`). Two live-app swaps from the mcz2 version:
//
//   getUploadsApi()   -> api("/api/economy/uploads/")   (GET /api/economy/uploads/
//                        — same shape: { uploads, storage_used_mb, storage_mb,
//                        storage_free_mb }, confirmed against
//                        apps/economy/views.py:UploadsView on the backend)
//   deleteUploadApi() -> api(`/api/economy/uploads/${id}/`, { method: "DELETE" })
//                        (UploadDetailView.delete — returns the fresh storage
//                        summary, same as the mcz2 helper did)
//
// Both endpoints are real and already live; nothing here is invented.
//
// Cost/gain: this whole screen is free. Deleting an upload or clearing a
// device cache never touches Energy, SpinaZ or PromptZ — it only frees
// storage, which is the "gain" the cost/gain rule wants stated, so the panel
// says "Free" up front rather than staying silent (silence reads as
// "unaudited", not as "free").
import { useEffect, useState } from "react";
import { Trash2, Smartphone, HardDrive, Sparkles, Bot } from "lucide-react";
import { api } from "../api.js";
import { useCharLimit } from "../limits.js";

const mb = (n) => `${Number(n || 0).toFixed(Number(n) >= 10 || !n ? 0 : 1)}MB`;
const bySize = (u) => Number(u.size_mb ?? u.size ?? (u.bytes ? u.bytes / 1048576 : 0) ?? 0);

const MODES = [
  ["filez", "FileZ", HardDrive],
  ["device", "Device", Smartphone],
  ["both", "Both", Sparkles],
];

export default function CleanConnectZ() {
  const { tier } = useCharLimit(); // "free" | "premium" | "statz"
  const isStatz = tier === "statz";
  const [mode, setMode] = useState("both");
  const [uploads, setUploads] = useState(null);
  const [store, setStore] = useState(null);
  const [target, setTarget] = useState(25);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api("/api/economy/uploads/")
      .then((r) => {
        setUploads(r.uploads || []);
        setStore({ used: r.storage_used_mb, cap: r.storage_mb, free: r.storage_free_mb });
      })
      .catch(() => setUploads([]));
  };
  useEffect(load, []);

  const del = async (id) => {
    try {
      const r = await api(`/api/economy/uploads/${id}/`, { method: "DELETE" });
      setUploads((u) => (u || []).filter((x) => x.id !== id));
      setStore({ used: r.storage_used_mb, cap: r.storage_mb, free: r.storage_free_mb });
    } catch {
      // ignore — the row stays and the member can retry
    }
  };

  const sweep = async () => {
    const list = [...(uploads || [])].sort((a, b) => bySize(b) - bySize(a));
    const needMb = (store?.cap || 0) * (target / 100);
    let freed = 0, n = 0;
    for (const u of list) {
      if (freed >= needMb) break;
      await del(u.id);
      freed += bySize(u);
      n++;
    }
    setMsg((m) => `${m ? m + " · " : ""}Freed ~${freed.toFixed(0)}MB on MusicConnectZ (${n} file${n === 1 ? "" : "s"}).`);
    load();
  };

  const clearDevice = async () => {
    let before = 0, after = 0;
    try { before = (await navigator.storage.estimate()).usage || 0; } catch { /* no Storage API */ }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* no Cache API */ }
    // Clear cache-like localStorage only — never auth tokens or app state.
    try {
      Object.keys(localStorage).forEach((k) => {
        if (/cache|translat|_tmp/i.test(k) && !/mcz_access|mcz_refresh|musicConnectZState/.test(k)) {
          localStorage.removeItem(k);
        }
      });
    } catch { /* storage blocked */ }
    try { after = (await navigator.storage.estimate()).usage || 0; } catch { /* ignore */ }
    const freed = Math.max(0, before - after) / 1048576;
    setMsg((m) => `${m ? m + " · " : ""}Cleared device caches${freed ? ` (~${freed.toFixed(1)}MB)` : ""}.`);
  };

  const run = async () => {
    setBusy(true);
    setMsg("");
    if (mode !== "device") await sweep();
    if (mode !== "filez") await clearDevice();
    setBusy(false);
  };

  const pct = store?.cap ? Math.min(100, (store.used / store.cap) * 100) : 0;
  const big = [...(uploads || [])].sort((a, b) => bySize(b) - bySize(a)).slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="neon-frame p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-mcz-cyan" />
          <h2 className="text-lg font-bold">Clean ConnectZ</h2>
        </div>
        <p className="text-xs text-white/50">
          Free up space — MusicConnectZ storage, your device's caches, or both.{" "}
          <span className="text-emerald-300">Free</span> — this never costs Energy, SpinaZ or PromptZ.
        </p>
      </div>

      <div className="neon-frame p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {MODES.map(([m, l, Icon]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`re-btn text-xs ${mode === m ? "re-btn-cyan" : ""}`}>
              <Icon size={12} className="inline -mt-0.5 mr-1" />{l}
            </button>
          ))}
        </div>

        {mode !== "device" && store && (
          <>
            <div className="text-xs text-white/60 mb-1">
              MusicConnectZ storage: <strong className="text-white/85">{mb(store.used)}</strong> / {mb(store.cap)} · {mb(store.free)} free
            </div>
            <div className="h-2 rounded-md bg-white/10 overflow-hidden my-2">
              <div className={`h-full ${pct > 85 ? "bg-mcz-ember" : "bg-mcz-cyan"}`} style={{ width: `${pct}%` }} />
            </div>
            {isStatz ? (
              <div className="mb-2">
                <label className="text-xs text-white/60">
                  <Bot size={12} className="inline -mt-0.5 mr-1" />
                  AI target — free {target}% of your storage (deletes biggest first)
                </label>
                <input type="range" min="5" max="90" value={target}
                  onChange={(e) => setTarget(Number(e.target.value))} className="w-full" />
              </div>
            ) : (
              <p className="text-[10px] text-mcz-gold mb-2">
                StatZ sets an AI target that auto-clears the biggest files first. You can still delete manually below.
              </p>
            )}
          </>
        )}

        <button className="neon-btn-primary text-xs" disabled={busy} onClick={run}>
          {busy ? "Cleaning…" : mode === "device" ? "Clear device caches"
            : mode === "filez" ? (isStatz ? "Run AI sweep" : "Clean biggest below")
            : "Clean both"}
        </button>
        {msg && <p className="text-xs text-emerald-300 font-semibold mt-2">{msg}</p>}
      </div>

      {mode !== "device" && (
        <div className="neon-frame p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white/70 uppercase tracking-wide">Biggest files</span>
            <span className="pill">{(uploads || []).length}</span>
          </div>
          {uploads === null ? (
            <p className="text-xs text-white/40">Loading…</p>
          ) : big.length === 0 ? (
            <p className="text-xs text-white/40">No files — nothing to clean.</p>
          ) : (
            <div className="space-y-1">
              {big.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <span className="text-xs truncate">
                    {u.name || u.filename || `file ${u.id}`}
                    {bySize(u) > 0 && <span className="text-[10px] text-white/40"> · {mb(bySize(u))}</span>}
                  </span>
                  <button className="re-btn re-btn-red !px-2 !py-1 text-[11px]" onClick={() => del(u.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
