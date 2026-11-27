// Lilith's voice: how she talks to you when she suggests something. Everyone hears her as she is by default (the
// INFJ voice). StatZ members can choose another way of talking, and each choice shows a short example. A tier
// decides who may choose, never whether a member hears her: the default is everyone's. Every choice is the
// server's list, and the example is the server's sentence, so nothing about a voice is typed here.
import { useState } from "react";
import { StatzSample } from "./StatzSample.jsx";

export default function LilithVoice({ voice, onChoose }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!voice) return null;
  const styles = voice.styles || [];
  const current = styles.find((s) => s.key === voice.style);
  const pick = async (style) => {
    setBusy(true);
    setErr("");
    try { await onChoose(style); }
    catch (e) { setErr(e.message || "Couldn't save that."); }
    finally { setBusy(false); }
  };
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3 text-[12px]" data-tour="lilith-voice">
      <h3 className="flex items-center gap-2 font-display text-sm font-bold">🌙 Lilith's voice</h3>
      {!voice.allowed ? (
        <>
          <StatzSample what="Choosing Lilith's voice" />
          <p className="text-white/60">{voice.locked}</p>
          {current && <p className="text-white/75">She talks to you as <b>{current.label}</b>.</p>}
        </>
      ) : (
        <>
          <p className="text-white/60">
            Pick how she talks to you. Every line still states the record first: a voice changes how a thing is said,
            never what it is.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {styles.map((s) => (
              <button key={s.key} type="button" aria-pressed={voice.style === s.key} disabled={busy}
                      onClick={() => pick(s.key)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] ${
                        voice.style === s.key
                          ? "bg-fuchsia-500/25 text-fuchsia-100 ring-1 ring-fuchsia-400/50"
                          : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                {s.label}
              </button>
            ))}
          </div>
          {current && (
            <div className="space-y-1 rounded-lg bg-black/30 px-3 py-2">
              <p className="text-white/60">{current.about}</p>
              <p className="text-white/85"><span className="text-white/45">Example: </span>{current.sample}</p>
            </div>
          )}
        </>
      )}
      {err && <p className="text-mcz-ember">{err}</p>}
    </section>
  );
}
