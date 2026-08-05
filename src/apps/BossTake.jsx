// SingZ Boss Take — record one scored take and have it coached.
//
// The blueprint's Boss Take ("one scored final take, exercise pass, or song
// section") against the StatZ AI Vocal Coach. Record in the browser or attach a
// file; the take goes up with genre, target range and difficulty, and comes
// back scored out of 10 with what worked, what to fix, and one drill.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mic, Play, Square, Trash2, Upload } from "lucide-react";
import { api } from "../api.js";
import { GENRES } from "../genres.js";

// Ranges, difficulties, score dimensions and the honest-scope footnote all
// come from GET /api/<appKey>/coach/. They differ per instrument — a guitar
// take has no "breath" and a drummer has no vocal range — and keeping a copy
// here would let the chips disagree with what the model was asked to score.
const DIFFICULTY_LABEL = {
  starter: "Starter 🌱", builder: "Builder 🧩",
  performer: "Performer 🌟", stageboss: "Stage Boss 👑",
};



const scoreColor = (n) =>
  n == null ? "text-white/30" : n >= 8 ? "text-emerald-300" : n >= 5 ? "text-mcz-gold" : "text-mcz-ember";

/** What this take costs, stated before it is sent.
 *
 * Red minus for what leaves, green plus for what a free allowance covers —
 * never a bare number, and never only after the fact. */
function Cost({ price, trial }) {
  if (!price) return null;
  // The trial spends nothing the visitor owns — they have no wallet yet. Say
  // that up front too: a free thing whose price is unstated still reads risky.
  if (trial) {
    return <span className="text-[11px] text-emerald-300">Free — no account, nothing to pay</span>;
  }
  if (price.free_today) {
    return (
      <span className="text-[11px] text-emerald-300">
        +1 🏷️ free today · {price.daily_remaining} left
      </span>
    );
  }
  const fromPromptz = price.promptz >= price.cost_cents;
  return (
    <span className="text-[11px] text-mcz-ember">
      −{price.cost_cents} 🏷️{" "}
      <span className="text-white/35">
        from your {fromPromptz ? `${price.promptz} PromptZ` : "balance"} — no free prompts left today
      </span>
    </span>
  );
}

