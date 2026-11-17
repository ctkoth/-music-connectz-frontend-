// Share a maker's piece: the one press that turns something private into an item with the whole
// social bar (karma, reactions, ratings, comments, share, open in). Free. Before it is pressed it
// says who will be able to see it; once shared it shows the link, the bar and Unshare.
import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { api } from "../api.js";
import SocialBar from "./SocialBar.jsx";

/** `known`: what a list already fetched in one call — a token, or "" for not shared — so a long
 *  list does not ask once per row. Left undefined, the control asks for itself. */
export default function ShareIt({ kind, refId, compact = true, known, who }) {
  const [s, setS] = useState(() => (known === undefined ? null
    : { shared: !!known, token: known || "", item: known ? `shared:${known}` : "", who: who || "Anyone with the link can open it." }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!refId || known !== undefined) return;
    api(`/api/economy/sharez/?kind=${kind}&ref=${refId}`).then(setS).catch(() => setS(null));
  }, [kind, refId, known]);
  if (!refId || !s) return null;
  const share = async () => {
    setBusy(true); setMsg("");
    try { setS(await api("/api/economy/sharez/", { method: "POST", body: { kind, ref: refId } })); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  const unshare = async () => {
    setBusy(true);
    try { await api(`/api/economy/sharez/${s.token}/`, { method: "DELETE" }); setS({ ...s, shared: false, token: "", item: "" }); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };
  const link = s.token ? `${window.location.origin}/x/${s.token}` : "";
  return (
    <div className="space-y-1.5 text-xs">
      {!s.shared ? (
        <div className="flex flex-wrap items-center gap-2">
          <button className="re-btn !w-auto px-3" disabled={busy} onClick={share}><Share2 size={12} /> Share it <span className="text-emerald-300">free</span></button>
          <span className="text-white/45">{s.who}</span>
        </div>
      ) : <>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-emerald-300">Shared</span>
          <button className="re-link" onClick={() => { navigator.clipboard?.writeText(link); setMsg("Link copied."); }}><Copy size={11} className="inline" /> Copy link</button>
          <button className="re-link text-white/50" disabled={busy} onClick={unshare}>Unshare</button>
        </div>
        <SocialBar item={s.item} compact={compact} />
      </>}
      {msg && <p className="text-white/60">{msg}</p>}
    </div>
  );
}
