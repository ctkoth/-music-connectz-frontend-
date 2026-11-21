// A member-facing notice while the server's upload storage is temporary (see storageNotice.js). Renders nothing unless the server itself says so.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { API_ORIGIN } from "../api.js";
import { goToSpot } from "../goto.js";
import { noticeDue, storageNotice } from "../storageNotice.js";

const KEY = "mcz_storage_notice_closed";

export default function StorageNotice() {
  const [n, setN] = useState(null);
  useEffect(() => {
    let last = 0;
    try { last = Number(localStorage.getItem(KEY)) || 0; } catch { /* blocked: show it */ }
    if (!noticeDue(last)) return undefined;
    let dead = false;
    fetch(`${API_ORIGIN}/`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!dead) setN(storageNotice(j)); })
      .catch(() => {});
    return () => { dead = true; };
  }, []);
  if (!n) return null;
  const close = () => { setN(null); try { localStorage.setItem(KEY, String(Date.now())); } catch { /* blocked */ } };
  return (
    <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-300/10 px-3 py-2 text-xs text-amber-50" data-tour="storage-notice">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">{n.title}</p>
        <p>{n.body}</p>
        <button type="button" className="re-link" onClick={() => goToSpot("filez", "")}>{n.cta}</button>
      </div>
      <button type="button" onClick={close} aria-label="Close for today" className="shrink-0 rounded p-1 text-amber-100/70 hover:bg-white/10"><X size={14} /></button>
    </div>
  );
}
