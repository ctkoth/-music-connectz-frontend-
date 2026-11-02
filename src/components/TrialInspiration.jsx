import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { anonId } from "../track.js";
import { InspirationResult, Source } from "./Inspiration.jsx";
import { addSide, asFile } from "../inspirationSources.js";

// Inspiration at the free door: the visitor's own take, heard against a song they want to sound
// like. It decides nothing. Whether it is offered, what it spends, the notices, the link rules and
// every word of the result are the server's (`inspiration` in GET /api/<key>/trial/); a failed
// fetch, or an offer the server did not make, renders nothing at all.
//
// The cost is stated before the button: it uses the SAME free take a scored take would, so the
// visitor chooses which to spend it on. The take is the visitor's own file or recording (no link on
// that side); the reference is a file or a YouTube link — no posts, no FileZ, which are a member's.
// Nothing is saved and no claim token comes back, so the way on is an account, not "keep this".
export default function TrialInspiration({ appKey, take, takeName, onSpent }) {
  const [info, setInfo] = useState(null);
  const [ref, setRef] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    let on = true;
    setInfo(null); setRes(null); setErr(""); setRef(null);
    api(`/api/${appKey}/trial/?anon_id=${encodeURIComponent(anonId())}`, { auth: false })
      .then((d) => { if (on && d?.inspiration?.offered) { setInfo(d.inspiration); setLeft(d.takes_left); } })
      .catch(() => {});
    return () => { on = false; };
  }, [appKey]);

  if (!info) return null;

  const mine = take ? asFile(new File([take], takeName || "take.webm", { type: take.type })) : null;
  const spent = left === 0 || !!res;
  const run = async () => {
    if (!mine || !ref || busy || spent) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const f = new FormData();
      addSide(f, "take", mine);
      addSide(f, "reference", ref);
      f.append("anon_id", anonId());
      const d = await api(`/api/${appKey}/trial/inspiration/`, { method: "POST", body: f, auth: false });
      if (d.unscorable) { setErr(d.unscorable); if (typeof d.takes_left === "number") setLeft(d.takes_left); return; }
      setRes({ ...d, took: mine, against: ref });
      if (typeof d.takes_left === "number") setLeft(d.takes_left);
      onSpent?.(d);
    } catch (e) {
      setErr(`${e.message} Your free take wasn't used.`);
    } finally { setBusy(false); }
  };

  return (
    <section className="mt-4 space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 text-xs text-white/75">
      <h3 className="text-sm font-semibold text-white">✨ {info.feature}</h3>
      <p>Record or attach your take above, then pick a song you want to sound like. The coach tells you what separates them — in the score, the EQ and the how-to.</p>
      <p className="text-white/50">{info.notice}</p>
      {/* The take is whatever is in the recorder above; it is shown, not re-asked. */}
      <p className={mine ? "text-emerald-300/80" : "text-white/45"}>
        {mine ? `Your take: ${takeName || "recording"}` : "Your take: record or attach one above first."}
      </p>
      <Source label="Reference — a file or a YouTube link" side={ref} onSide={setRef} disabled={busy || spent}
              noPosts linkSources={info.link_sources} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={busy || !mine || !ref || spent}
                className="rounded-full border border-mcz-cyan bg-mcz-cyan/15 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Compare"}
        </button>
        {/* Before the press: what it spends, and that a failed run does not. */}
        <span className="text-mcz-ember">−1 free take</span>
        <span className="text-white/40">Not used if it fails · nothing saved</span>
      </div>
      <p className="text-white/50">{info.note}</p>
      {left === 0 && !res && <p className="text-amber-200">Your free takes are used. An account gets the coach whenever you want it.</p>}
      {err && <p role="alert" className="text-red-300">{err}</p>}
      {res && (
        <>
          <InspirationResult res={res} scores={info.scores} trial />
          <p className="rounded border border-mcz-ember/30 bg-mcz-ember/10 p-2 text-center text-white/80">
            A comparison isn't kept for later. <Link to="/register" className="font-semibold text-white underline">Join free</Link> to
            compare as often as you like and keep every score.
          </p>
        </>
      )}
    </section>
  );
}
