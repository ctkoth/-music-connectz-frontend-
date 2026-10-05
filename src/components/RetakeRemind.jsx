// The trial's way back. A stranger who scores once and closes the tab was
// gone for good — no account, no email, nothing to come back through — and
// the coach's real value is the CHANGE between two takes, which needs a second
// visit by definition. One field: email me this score, remind me to retake.
//
// It decides nothing. Whether mail can actually leave (`remind.ready`) and the
// schedule sentence are the server's (apps/economy/retake.py). With no mail
// configured the server says so and this renders NOTHING — a form that
// answered "sent" while mail went to a console would be the "saved" lie.
//
// The schedule is stated BEFORE the button, for the cost/gain rule's reason:
// what they are signing up for is three emails, and that is the price.
import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { anonId, track } from "../track.js";

export default function RetakeRemind({ claimToken, remind, appKey }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");

  if (!remind?.ready || !claimToken) return null;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const d = await api("/api/economy/trial/remind/", {
        method: "POST", auth: false,
        body: { claim_token: claimToken, email: email.trim(), anon_id: anonId() },
      });
      setSent(d?.email || email.trim());
      // Inside the try, after the thing it measures: an analytics line must
      // never be what takes a working control down (see BossTake's history).
      track("try_email", { app_key: appKey });
    } catch (ex) {
      // The server's own sentence — it knows whether the address was wrong,
      // the take expired, or the inbox has had enough today.
      setErr(ex?.message || "That didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm">
        <p className="font-semibold text-emerald-300">Sent to {sent}.</p>
        <p className="mt-1 text-[12px] text-white/65">{remind.schedule}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} data-tour="trial-remind"
          className="mt-4 rounded-xl border border-mcz-cyan/30 bg-mcz-cyan/5 p-4 text-sm">
      <p className="font-semibold text-white">Not ready for an account? Get it by email.</p>
      <p className="mt-1 text-[12px] text-white/60">
        Your score and drill, plus a nudge to send the same take again and see if it moved.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
               placeholder="you@example.com" autoComplete="email" inputMode="email"
               aria-label="Email address"
               className="neon-input min-w-0 flex-1" />
        <button type="submit" disabled={busy} className="re-btn re-btn-cyan !w-auto px-5">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
          Email me this
        </button>
      </div>
      {/* The price of the button, before it is pressed. */}
      <p className="mt-2 text-[11px] text-white/45">Free · {remind.schedule}</p>
      {err && <p className="mt-2 text-[12px] text-mcz-ember">{err}</p>}
    </form>
  );
}
