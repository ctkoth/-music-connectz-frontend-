// The other trial door — the one with no permission prompt in front of it.
//
// 103 people landed last month, 13 opened the recorder, 1 got a score. The
// 87% who never started did not decline a coaching session; they declined a
// microphone, from a site they had never heard of, usually on a phone, before
// being given anything. The trial take is the right payoff and the wrong
// entrance.
//
// This asks for nothing: sixteen statements, about ninety seconds, and it
// ends the way the take does — knowing something about YOU. That is the part
// that converts, not the subject matter.
//
// Everything it knows comes from GET /api/economy/personalityz/test/ — the
// statements, the scale, the axes and the sentence about neither side being
// better. A client that scored this itself would be the second place the
// question bank lives, and a bank that drifts out of balance stops measuring
// personality and starts measuring how agreeable somebody is.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, RotateCcw } from "lucide-react";
import { api } from "../api.js";
import { track } from "../track.js";

const LABEL = { basic: "the short one", advanced: "the long one" };

export default function PersonalityTest() {
  const { depth: raw } = useParams();
  const depth = raw === "advanced" ? "advanced" : "basic";
  const [spec, setSpec] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let on = true;
    setSpec(null); setAnswers({}); setResult(null); setMsg("");
    api(`/api/economy/personalityz/test/?depth=${depth}`, { auth: false })
      .then((d) => { if (on) { setSpec(d); track("quiz_view", { depth }); } })
      .catch((e) => on && setMsg(e.message || "Couldn't load the questions."));
    return () => { on = false; };
  }, [depth]);

  const done = useMemo(
    () => (spec ? spec.questions.filter((q) => answers[q.id] !== undefined).length : 0),
    [spec, answers],
  );

  async function submit() {
    setBusy(true); setMsg("");
    try {
      const out = await api("/api/economy/personalityz/test/", {
        method: "POST", auth: false, body: { depth, answers },
      });
      setResult(out);
      track("quiz_done", { depth, axes: Object.keys(out.axes || {}).length });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      // The real error. A quiz that silently does nothing on submit is the
      // same dead button the recorder had.
      setMsg(e.message || "Couldn't score that — nothing was lost, try again.");
    } finally { setBusy(false); }
  }

  if (msg && !spec) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-mcz-ember">{msg}</div>;
  }
  if (!spec) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-4 py-20 text-white/50">
        <Loader2 className="animate-spin" size={18} /> Loading…
      </div>
    );
  }

  const axisOf = (key) => spec.axes.find((a) => a.key === key);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/login" className="text-sm text-white/60 hover:text-white">Sign in</Link>
      </header>

      {result ? (
        <div className="space-y-5">
          <div className="neon-frame p-6 text-center">
            <p className="text-[11px] uppercase tracking-widest text-white/45">Your PersonalitieZ</p>
            <p className="my-3 font-display text-6xl font-extrabold tracking-tight text-mcz-cyan">
              {result.code || "—"}
            </p>
            {!result.code && (
              <p className="text-sm text-white/60">
                You answered down the middle on every axis. That is a real answer, not a
                missing one — but the long version asks more, if you want a sharper read.
              </p>
            )}
            <div className="mt-4 space-y-2 text-left">
              {spec.axes.map((a) => {
                const letter = result.axes?.[a.key];
                const clarity = result.clarity?.[a.key] ?? 0;
                const side = letter === a.left.code ? a.left : letter === a.right.code ? a.right : null;
                return (
                  <div key={a.key}>
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className={side ? "text-white" : "text-white/35"}>
                        {side ? <><span className="font-bold text-mcz-cyan">{side.code}</span> {side.label}</>
                              : <>{a.left.label} / {a.right.label} — you sat in the middle</>}
                      </span>
                      <span className="text-white/40">{clarity}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-mcz-cyan" style={{ width: `${Math.max(2, clarity)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* The number is consistency, not quality, and the one place
                somebody would assume otherwise is right under a percentage. */}
            <p className="mt-3 text-left text-[11px] leading-relaxed text-white/40">
              The percentage is how consistently your answers pointed one way — not how
              good the answer is. Neither side of any axis is better, and a 55% is not a
              worse result than a 95%.
            </p>
          </div>

          <div className="rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center">
            <p className="mb-3 text-sm text-white/85">
              {result.saved
                ? "Saved to your profile — people can find you by these letters now."
                : "This isn't saved anywhere yet. A free account keeps it, and puts you in the search people use to find collaborators."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {!result.saved && (
                <Link to="/register" className="re-btn !w-auto px-5">Save this — free account</Link>
              )}
              <Link to="/try" className="re-btn re-btn-cyan !w-auto px-5">Now get a take scored</Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[12px]">
            {depth === "basic" && (
              <Link to="/test/advanced" className="re-link">
                Take the 48-question version — same four letters, a sharper read
              </Link>
            )}
            <button className="re-link inline-flex items-center gap-1"
                    onClick={() => { setResult(null); setAnswers({}); }}>
              <RotateCcw size={12} /> Start again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
              What kind of collaborator are you?
            </h1>
            <p className="mt-1 text-sm text-white/55">
              {spec.count} statements, {LABEL[depth]}. No account, no microphone, nothing to install.
            </p>
            {/* Before the first question, not after the result. */}
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">{spec.note}</p>
          </div>

          <div className="space-y-3">
            {spec.questions.map((q, i) => (
              <div key={q.id} className="re-card">
                <p className="mb-2 text-[13px] text-white/85">
                  <span className="mr-2 text-white/30">{i + 1}.</span>{q.text}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {spec.choices.map((c) => (
                    <button key={c.value} type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: c.value }))}
                      className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
                        answers[q.id] === c.value
                          ? "border-mcz-cyan/70 bg-mcz-cyan/10 text-white shadow-neon"
                          : "border-white/10 bg-black/30 text-white/55 hover:bg-white/5"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-3 mt-5">
            <div className="neon-frame flex flex-wrap items-center justify-between gap-3 p-3">
              <span className="text-[12px] text-white/55">{done} of {spec.count} answered</span>
              <button className="neon-btn-primary !w-auto px-6" onClick={submit} disabled={busy || !done}>
                {busy ? <Loader2 className="animate-spin" size={15} /> : null}
                {busy ? "Scoring…" : "See my letters"}
              </button>
            </div>
            {/* Skipping is allowed and says what it costs: an axis you leave
                blank comes back unsaid, which is honest rather than guessed. */}
            {!!done && done < spec.count && (
              <p className="mt-2 text-center text-[11px] text-white/35">
                You can send it part-answered — any axis you skip comes back unsaid rather than guessed.
              </p>
            )}
            {msg && <p className="mt-2 text-center text-[11px] text-mcz-ember">{msg}</p>}
          </div>
        </>
      )}
    </div>
  );
}
