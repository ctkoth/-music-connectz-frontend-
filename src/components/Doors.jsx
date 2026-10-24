// The Doors bar: the same way out of everything any app makes, in the same order.
//
//   Post it · Share · Send to (MessageZ, JournalZ, CollabZ) · Coach it · (Edit)
//
// It runs no social layer of its own. "Post it" makes the thing a PostZ post, and the
// post is where likes, dislikes, comments, ratings, shares and the other-app doors
// live — one place to rate a piece of work, not one per app. Every door carries the
// thing itself (handoff.js), so nothing arrives empty-handed or is uploaded twice.
//
// item: { title, text?, url?, kind: "audio"|"video"|"image"|"text", uploadId?, postId?,
//         onEdit? }
//
// "Coach it" is offered only for audio and video from one of the member's own uploads
// (the coach reads it by id). An image waits for the design coach rather than being
// offered a door that cannot score it.
import { useEffect, useState } from "react";
import { BookOpen, Handshake, Link2, MessageSquare, Mic2, Pencil, Send, Check } from "lucide-react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";

let doorsCache = null;
function useCoaches(on) {
  const [list, setList] = useState(doorsCache);
  useEffect(() => {
    if (!on || doorsCache) return;
    api("/api/economy/trialdoorz/", { auth: false })
      .then((d) => { doorsCache = Array.isArray(d?.doors) ? d.doors : []; setList(doorsCache); })
      .catch(() => setList([]));
  }, [on]);
  return list;
}

export default function Doors({ item, className = "", noPost = false }) {
  const [coachOpen, setCoachOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Every stored file's address is /api/economy/media/<id>/<name>, so an app only has
  // to pass the URL; the server still checks the file is the member's own.
  const uploadId = item.uploadId || Number((String(item.url || "").match(/\/media\/(\d+)\//) || [])[1]) || null;
  const coachable = (item.kind === "audio" || item.kind === "video") && uploadId;
  const coaches = useCoaches(coachOpen);
  const url = item.postId ? `${window.location.origin}/p/${item.postId}` : item.url || "";
  const media = item.url && item.kind !== "text" ? { [`${item.kind}_url`]: item.url } : {};
  const carry = { title: item.title, description: item.text || "", ...media };
  const btn = "re-btn !w-auto px-2.5 py-1 text-[11px]";

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  }
  function coach(app) {
    setCoachOpen(false);
    handOff(app, "", { kind: "upload", upload_id: uploadId, title: item.title,
                       coach_kind: item.kind, ...media });
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} data-doors>
      {!item.postId && !noPost && (
        <button type="button" className={btn} onClick={() => handOff("postz", "post-compose", carry)}
                title="Becomes a post: likes, ratings, comments, shares. The price is on PostZ's button.">
          <Send size={12} /> Post it
        </button>
      )}
      {url && (
        <button type="button" className={btn} onClick={copy}>
          {copied ? <Check size={12} /> : <Link2 size={12} />} {copied ? "Copied" : "Copy link"}
        </button>
      )}
      <button type="button" className={btn} onClick={() => handOff("messagez", "messagez-compose", { ...carry, description: [item.text, url].filter(Boolean).join("\n\n") })}>
        <MessageSquare size={12} /> Message
      </button>
      <button type="button" className={btn} onClick={() => handOff("journalz", "journalz-composer", carry)}>
        <BookOpen size={12} /> Journal
      </button>
      <button type="button" className={btn} onClick={() => handOff("collabz", "collabz-partner", carry)}>
        <Handshake size={12} /> Collab
      </button>
      {coachable && (
        <button type="button" className={btn} onClick={() => setCoachOpen((o) => !o)} aria-expanded={coachOpen}>
          <Mic2 size={12} /> Coach it
        </button>
      )}
      {item.onEdit && (
        <button type="button" className={btn} onClick={item.onEdit}><Pencil size={12} /> Edit</button>
      )}
      {coachOpen && (
        <div className="basis-full space-y-1 pt-1">
          <p className="text-[11px] text-white/50">Which coach? The price is on the coach's own Send button.</p>
          <div className="flex flex-wrap gap-1.5">
            {(coaches || []).map((c) => (
              <button key={c.app_key} type="button" className="pill text-[11px]" onClick={() => coach(c.app_key)}>{c.label}</button>
            ))}
            {coaches && coaches.length === 0 && <span className="text-[11px] text-mcz-ember">Couldn't load the coaches.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
