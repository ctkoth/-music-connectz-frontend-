// Like, rate and comment on ANY item, by its id ("score:<token>", "post:12"...).
// One bar for every app, on the one social endpoint, so a like is a like everywhere.
// Prices and gains are the server's and sit beside each control before it is pressed:
// a first rating pays the rater (rating_reward_energy), a comment costs ⚡ once the
// day's free ones are used (comment_cost_energy). The server decides what is allowed;
// a refusal is shown as it came.
import { useEffect, useState } from "react";
import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../api.js";
import { ENERGY } from "../resources.js";

export default function SocialBar({ item, canRate = true, compact = false }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(!compact);
  const [body, setBody] = useState("");
  const [score, setScore] = useState("");
  const [reason, setReason] = useState("");

  const load = () => api(`/api/economy/social/?item=${encodeURIComponent(item)}`).then(setD).catch(() => setD(null));
  useEffect(() => { if (item) load(); }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item || !d) return null;

  const act = async (action, payload) => {
    setErr("");
    try { setD(await api(`/api/economy/social/${action}/`, { method: "POST", body: { item, ...payload } })); return true; }
    catch (e) { setErr(e.message || "That didn't go through. Nothing was charged."); return false; }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`inline-flex items-center gap-1 rounded px-2 py-1 ${d.my === 1 ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/70"}`}
                onClick={() => act("react", { value: d.my === 1 ? 0 : 1 })} aria-label="Like"><ThumbsUp size={12} /> {d.up}</button>
        <button className={`inline-flex items-center gap-1 rounded px-2 py-1 ${d.my === -1 ? "bg-mcz-ember/20 text-mcz-ember" : "bg-white/5 text-white/70"}`}
                onClick={() => act("react", { value: d.my === -1 ? 0 : -1 })} aria-label="Dislike"><ThumbsDown size={12} /> {d.down}</button>
        <span className="text-white/50">{d.rating != null ? `Rated ${d.rating}/10 by ${d.rating_count}` : "Not rated yet"}</span>
        <button className="inline-flex items-center gap-1 text-white/60 hover:text-white" onClick={() => setOpen((o) => !o)}>
          <MessageSquare size={12} /> {d.comments.length}
        </button>
      </div>
      {open && (
        <>
          {canRate && (
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Your rating" data-nomemo="true" value={score || d.my_rating || ""}
                      className="rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                      onChange={(e) => setScore(e.target.value)}>
                <option value="">Rate 1-10</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <input className="neon-input !py-1 min-w-0 flex-1 text-xs" maxLength={200} placeholder="Why? (optional, only the maker sees it)"
                     value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="neon-btn-ghost !w-auto px-2 py-1 text-xs" disabled={!score}
                      onClick={async () => { if (await act("rate", { score: Number(score), reason })) { setScore(""); setReason(""); } }}>
                {d.my_rating ? "Change rating" : "Rate"}
              </button>
              {!d.my_rating && d.rating_reward_energy > 0 && <span className="text-emerald-300">+{d.rating_reward_energy} {ENERGY}</span>}
            </div>
          )}
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {d.comments.map((c) => (
              <p key={c.id} className="text-white/70"><span className="font-semibold text-white/85">@{c.user}</span> {c.body}</p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !py-1 min-w-0 flex-1 text-xs" placeholder="Add a comment" aria-label="Comment"
                   value={body} onChange={(e) => setBody(e.target.value)} />
            <button className="neon-btn-ghost !w-auto px-2 py-1 text-xs" disabled={!body.trim()}
                    onClick={async () => { if (await act("comment", { body: body.trim() })) setBody(""); }}>Comment</button>
            <span className={d.comment_cost_energy ? "text-mcz-ember" : "text-white/40"}>
              {d.comment_cost_energy ? `−${d.comment_cost_energy} ${ENERGY}` : `free (${d.comment_free_left} left today)`}
            </span>
          </div>
        </>
      )}
      {err && <p className="text-mcz-ember">{err}</p>}
    </div>
  );
}
