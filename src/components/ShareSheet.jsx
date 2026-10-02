import { useRef, useState } from "react";
import { Check, Copy, MessageSquare, PenSquare, Share2, X } from "lucide-react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";
import { goToSpot } from "../goto.js";

// Share anything — a post you can see, or one of your own app metrics (your
// sign, a horoscope, your SubstanceZ…) — out of the app or into another one.
//
// Two rules hold it:
//
//   * The OWNER's visibility always wins. Sharing never widens who can see a
//     post: the link opens /p/<id>, which runs the same visibility check as
//     the feed, so a members-only post asks a stranger to sign in and a
//     private one opens for nobody but its author. The sheet SAYS so before
//     anything is sent, because the person sharing should know who will
//     actually be able to open it.
//   * A share is counted only once it really went out — copied, handed to
//     the device's share sheet, or carried into MessageZ / PostZ. That is
//     what /postz/<id>/share/ records, and the +5 ⚡ for sharing somebody
//     else's post is stated on the sheet before it is earned.

const WHO = {
  public: "Anyone with the link can open it.",
  restricted: "Members only — anyone else is asked to sign in first.",
  private: "Private — only its author can open it. Change its visibility to share it.",
};

/**
 * item: { kind: "post"|"metric", title, text, postId?, mine?, visibility?,
 *         opens?: [{ label, tab, target }] }
 */
export default function ShareSheet({ item, onClose }) {
  const opened = useRef(Date.now());
  const [done, setDone] = useState("");
  const [earned, setEarned] = useState(0);
  const url = item.postId ? `${window.location.origin}/p/${item.postId}` : "";
  const blocked = item.kind === "post" && item.visibility === "private" && !item.mine;
  const body = [item.title, item.text, url].filter(Boolean).join("\n\n");

  async function record() {
    if (item.kind !== "post" || !item.postId) return;
    try {
      const r = await api(`/api/economy/postz/${item.postId}/share/`, {
        method: "POST", body: { active_seconds: Math.round((Date.now() - opened.current) / 1000) + (item.seenSeconds || 0) },
      });
      if (r?.rewarded) { setEarned(r.reward_energy || 0); window.dispatchEvent(new Event("mcz-stats-refresh")); }
    } catch { /* the share itself already happened; the count is best-effort */ }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url || body); setDone("copied"); record(); } catch { setDone("copy-failed"); }
  }
  async function native() {
    try { await navigator.share({ title: item.title || "Music ConnectZ", text: item.text || "", url: url || undefined }); setDone("shared"); record(); }
    catch { /* cancelled — nothing went out, nothing is counted */ }
  }
  function toMessage() { record(); onClose?.(); handOff("messagez", "messagez-compose", { title: item.title, description: [item.text, url].filter(Boolean).join("\n\n") }); }
  function toPost() { record(); onClose?.(); handOff("postz", "composer", { title: item.title, description: [item.text, url].filter(Boolean).join("\n\n") }); }

  return (
    <div className="mcz-reveal mt-3 space-y-2 rounded-lg border border-mcz-cyan/30 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">
          <Share2 size={12} className="mr-1 inline" /> Share {item.kind === "post" ? "this post" : "this"}
        </p>
        <button onClick={onClose} aria-label="Close" className="text-white/40 hover:text-white"><X size={14} /></button>
      </div>
      {item.kind === "post" && <p className="text-[11px] text-white/60">{WHO[item.visibility] || WHO.public}</p>}
      {item.kind === "post" && !item.mine && !blocked && (
        <p className="text-[11px] text-emerald-300">+5 ⚡ for your first share of someone else's post, once you've spent 30s with it. Free.</p>
      )}
      {!blocked && (
        <div className="flex flex-wrap gap-2">
          <button className="re-btn !w-auto px-3 py-1.5 text-xs" onClick={copy}>
            {done === "copied" ? <Check size={13} /> : <Copy size={13} />} {url ? "Copy link" : "Copy"}
          </button>
          {typeof navigator !== "undefined" && navigator.share && (
            <button className="re-btn !w-auto px-3 py-1.5 text-xs" onClick={native}><Share2 size={13} /> Share…</button>
          )}
          <button className="re-btn !w-auto px-3 py-1.5 text-xs" onClick={toMessage}><MessageSquare size={13} /> Send in MessageZ</button>
          <button className="re-btn !w-auto px-3 py-1.5 text-xs" onClick={toPost}><PenSquare size={13} /> Post it in PostZ</button>
        </div>
      )}
      {item.opens?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2 text-xs">
          <span className="text-white/45">Open in</span>
          {item.opens.map((o) => (
            <button key={o.label} className="pill hover:text-mcz-gold" onClick={() => { onClose?.(); goToSpot(o.tab, o.target); }}>{o.label}</button>
          ))}
        </div>
      )}
      {done === "copy-failed" && <p className="text-[11px] text-mcz-ember">Couldn't reach the clipboard — long-press the link instead: {url}</p>}
      {earned > 0 && <p className="text-[11px] text-emerald-300">+{earned} ⚡ — thanks for sharing.</p>}
      {(done === "copied" || done === "shared") && !earned && <p className="text-[11px] text-white/50">{done === "copied" ? "Copied." : "Shared."}</p>}
    </div>
  );
}
