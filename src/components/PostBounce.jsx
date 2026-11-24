// "Post it" for a finished mix, in place, and what comes with a post: the five controls anybody can use on it (Karma + mood,
// Rate, Comment, Share, Open in…) and the Coach, right under it. Used by the DAWs once a bounce is saved to FileZ. The price is on
// the button before it is pressed (cost/gain): what leaves in red, what arrives in green, and a failed post charges nothing.
// It decides nothing: the cost, today's posts left and every refusal are the server's.
import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { api } from "../api.js";
import { ENERGY } from "../resources.js";
import { mediaItems, primaryMedia } from "../uploadWork.js";
import SocialBar from "./SocialBar.jsx";
import Doors from "./Doors.jsx";

export default function PostBounce({ url, uploadId, title: initialTitle = "", sizeMb = 0 }) {
  const [title, setTitle] = useState(initialTitle);
  const [vis, setVis] = useState("public");             // PostZ's post visibility: "public" or "private" (an empty string would hide it from every feed)
  const [price, setPrice] = useState(null);                 // { cost: { amount } } in ⚡
  const [subs, setSubs] = useState(null);                   // posts with media left today
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let on = true;
    api("/api/economy/postz/cost/").then((d) => on && setPrice(d)).catch(() => {});
    api("/api/economy/submissions/").then((d) => on && setSubs(d)).catch(() => {});
    return () => { on = false; };
  }, []);
  const cost = price?.cost?.amount || 0;
  const slotsOut = subs && subs.remaining <= 0;
  const link = done ? `${window.location.origin}/p/${done.id}` : "";

  async function post() {
    if (busy || !title.trim() || slotsOut) return;
    setBusy(true); setErr("");
    try {
      const work = { audio_url: url };
      const created = await api("/api/economy/postz/", { method: "POST", body: { title: title.trim(), visibility: vis, ...primaryMedia(work), items: mediaItems(work, title.trim()) } });
      setDone(created);
    } catch (e) { setErr(e.message || "Couldn't post that. Nothing was charged."); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }

  if (done) {
    return (
      <div className="space-y-2 rounded-xl border border-emerald-300/30 bg-emerald-300/[0.05] p-3" data-tour="daw-posted">
        <p className="text-[13px] font-semibold text-emerald-300">Posted — "{done.title}" is on PostZ.</p>
        {vis === "private" ? <p className="text-[11px] text-white/55">Only you can open it, so there is nothing to share yet.</p> : (
          <p className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
            <span className="break-all font-mono text-white/80">{link}</span>
            <button type="button" className="re-btn !w-auto px-2 py-0.5 text-[11px]" onClick={copy}>{copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy link</>}</button>
          </p>
        )}
        <SocialBar item={`post:${done.id}`} />
        <Doors item={{ title: done.title, url, kind: "audio", uploadId, postId: done.id }} />
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-tour="daw-post-bounce">
      <p className="text-xs font-semibold text-white/80">Post it to PostZ</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input className="neon-input !w-64 !py-1" value={title} maxLength={160} placeholder="Title" onChange={(e) => setTitle(e.target.value)} aria-label="Post title" />
        <select className="neon-input !w-auto !py-1" data-nomemo="true" value={vis} onChange={(e) => setVis(e.target.value)} aria-label="Who can see it">
          <option value="public">Public</option><option value="private">Only me</option>
        </select>
        <button type="button" className="neon-btn-primary !w-auto px-3" disabled={busy || !title.trim() || slotsOut} onClick={post}>
          {busy ? <><Loader2 size={13} className="animate-spin" /> Posting…</> : <><Send size={13} /> Post it</>}
        </button>
        <span className="flex flex-wrap items-center gap-x-3 text-[12px]">
          {cost > 0 ? <span className="text-mcz-ember">−{cost} {ENERGY}</span> : <span className="text-emerald-300">Free to post</span>}
          {subs && <span className={slotsOut ? "text-mcz-ember" : "text-mcz-ember/80"}>−1 <span className="text-white/60">of {subs.remaining} posts with media left today</span></span>}
          <span className="text-emerald-300">+ Karma, ratings, comments and a link to share</span>
        </span>
      </div>
      <p className="text-[11px] text-white/50">The file is already saved to FileZ{sizeMb ? ` (${sizeMb.toFixed(1)} MB)` : ""}, so posting uses no more storage. Nothing is charged if the post fails.</p>
      {slotsOut && <p className="text-xs text-mcz-ember">You've used today's posts with media. It renews tomorrow.</p>}
      {err && <p className="text-xs text-mcz-ember" role="alert">{err}</p>}
    </div>
  );
}
