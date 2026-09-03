// Paste a URL, get back which platform it is (a known domain instantly, an
// unrecognized one via one AI call) and its logo — before it's attached to
// anything. Shared by any composer that wants to carry links along with a
// post: SocialZ's LinkDetectView is the one place this recognition happens,
// so every composer that uses this component agrees with SocialZ about what
// a domain is, and with EmbedLink about which platforms play inline.
import { useState } from "react";
import { Loader2, Plus, X as XIcon } from "lucide-react";
import { api } from "./api.js";
import { serviceFor } from "./socialServices.jsx";

export default function LinkPicker({ value = [], onChange, label = "Links" }) {
  const [url, setUrl] = useState("");
  const [detected, setDetected] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [err, setErr] = useState("");

  async function detect() {
    if (!url.trim()) return;
    setDetecting(true); setErr("");
    try {
      setDetected(await api("/api/economy/social/detect/", { method: "POST", body: { url: url.trim() } }));
    } catch (e) { setErr(e.message || "Couldn't read that link."); }
    finally { setDetecting(false); }
  }

  function add() {
    if (!url.trim() || !detected) return;
    onChange([...value, { url: url.trim(), label: detected.label, service: detected.service }]);
    setUrl(""); setDetected(null);
  }

  function remove(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((l, i) => {
            const svc = serviceFor(l.service);
            return (
              <li key={`${l.url}-${i}`} className="pill flex items-center gap-1.5 !pr-1.5">
                <svc.Icon size={12} color={svc.color} /> {l.label}
                <button type="button" onClick={() => remove(i)} className="text-white/30 hover:text-mcz-ember">
                  <XIcon size={11} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input className="neon-input !flex-1 !py-2 text-xs" placeholder={`${label} — paste a link (SoundCloud, Spotify, YouTube…)`}
               value={url}
               onChange={(e) => { setUrl(e.target.value); setDetected(null); }}
               onBlur={detect} />
        {detected ? (
          <button type="button" className="re-btn !w-auto px-3 text-xs" onClick={add}>
            <Plus size={12} /> Add {detected.label}
          </button>
        ) : (
          <button type="button" className="re-btn !w-auto px-3 text-xs" disabled={detecting || !url.trim()} onClick={detect}>
            {detecting ? <Loader2 className="animate-spin" size={12} /> : "Detect"}
          </button>
        )}
      </div>
      {err && <p className="text-[10px] text-mcz-ember">{err}</p>}
    </div>
  );
}