// `trial` swaps the member coach for the no-account door. Same recorder, same
// rubric, same score chips — the only differences are the endpoint, the price
// line, and what happens after the score.
export default function BossTake({ appKey = "singz", trial = false, onResult }) {
  const path = trial ? `/api/${appKey}/trial/` : `/api/${appKey}/coach/`;
  const [genre, setGenre] = useState("R&B");
  const [range, setRange] = useState("tenor");
  const [difficulty, setDifficulty] = useState("builder");
  const [blob, setBlob] = useState(null);
  const [takeName, setTakeName] = useState("take.webm");
  const [url, setUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  // What this take costs, read BEFORE anything is sent. A price you only see
  // in the response is a bill, not a price.
  const [price, setPrice] = useState(null);
  const rec = useRef(null);
  const chunks = useRef([]);
  const fileInput = useRef(null);

  useEffect(() => { api(path, { auth: !trial }).then(setPrice).catch(() => {}); }, [path, trial]);

  // Object URLs must be revoked or every take leaks for the life of the page.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  function attach(b, name) {
    if (url) URL.revokeObjectURL(url);
    // Keep the filename in state rather than assigning onto the Blob: File.name
    // is a read-only getter, so Object.assign threw and swallowed the attach.
    setBlob(b);
    setTakeName(name || b.name || "take.webm");
    setUrl(URL.createObjectURL(b));
    setResult(null);
  }

  async function startRec() {
    setMsg("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setMsg("This browser can't record. Attach an audio file instead.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        attach(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }), "take.webm");
      };
      rec.current = mr;
      mr.start();
      setSecs(0);
      setRecording(true);
    } catch {
      setMsg("Microphone access was refused. Allow it, or attach an audio file instead.");
    }
  }

  function stopRec() {
    rec.current?.state === "recording" && rec.current.stop();
    setRecording(false);
  }

  function discard() {
    if (url) URL.revokeObjectURL(url);
    setBlob(null); setUrl(""); setResult(null); setMsg(""); setSecs(0);
  }

  async function submit() {
    if (!blob) return;
    setBusy(true); setMsg(""); setResult(null);
    try {
      const body = new FormData();
      body.append("take", blob, takeName);
      body.append("genre", genre);
      body.append("range", range);
      body.append("difficulty", difficulty);
      const out = await api(path, { method: "POST", body, auth: !trial });
      setResult(out);
      onResult?.(out);
    } catch (e) {
      setMsg(e.message || "The coach couldn't take that one.");
    } finally { setBusy(false); }
  }

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="neon-frame space-y-4 p-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          👑 Boss Take — {price?.label || "AI"} Coach
        </p>
        <p className="mt-1 text-[11px] text-white/45">
          Record one take, or upload a file, and have it scored. You'll get what actually worked, what to fix,
          and a drill to run before the next one.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] text-white/50">
          Genre
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="neon-input !py-2 text-xs">
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        {price?.range_label && (
          <label className="text-[11px] text-white/50">
            {price.range_label}
            <select value={range} onChange={(e) => setRange(e.target.value)} className="neon-input !py-2 text-xs">
              {(price.ranges || []).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </label>
        )}
        <label className="text-[11px] text-white/50">
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="neon-input !py-2 text-xs">
            {(price?.difficulties || ["starter", "builder", "performer", "stageboss"])
              .map((v) => <option key={v} value={v}>{DIFFICULTY_LABEL[v] || v}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button className="re-btn !w-auto px-4" onClick={startRec} disabled={busy}>
            <Mic size={15} /> {blob ? "Record again" : "Record a take"}
          </button>
        ) : (
          <button className="neon-btn-primary !w-auto px-4" onClick={stopRec}>
            <Square size={14} /> Stop · {mmss}
          </button>
        )}
        <input ref={fileInput} type="file" accept="audio/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) attach(f, f.name); }} />
        <button className="re-btn !w-auto px-4" onClick={() => fileInput.current?.click()} disabled={busy || recording}>
          <Upload size={15} /> Attach a file
        </button>
        {blob && !recording && (
          <button className="re-btn !w-auto px-3 !text-red-300" onClick={discard} disabled={busy}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {recording && (
        <p className="flex items-center gap-2 text-[11px] text-mcz-ember">
          <span className="h-2 w-2 animate-pulse rounded-full bg-mcz-ember" /> Recording — {mmss}
        </p>
      )}

      {url && !recording && (
        <div className="space-y-2">
          <audio src={url} controls className="w-full" />
          <div className="flex flex-wrap items-center gap-3">
            <button className="neon-btn-primary !w-auto px-5" onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={15} /> : <Play size={15} />}
              {busy ? "Coaching your take…" : "Send it to the coach"}
            </button>
            <Cost price={price} trial={trial} />
          </div>
          {price && (
            <p className="text-[11px] text-white/35">
              A take the coach can't read isn't charged.
            </p>
          )}
        </div>
      )}

      {msg && (
        <p className="flex items-start gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] text-mcz-ember">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {msg}
        </p>
      )}

      {result && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="flex items-baseline gap-3">
            <span className={`font-display text-4xl font-extrabold ${scoreColor(result.score)}`}>
              {result.score}<span className="text-lg text-white/30">/10</span>
            </span>
            <p className="flex-1 text-[12px] leading-relaxed text-white/75">{result.verdict}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(price?.scores || {}).map(([k, label]) => (
              <span key={k} className="pill">
                {label} <span className={`font-bold ${scoreColor(result.scores?.[k])}`}>
                  {result.scores?.[k] ?? "—"}
                </span>
              </span>
            ))}
          </div>

          {result.strengths?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/80">What worked</p>
              <ul className="mt-1 space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-white/65">· {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.fixes?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-mcz-ember/80">Fix this</p>
              <ul className="mt-1 space-y-1">
                {result.fixes.map((s, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-white/65">· {s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.next_drill && (
            <p className="rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/5 px-3 py-2 text-[12px] text-white/70">
              <span className="font-semibold text-mcz-cyan">Next drill · </span>{result.next_drill}
            </p>
          )}

          {!trial && (
            <p className="text-[11px]">
              {result.cost_cents
                ? <span className="text-mcz-ember">−{result.cost_cents} 🏷️ spent</span>
                : <span className="text-emerald-300">Free — a daily prompt covered it 🏷️</span>}
            </p>
          )}

          <p className="text-[10px] text-white/30">{price?.caveat}</p>
        </div>
      )}
    </div>
  );
}
