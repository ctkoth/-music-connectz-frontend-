import { useEffect, useState } from "react";
import { api } from "../api.js";
import { shareLink } from "../shareText.js";

// "Post it": one of the member's takes as a PostZ post that plays, with its score and the
// coach's feedback. Everything it says comes from the server (`/api/<key>/take/<id>/post/`) —
// whether there is a recording to play, what the day's submissions are, and the note. The member
// ticks what goes in; nothing is included they did not choose, and the server builds the post from
// what it stored, so no number here can be one the coach did not give.
export default function PostTake({ appKey, take, onClose }) {
  const url = `/api/${appKey}/take/${take.id}/post/`;
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [score, setScore] = useState(true);
  const [feedback, setFeedback] = useState(true);
  const [recording, setRecording] = useState(true);
  const [vis, setVis] = useState("public");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { api(url).then(setInfo).catch((e) => setErr(e.message || "Couldn't load that.")); }, [url]);

  const kept = !!info?.file?.kept;
  async function post() {
    setBusy(true); setErr("");
    try { setDone(await api(url, { method: "POST", body: { score, feedback, recording: recording && kept, visibility: vis } })); }
    catch (e) { setErr(e.message || "Couldn't post it."); }
    finally { setBusy(false); }
  }
  async function share() {
    const how = await shareLink({ text: `${info?.title || "My take"} — listen`, url: done.link });
    setMsg(how === "shared" ? "Shared." : how === "copied" ? "Link copied — paste it anywhere." : "");
  }

  if (err && !info) return <p className="basis-full text-[11px] text-mcz-ember">{err}</p>;
  if (!info) return null;
  if (done) {
    return (
      <div className="basis-full space-y-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.04] p-2.5">
        <p className="text-[12px] font-semibold text-emerald-300">Posted.{done.playable ? " Anyone with the link can play it." : ""}</p>
        <p className="text-[11px] text-white/60">
          In it: {[done.included.score && "the score", done.included.feedback && "the feedback", done.included.card && "the coach's read card", done.included.recording && "the recording"].filter(Boolean).join(", ") || "the title"}.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <a href={done.url} target="_blank" rel="noreferrer" className="text-mcz-cyan underline">Open the post</a>
          <button type="button" onClick={share} className="rounded-md bg-mcz-cyan/10 px-2 py-1 text-mcz-cyan hover:bg-mcz-cyan/20">Share the link</button>
          {msg && <span className="text-emerald-300">{msg}</span>}
          <button type="button" onClick={onClose} className="text-white/45 underline">Close</button>
        </div>
      </div>
    );
  }
  const s = info.submissions || {};
  return (
    <div className="basis-full space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <p className="text-[11px] font-semibold text-white/80">{info.title}</p>
      <label className="flex items-center gap-2 text-[12px] text-white/75"><input type="checkbox" checked={score} onChange={(e) => setScore(e.target.checked)} /> The score</label>
      <label className="flex items-center gap-2 text-[12px] text-white/75"><input type="checkbox" checked={feedback} onChange={(e) => setFeedback(e.target.checked)} /> The coach's feedback</label>
      <label className={`flex items-center gap-2 text-[12px] ${kept ? "text-white/75" : "text-white/30"}`}>
        <input type="checkbox" checked={recording && kept} disabled={!kept} onChange={(e) => setRecording(e.target.checked)} />
        The recording — {kept ? "so it plays on the post" : "not kept, so there is nothing to play"}
      </label>
      {!kept && info.file?.why && <p className="text-[11px] text-white/40">{info.file.why}</p>}
      <label className="flex items-center gap-2 text-[12px] text-white/60">
        Who sees it
        <select data-nomemo="true" aria-label="Who sees this post" value={vis} onChange={(e) => setVis(e.target.value)} className="neon-input !w-auto !py-1 text-[11px]">
          <option value="public">Anyone with the link</option>
          <option value="restricted">Members only</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={post} disabled={busy} className="re-btn !w-auto px-3 text-[12px]">{busy ? "Posting…" : "Post it"}</button>
        <span className="text-[11px] text-emerald-300">Free <span className="text-white/45">— counts as 1 of today's {s.cap} submissions ({s.used} used)</span></span>
        <button type="button" onClick={onClose} className="text-[11px] text-white/45 underline">Cancel</button>
      </div>
      {err && <p className="text-[11px] text-mcz-ember">{err}</p>}
    </div>
  );
}
