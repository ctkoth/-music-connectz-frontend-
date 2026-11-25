import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { LEVELS, SLIDERS, SLIDER_RANGE, fmtHz, findRound, gradeFind, matchRound, matchError, matchGrade, addResult, summary } from "../mixez.js";
import { balanceRound, balanceGrade, BALANCE_RANGE } from "../mixez.js";
import { renderProgression, progressionChords } from "../daw/chords.js";
import { renderBars } from "../daw/rack.js";
import { drumPart } from "../daw/drummer.js";
import { goToTab } from "../goto.js";

const KEY = "mcz_mixez_log";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private window: practice just isn't remembered */ } };
const seed = () => (Math.random() * 2 ** 31) | 0;   // a fresh round; the round itself is deterministic from this

// One shared player: a rendered chord loop through a chain of peaking filters, so a drill hears exactly the filters the scoring models.
function usePlayer() {
  const st = useRef({});
  const [playing, setPlaying] = useState(false);
  const ensure = async () => {
    const s = st.current;
    if (!s.ctx) s.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (s.ctx.state === "suspended") await s.ctx.resume();
    if (!s.buf) s.buf = await renderProgression(progressionChords(9, "minor", "canon"), { bpm: 96, times: 1, layers: { pad: true, keys: true, bass: true, arp: true }, rate: s.ctx.sampleRate });
    return s;
  };
  const stop = () => { const s = st.current; try { s.src?.stop(); } catch { /* already stopped */ } s.src = null; setPlaying(false); };
  const start = async (filters) => {
    const s = await ensure();
    stop();
    const src = s.ctx.createBufferSource(); src.buffer = s.buf; src.loop = true;
    s.nodes = filters.map(() => { const f = s.ctx.createBiquadFilter(); f.type = "peaking"; return f; });
    const out = s.ctx.createGain(); out.gain.value = 0.5;
    [src, ...s.nodes, out].reduce((a, b) => (a.connect(b), b));
    out.connect(s.ctx.destination);
    s.src = src; s.apply(filters); src.start(); setPlaying(true);
  };
  st.current.apply = (filters) => { const s = st.current; s.nodes?.forEach((n, i) => { const f = filters[i]; n.frequency.value = f.f; n.Q.value = f.q; n.gain.value = f.gain; }); };
  const set = (filters) => { const s = st.current; if (s.nodes && s.nodes.length === filters.length) s.apply(filters); };
  useEffect(() => () => { stop(); st.current.ctx?.close(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return { playing, start, stop, set };
}

function Meter({ log, drill }) {
  const s = summary(log, drill);
  if (!s.n) return <p className="text-xs opacity-70">No rounds yet — your practice is kept on this device only.</p>;
  return <p className="text-xs opacity-80">{s.ok} of {s.n} right ({s.pct}%) · last {s.last10}: {s.ok10} right. A practice count, not a rating of you.</p>;
}

function Find({ level, log, onResult }) {
  const p = usePlayer();
  const [round, setRound] = useState(() => findRound(seed(), level));
  const [boost, setBoost] = useState(true);
  const [done, setDone] = useState(null);
  useEffect(() => { setRound(findRound(seed(), level)); setDone(null); }, [level]);
  const filt = (on) => [{ f: round.band, q: round.q, gain: on ? round.gain : 0 }];
  useEffect(() => { p.set(filt(boost)); }, [boost, round]);   // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (b) => {
    if (done) return;
    const g = gradeFind(round, b);
    setDone({ ...g, picked: b }); onResult(g.right);
  };
  const next = () => { setRound(findRound(seed(), level, round.band)); setDone(null); setBoost(true); };
  return (
    <div className="space-y-3">
      <p className="text-sm">One band of this loop is boosted by <b>{round.gain} dB</b>. Flip Boost on and off, then name the band. A wrong answer is never charged — nothing here costs anything.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <button className="neon-btn" onClick={() => (p.playing ? p.stop() : p.start(filt(boost)))}>{p.playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Play loop</>}</button>
        <button className={`neon-btn ${boost ? "" : "opacity-60"}`} onClick={() => setBoost((b) => !b)} aria-pressed={boost}>{boost ? "Boost ON" : "Flat (boost off)"}</button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Which band is boosted?">
        {round.options.map((b) => (
          <button key={b} onClick={() => pick(b)} disabled={!!done}
            className={`neon-btn ${done && b === done.answer ? "text-emerald-300" : done && b === done.picked ? "text-mcz-ember" : ""}`}>{fmtHz(b)}</button>
        ))}
      </div>
      {done && (
        <div role="status" className="re-card p-3 text-sm">
          {done.right ? <b className="text-emerald-300">Right — {fmtHz(done.answer)}.</b> : <b className="text-mcz-ember">It was {fmtHz(done.answer)}, you said {fmtHz(done.picked)}.</b>}
          <div className="mt-2 flex gap-2"><button className="neon-btn" onClick={next}>Next round</button></div>
        </div>
      )}
      <Meter log={log} drill="find" />
    </div>
  );
}

function Match({ level, log, onResult }) {
  const p = usePlayer();
  const [target, setTarget] = useState(() => matchRound(seed(), level));
  const [mine, setMine] = useState(SLIDERS.map(() => 0));
  const [hear, setHear] = useState("target");
  const [res, setRes] = useState(null);
  useEffect(() => { setTarget(matchRound(seed(), level)); setMine(SLIDERS.map(() => 0)); setRes(null); }, [level]);
  const chain = (g) => SLIDERS.map((f, i) => ({ f, q: 1, gain: g[i] }));
  const cur = hear === "target" ? target.gains : mine;
  useEffect(() => { p.set(chain(cur)); }, [hear, mine, target]);   // eslint-disable-line react-hooks/exhaustive-deps
  const check = () => { const e = matchError(target.gains, mine); const g = matchGrade(e); setRes(g); onResult(g.close); };
  const next = () => { setTarget(matchRound(seed(), level)); setMine(SLIDERS.map(() => 0)); setRes(null); setHear("target"); };
  return (
    <div className="space-y-3">
      <p className="text-sm">A hidden EQ has been put on this loop. Listen to the <b>Target</b>, then shape <b>Yours</b> with the five sliders until they sound the same. Scored by how far your curve sits from the target's — {`${SLIDER_RANGE}`} dB either way; under 1.5 dB off counts as matched.</p>
      <div className="flex flex-wrap gap-2">
        <button className="neon-btn" onClick={() => (p.playing ? p.stop() : p.start(chain(cur)))}>{p.playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Play loop</>}</button>
        {["target", "mine"].map((k) => <button key={k} onClick={() => setHear(k)} aria-pressed={hear === k} className={`neon-btn ${hear === k ? "" : "opacity-60"}`}>{k === "target" ? "Hear Target" : "Hear Yours"}</button>)}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {SLIDERS.map((f, i) => (
          <label key={f} className="text-center text-xs">
            <span className="block">{fmtHz(f)}</span>
            <input type="range" min={-SLIDER_RANGE} max={SLIDER_RANGE} step={1} value={mine[i]} aria-label={`${fmtHz(f)} gain`}
              onChange={(e) => { const v = +e.target.value; setMine((m) => m.map((x, j) => (j === i ? v : x))); setHear("mine"); }} />
            <span className="block">{mine[i] > 0 ? "+" : ""}{mine[i]} dB</span>
            {res && <span className="block opacity-70">target {target.gains[i] > 0 ? "+" : ""}{target.gains[i]}</span>}
          </label>
        ))}
      </div>
      {!res ? <button className="neon-btn" onClick={check}>Check my match</button> : (
        <div role="status" className="re-card p-3 text-sm">
          <b className={res.close ? "text-emerald-300" : "text-mcz-ember"}>{res.words} — {res.err.toFixed(1)} dB off on average.</b>
          <div className="mt-2"><button className="neon-btn" onClick={next}>Next round</button></div>
        </div>
      )}
      <Meter log={log} drill="match" />
    </div>
  );
}

// Drill 3 plays two rendered parts on their own faders, so the level offset is exactly the number the score reads.
function Balance({ level, log, onResult }) {
  const st = useRef({});
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState(() => balanceRound(seed(), level));
  const [mine, setMine] = useState(0);
  const [hear, setHear] = useState("target");
  const [res, setRes] = useState(null);
  useEffect(() => { setTarget(balanceRound(seed(), level)); setMine(0); setRes(null); }, [level]);
  const db = hear === "target" ? target.db : mine;
  useEffect(() => { const g = st.current.chords; if (g) g.gain.value = 10 ** (db / 20) * 0.6; }, [db, playing]);
  const stop = () => { for (const k of ["a", "b"]) { try { st.current[k]?.stop(); } catch { /* already stopped */ } st.current[k] = null; } setPlaying(false); };
  const start = async () => {
    const s = st.current;
    if (!s.ctx) s.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (s.ctx.state === "suspended") await s.ctx.resume();
    if (!s.drums) {
      const r = s.ctx.sampleRate;
      s.drums = await renderBars(drumPart("hiphop", { busy: 0.5, hard: 0.6, bars: 4, fillEvery: 0 }), { bpm: 96, rate: r });
      s.chordBuf = await renderProgression(progressionChords(9, "minor", "pop"), { bpm: 96, times: 1, layers: { pad: true, keys: true, bass: true }, rate: r });
    }
    stop();
    const mk = (buf) => { const n = s.ctx.createBufferSource(); n.buffer = buf; n.loop = true; return n; };
    const a = mk(s.drums), b = mk(s.chordBuf), ga = s.ctx.createGain(), gb = s.ctx.createGain();
    ga.gain.value = 0.6; a.connect(ga).connect(s.ctx.destination); b.connect(gb).connect(s.ctx.destination);
    s.chords = gb; s.a = a; s.b = b; gb.gain.value = 10 ** (db / 20) * 0.6; a.start(); b.start(); setPlaying(true);
  };
  useEffect(() => () => { stop(); st.current.ctx?.close(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const check = () => { const g = balanceGrade(target.db, mine); setRes(g); onResult(g.close); };
  const next = () => { setTarget(balanceRound(seed(), level)); setMine(0); setRes(null); setHear("target"); };
  return (
    <div className="space-y-3">
      <p className="text-sm">The drums stay put; the <b>chords</b> are set to a hidden level against them. Listen to the <b>Target</b>, then set the chords' fader on <b>Yours</b> until the balance sounds the same. Scored by how many dB apart you are — within 1 dB counts as matched. Free, nothing charged.</p>
      <div className="flex flex-wrap gap-2">
        <button className="neon-btn" onClick={() => (playing ? stop() : start())}>{playing ? <><Square size={14} /> Stop</> : <><Play size={14} /> Play loop</>}</button>
        {["target", "mine"].map((k) => <button key={k} onClick={() => setHear(k)} aria-pressed={hear === k} className={`neon-btn ${hear === k ? "" : "opacity-60"}`}>{k === "target" ? "Hear Target" : "Hear Yours"}</button>)}
      </div>
      <label className="block text-xs">
        <span>Chords vs drums: {mine > 0 ? "+" : ""}{mine} dB</span>
        <input type="range" className="w-full" min={-BALANCE_RANGE} max={BALANCE_RANGE} step={1} value={mine} aria-label="Chords level against the drums"
          onChange={(e) => { setMine(+e.target.value); setHear("mine"); }} />
      </label>
      {!res ? <button className="neon-btn" onClick={check}>Check my balance</button> : (
        <div role="status" className="re-card p-3 text-sm">
          <b className={res.close ? "text-emerald-300" : "text-mcz-ember"}>{res.words} — {res.err} dB apart{res.close ? "" : ` (yours is ${res.side})`}.</b>
          <div className="text-xs opacity-80">Target was {target.db > 0 ? "+" : ""}{target.db} dB.</div>
          <div className="mt-2"><button className="neon-btn" onClick={next}>Next round</button></div>
        </div>
      )}
      <Meter log={log} drill="balance" />
    </div>
  );
}

export default function MixEZ() {
  const [drill, setDrill] = useState("find");
  const [level, setLevel] = useState("easy");
  const [log, setLog] = useState(load);
  const record = (d) => (right) => setLog((l) => { const n = addResult(l, d, right); save(n); return n; });
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <header>
        <h1 className="text-3xl font-bold">MixEZ</h1>
        <p className="text-sm opacity-80">Mix-engineer ear training. Free, on your device, no AI and nothing charged — every score is measured from the filter the app applied, not opinion. Practice only: no certificates.</p>
      </header>
      <div className="flex flex-wrap gap-2" role="tablist">
        {[["find", "Find the frequency"], ["match", "Match the EQ"], ["balance", "Balance the mix"]].map(([k, l]) => <button key={k} role="tab" aria-selected={drill === k} onClick={() => setDrill(k)} className={`neon-btn ${drill === k ? "" : "opacity-60"}`}>{l}</button>)}
        <select aria-label="Level" data-nomemo="true" value={level} onChange={(e) => setLevel(e.target.value)} className="neon-input ml-auto">
          {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {drill === "find" ? <Find key="f" level={level} log={log} onResult={record("find")} /> : drill === "match" ? <Match key="m" level={level} log={log} onResult={record("match")} /> : <Balance key="b" level={level} log={log} onResult={record("balance")} />}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="opacity-70">Now use it:</span>
        <button className="neon-btn" onClick={() => goToTab("mixconnectz")}>Mix ConnectZ</button>
        <button className="neon-btn" onClick={() => goToTab("arsenal")}>Arsenal</button>
      </div>
    </div>
  );
}
