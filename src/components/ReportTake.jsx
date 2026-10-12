import { useState } from "react";
import { Flag } from "lucide-react";
import { api } from "../api.js";

// Play asks an app that generates content with AI to let a member flag it from
// inside the app. The SkillZ app puts this under every coach score (BossTake mounts
// it only there); the owner's moderation queue is where it lands, the same endpoint
// and the same shape Sentence ConnectZ and OCC already use.
//
// It says what reporting DOES before the button that does it: the report names the
// score by id, and the owner can read the score and what the coach wrote about it.
// The recording itself is not kept after it is scored — a fresh take is read once,
// scored, and dropped (apps/economy/vocalcoach.py: no Upload row is made for it) —
// so there is nothing to hear, and the screen does not imply there is.
export default function ReportTake({ takeId, appKey }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // No id means the server did not keep the take, so there is nothing to point the
  // report at; an honest absence beats a button that files a report about nothing.
  if (!takeId) return null;
  if (done) return <p className="text-xs text-white/55">{done}</p>;
  if (!open) {
    return (
      <button type="button" className="inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white"
              onClick={() => setOpen(true)}>
        <Flag size={11} aria-hidden="true" /> Report this output
      </button>
    );
  }
  const send = async () => {
    setErr("");
    setBusy(true);
    try {
      await api("/api/economy/report/", {
        method: "POST", body: { item: `take:${appKey}:${takeId}`, reason, note },
      });
      setDone("Reported. It's in the owner's queue.");
    } catch (e) {
      setErr(e.message || "That didn't send.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
      <p className="text-white/60">
        Reporting tells the owner which score this is. They can read the score and what the
        coach wrote about it. Your recording isn't kept, so they can't hear it.
      </p>
      <label className="block text-white/60" htmlFor={`rep-take-${takeId}`}>What is wrong with it?</label>
      <select id={`rep-take-${takeId}`} className="neon-input" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="harassment">Harassment</option>
        <option value="hate">Hate or abuse</option>
        <option value="nsfw">Adult content</option>
        <option value="other">Something else — it's wrong, or unsafe advice</option>
      </select>
      <input className="neon-input w-full" maxLength={280} placeholder="Anything we should know (optional)"
             aria-label="Anything we should know" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      <div className="flex gap-3">
        <button type="button" className="re-btn !w-auto px-3" onClick={send} disabled={busy}>Send report</button>
        <button type="button" className="text-white/50 hover:text-white" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
