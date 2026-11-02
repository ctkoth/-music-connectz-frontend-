// SentenceZ — the text editor in ToolZ, with a writing coach. Write or paste lyrics; get them scored on the same five
// lyric dimensions the voice coach uses, each with its reason and the one fix. Any
// dimension under the server's `fix_below` (6) gets a door into the Sentence ConnectZ
// fixer for that dimension, carrying your words.
//
// It decides nothing: the dimensions, the price, the limit, the threshold and every
// number come from /api/economy/writecoach/.
import { useEffect, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";
import { PROMPTZ } from "../resources.js";
import { Price } from "../components/Price.jsx";
import AiEnergy, { useAiEnergy } from "../components/AiEnergy.jsx";
import { RatingNumber, RatingRow } from "../components/Rating.jsx";
import LoadGate from "../components/LoadGate.jsx";
import Doors from "../components/Doors.jsx";

export default function SentenceZ() {
  const [s, setS] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [res, setRes] = useState(null);
  const ae = useAiEnergy();

  const load = () => api("/api/economy/writecoach/").then((d) => { setS(d); setLoadErr(""); })
    .catch((e) => setLoadErr(e.message || "The writing coach didn't load."));
  useEffect(() => { load(); }, []);

  async function score() {
    setBusy(true); setMsg(""); setRes(null);
    try {
      const r = await api("/api/economy/writecoach/", { method: "POST", body: { text, title } });
      setRes(r); load();
    } catch (e) { setMsg(e.message || "Couldn't score that. Nothing was charged."); }
    finally { setBusy(false); }
  }
  function fix(d) {
    handOff("sentenceconnectz", "", { kind: d.fixer, text });
  }

  if (!s) return <LoadGate error={loadErr} what="the writing coach" onRetry={load} />;
  const over = text.length > s.max_chars;
  const m = ae?.xp_multiplier || 1;
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="re-card space-y-2">
        <h2 className="font-display text-xl font-extrabold">SentenceZ</h2>
        <p className="text-sm text-white/60">
          Your lyrics, scored on {Object.values(s.dimensions).join(", ")} — each with the reason and the one fix.
          Anything under {s.fix_below} opens the Sentence ConnectZ writer for that, with your words.
        </p>
        <p className="text-[11px] text-white/40">{s.caveat}</p>
      </div>

      <div className="re-card space-y-2" data-tour="sentencez-editor">
        <input className="neon-input !py-2 text-sm" placeholder="Title (optional)" maxLength={120}
               value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <textarea className="neon-input min-h-[14rem] font-mono text-sm" placeholder="Write or paste your lyrics…"
                  value={text} onChange={(e) => setText(e.target.value)} aria-label="Lyrics" />
        <p className={`text-[11px] ${over ? "text-mcz-ember" : "text-white/35"}`}>{text.length.toLocaleString()} / {s.max_chars.toLocaleString()}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button className="neon-btn-primary !w-auto px-5" disabled={busy || !text.trim() || over || !s.configured || !s.affordable} onClick={score}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />} Score my writing
          </button>
          <span className="text-[11px]">
            <Price amount={s.cost_cents} emoji={PROMPTZ} freeToday={s.free_today} /> <AiEnergy />{" "}
            <span className="text-emerald-300">+{Math.round(10 * m)}–{Math.round(60 * m)} ⭐</span>
            <span className="text-white/40"> · an unreadable answer isn't charged</span>
          </span>
        </div>
        {!s.configured && <p className="text-xs text-mcz-ember">The writing coach isn't switched on yet.</p>}
        {msg && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}
      </div>

      {res && (
        <div className="re-card space-y-3">
          <div className="flex items-baseline gap-3">
            <RatingNumber value={res.score} exact={res.score_exact} outOf />
            <p className="flex-1 text-[13px] text-white/75">{res.verdict}</p>
          </div>
          {res.xp_awarded > 0 && <p className="text-[12px] text-emerald-300">+{res.xp_awarded} ⭐ XP</p>}
          {res.dimensions.map((d) => (
            <div key={d.key} className="space-y-1 rounded-lg bg-white/5 p-2.5">
              <RatingRow value={d.score} label={d.label} detail={d.why} />
              {d.fix && <p className="text-[12px] text-white/60">Fix: {d.fix}</p>}
              {d.fixer && (
                <button type="button" className="re-link text-[12px]" onClick={() => fix(d)}>
                  Fix {d.label.split(" ")[0].toLowerCase()} in Sentence ConnectZ →
                </button>
              )}
            </div>
          ))}
          <Doors item={{ title: title || "My lyrics", text, kind: "text" }} />
        </div>
      )}

      {s.history?.length > 0 && (
        <div className="space-y-1">
          <p className="re-label">Your reads</p>
          {s.history.map((h) => (
            <RatingRow key={h.id} value={h.overall} exact={h.overall} label={h.title || new Date(h.created_at).toLocaleDateString()}
                       detail={Object.entries(h.scores).map(([k, v]) => `${s.dimensions[k]?.split(" ")[0] || k} ${v}`).join(" · ")} />
          ))}
        </div>
      )}
    </div>
  );
}
