import { useEffect, useRef, useState } from "react";
import { playSound } from "../sound.js";
import { Download, Loader2, Music, Play, Search, Square } from "lucide-react";
import { useCharLimit } from "../limits.js";
import CharLimit from "../CharLimit.jsx";
import { api, apiBlob } from "../api.js";
import { IconImg } from "../App.jsx";
import { IN_SHELL } from "../standalone.js";
import UseIn from "../components/UseIn.jsx";
import RunPrice from "../components/RunPrice.jsx";
import RunClock from "../components/RunClock.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import { budgetOf, runTimeoutMs, shellRoyaltyLine, unknownOutcome, unknownOutcomeNote } from "../aiRun.js";
import { chargeLine, drumVoice, midiName, missingLine } from "../instrumentalz.js";
import { useRemembered } from "../useRemembered.js";
import { remember } from "../remember.js";
import UsualHint from "../components/UsualHint.jsx";

// Instrumental ConnectZ — AI-composed MIDI loops. Keys, moods, instruments,
// limits and price all come from /api/economy/instrumentalz/; the .mid is
// written by the server. The preview below is a sketch, not the sound: plain
// synth voices so a member can hear the notes before downloading them.
//
// It is also a screen of the IntelligenceZ app. In any shell (IN_SHELL) there is
// no CollabZ, BattleZ, DistributeZ, MembershipZ or StatZ sample to hand a member
// to, so those controls are not rendered, the royalty is the one-line "if you
// later take this to Music ConnectZ" form, and out of free prompts the price line
// names no price it cannot charge — see RunPrice.

const WAVE = { bass: "sawtooth", synth_bass: "sawtooth", lead: "square", organ: "sine", brass: "sawtooth",
  strings: "sawtooth", pad: "sawtooth", choir: "triangle" };
const SOFT = new Set(["strings", "pad", "choir"]);

function hz(p) { return 440 * Math.pow(2, (p - 69) / 12); }

function drum(ctx, out, pitch, t, vel) {
  const g = ctx.createGain();
  g.connect(out);
  if (pitch === 35 || pitch === 36) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); o.start(t); o.stop(t + 0.3);
    return;
  }
  const { len, filter, freq } = drumVoice(pitch);
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  g.gain.setValueAtTime(vel * 0.7, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f); f.connect(g); src.start(t);
}

function playLoop(work, repeats = 2) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.25;
  master.connect(ctx.destination);
  const spb = 60 / work.bpm;
  const loopLen = work.bars * 4 * spb;
  const t0 = ctx.currentTime + 0.1;
  for (let r = 0; r < repeats; r++) {
    for (const tr of work.tracks) {
      for (const [pitch, start, length, v] of tr.notes) {
        const t = t0 + r * loopLen + start * spb;
        const vel = v / 127;
        if (tr.instrument === "drums") { drum(ctx, master, pitch, t, vel); continue; }
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = WAVE[tr.instrument] || "triangle";
        o.frequency.value = hz(pitch);
        const end = t + Math.max(0.05, length * spb);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vel * 0.5, t + (SOFT.has(tr.instrument) ? 0.12 : 0.01));
        g.gain.exponentialRampToValueAtTime(0.001, end);
        o.connect(g); g.connect(master); o.start(t); o.stop(end + 0.05);
      }
    }
  }
  return { ctx, ends: t0 + repeats * loopLen };
}

// A StatZ sample can start or end while this screen is open, and what it unlocks
// (mood search) arrives with the GET — so a change refetches. Its own component,
// rendered only on the main site: a shell has no sample to start, and its screens
// should not be reading one.
function ReloadOnSample({ onChange }) {
  const { s: trial } = useStatzTrial();
  useEffect(() => { if (trial) onChange(); }, [trial?.active]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function InstrumentalConnectZ() {
  const cl = useCharLimit();
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [genre, setGenre] = useRemembered("instrumentalz.genre", "");
  const [brief, setBrief] = useState("");
  const [picked, setPicked] = useState(["drums", "bass", "piano"]);
  const [bpm, setBpm] = useState(90);
  const [key, setKey] = useRemembered("instrumentalz.key", "A minor");
  const [bars, setBars] = useState(4);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState(null);
  // The POST response for the piece just composed: the only place the server says
  // whether that run was charged. A piece opened from the list has no such fact.
  const [run, setRun] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [mood, setMood] = useState("");
  const [moodHits, setMoodHits] = useState(null);
  const player = useRef(null);

  const load = () => api("/api/economy/instrumentalz/").then(setS).catch((e) => setErr(e.message));
  useEffect(() => { load(); return () => stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stop() {
    player.current?.ctx?.close?.();
    player.current = null;
    setPlaying(false);
  }
  function play() {
    stop();
    const p = playLoop(work);
    if (!p) return setErr("This browser can't play a preview — download the .mid instead.");
    player.current = p;
    setPlaying(true);
    setTimeout(() => { if (player.current === p) stop(); }, (p.ends - p.ctx.currentTime) * 1000 + 200);
  }

  const toggle = (id) => setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id)
    : cur.length >= (s?.max_tracks ?? 6) ? cur : [...cur, id]);

  async function compose() {
    setErr(""); setBusy(true); stop();
    let w;
    try {
      // The wait has to outlast the server's: api.js stops at 30s, a composition
      // takes up to 90s, and the server goes on to charge and save a loop the
      // browser has already given up on.
      w = await api("/api/economy/instrumentalz/", { method: "POST",
        body: { genre, brief, instruments: picked, bpm, key, bars },
        timeoutMs: runTimeoutMs(s?.budget_seconds) });
    } catch (e) {
      playSound("build_fail");
      // Silence is not "nothing was charged": the loop may have been composed.
      if (unknownOutcome(e)) { load(); setErr(unknownOutcomeNote(e, "Your loops")); }
      else { if (e.status === 402) load(); setErr(e.message); }
      setBusy(false);
      return;
    }
    setWork(w); setRun(w); load();
    playSound("build_done");
    setBusy(false);
  }

  async function download() {
    try {
      const blob = await apiBlob(`/api/economy/instrumentalz/${work.id}/midi/`);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = midiName(work);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { setErr(e.message); }
  }

  async function searchMood() {
    try { setMoodHits((await api(`/api/economy/instrumentalz/moods/?q=${encodeURIComponent(mood)}`)).results); }
    catch (e) { setErr(e.message); }
  }

  const keyMood = s?.keys?.find((k) => k.key === key)?.mood;
  const [lo, hi] = s?.bpm || [60, 200];
  const bpmOk = Number.isFinite(bpm) && bpm >= lo && bpm <= hi;
  const labelOf = (id) => s?.instruments?.find((i) => i.id === id)?.label || id;
  // The royalty is the server's number: on the piece, else the screen's GET.
  // Never a figure typed here — with neither, no share is stated.
  const pct = work ? (work.royalty_pct ?? s?.royalty_pct) : null;
  const missing = work ? missingLine(work, labelOf) : "";
  const justMade = !!work && run?.id === work.id;

  return (
    <div className="space-y-5">
      {!IN_SHELL && <ReloadOnSample onChange={load} />}
      <header className="flex items-center gap-4">
        <IconImg icon="instrumentalconnectz.png" alt="Instrumental ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Instrumental ConnectZ</h2>
          <p className="text-sm text-white/60">AI-composed MIDI loops — pick the sound, the speed and the mood.</p>
        </div>
      </header>

      {s && !s.configured && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">The composer isn't switched on yet.</p>}

      <div className="neon-frame space-y-4 p-4">
        <input className="neon-input w-full" maxLength={60} placeholder="Genre (boom bap, drill, R&B, lo-fi…)"
          aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />

        <div>
          <p className="mb-2 text-sm text-white/70">Instruments <span className="text-white/40">(up to {s?.max_tracks ?? 6})</span></p>
          <div className="flex flex-wrap gap-2">
            {(s?.instruments || []).map((i) => (
              <button key={i.id} onClick={() => toggle(i.id)} aria-pressed={picked.includes(i.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${picked.includes(i.id)
                  ? "border-mcz-cyan bg-mcz-cyan/15 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`}>
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-white/70">BPM
            <input type="number" min={lo} max={hi} className="neon-input mt-1 w-full" value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || lo)} />
          </label>
          <label className="text-sm text-white/70">Key
            <select data-memo="own" className="neon-input mt-1 w-full" value={key} onChange={(e) => setKey(e.target.value)}>
              {(s?.keys || []).map((k) => <option key={k.key} value={k.key}>{k.key}</option>)}
            </select>
<UsualHint field="instrumentalz.key" value={key} onUse={setKey} />
          </label>
          <label className="text-sm text-white/70">Length
            <select className="neon-input mt-1 w-full" value={bars} onChange={(e) => setBars(Number(e.target.value))}>
              {(s?.bars || [4, 8]).map((b) => <option key={b} value={b}>{b} bars</option>)}
            </select>
          </label>
        </div>
        {!bpmOk && <p role="alert" className="text-xs text-mcz-ember">BPM has to be between {lo} and {hi}.</p>}
        {keyMood && <p className="text-sm italic text-white/70">“{keyMood}”</p>}

        {/* Every key's mood, for everybody. Picking a key from a bare list of 24
            names is a guess; this makes the free way a scan. Searching them by
            mood is the StatZ convenience on top, below. */}
        {s?.keys?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-white/45">Every key and its mood — tap one to pick it.</p>
            <ul className="max-h-60 space-y-0.5 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-1">
              {s.keys.map((k) => (
                <li key={k.key}>
                  <button onClick={() => setKey(k.key)} aria-pressed={key === k.key}
                    className={`block w-full rounded-lg px-2 py-1 text-left text-sm ${key === k.key
                      ? "bg-mcz-cyan/15 text-white" : "text-white/70 hover:bg-white/10"}`}>
                    <span className="font-semibold">{k.key}</span> <span className="text-white/55">— {k.mood}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {s?.mood_search ? (
          <div data-tour="instrumental-mood" className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
            {!IN_SHELL && <StatzSample what="Searching keys by mood" />}
            <div className="flex gap-2">
              <input className="neon-input flex-1" placeholder="Find a key by mood — dark, hopeful, heartbroken…"
                aria-label="Find a key by mood"
                value={mood} onChange={(e) => setMood(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchMood()} />
              <button className="re-btn !w-auto px-3" onClick={searchMood} aria-label="Search keys by mood"><Search size={16} /></button>
            </div>
            {moodHits && (moodHits.length ? moodHits.slice(0, 6).map((h) => (
              <button key={h.key} onClick={() => setKey(h.key)}
                className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-white/10">
                <span className="font-semibold">{h.key}</span> <span className="text-white/55">— {h.mood}</span>
              </button>
            )) : <p className="text-xs text-white/50">No key matches that mood — try another word.</p>)}
          </div>
        ) : s && !IN_SHELL && (
          <div data-tour="instrumental-mood" className="space-y-1">
            <StatzSample what="Searching keys by mood" />
          </div>
        )}

        <textarea className="neon-input min-h-20 w-full" maxLength={cl.limit} placeholder="Anything else? (optional)"
          aria-label="Anything else?" value={brief} onChange={(e) => setBrief(cl.clamp(e.target.value))} />
        {IN_SHELL ? (
          // CharLimit's upgrade link goes to MembershipZ, which a shell does not have.
          cl.ready && !cl.unlimited && (
            <p className={`text-[11px] ${cl.state(brief) === "ok" ? "text-white/35" : cl.state(brief) === "near" ? "text-mcz-gold" : "text-mcz-ember"}`}>
              {brief.length.toLocaleString()} / {cl.limit.toLocaleString()}{cl.state(brief) === "full" && " · limit reached"}
            </p>
          )
        ) : <CharLimit cl={cl} value={brief} />}

        <div className="flex flex-wrap items-center gap-3">
          {/* Live only once the price is known and the run can be paid for: with
              no answer from the server there is no price to have stated. */}
          <button className="neon-btn-primary !w-auto px-5"
                  disabled={busy || !picked.length || !bpmOk || !s || !s.configured || !s.can_run} onClick={compose}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Music size={16} />} Compose it
          </button>
          <RunPrice s={s} noun="compositions" inShell={IN_SHELL} failed={!s && !!err} onRetry={load} />
          <span className="text-[11px] text-white/40">
            An answer with no usable loop isn't charged. If only some of the parts you asked for come back, it says which are missing and whether that run was charged.
          </span>
          <RunClock running={busy} budgetSeconds={budgetOf(s)} what="Composing" />
        </div>
        {s?.royalty_rule && (IN_SHELL ? <p className="text-xs text-white/50">{shellRoyaltyLine("loop", s.royalty_rule)}</p>
          : <p className="text-xs text-white/50">{s.royalty_rule}</p>)}
        {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      </div>

      {work && (
        <div key={work.id} className="mcz-reveal neon-frame space-y-3 p-4">
          <h3 className="font-semibold">{work.genre || "Instrumental"} · {work.key} · {work.bpm} BPM · {work.bars} bars</h3>
          <p className="text-xs text-white/50">{work.tracks.map((t) => `${labelOf(t.instrument)} (${t.notes.length} notes)`).join(" · ")}</p>
          {/* What did not come back, and whether the run was charged: the loop is
              usable either way, so nothing else would ever say a part is absent. */}
          {missing && (
            <p role="status" className="rounded-lg bg-mcz-gold/10 px-3 py-2 text-xs text-mcz-gold">
              {missing}{justMade && <> {chargeLine(run)}</>}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {playing
              ? <button className="re-btn !w-auto px-4" onClick={stop}><Square size={14} /> Stop</button>
              : <button className="re-btn !w-auto px-4" onClick={play}><Play size={14} /> Preview</button>}
            <button className="re-btn !w-auto px-4" onClick={download}><Download size={14} /> Download .mid</button>
          </div>
          <p className="text-[11px] text-white/40">The preview uses simple built-in sounds. Load the .mid into your DAW for the real instruments.</p>
          {!IN_SHELL && pct != null && <UseIn source="instrumental" sourceId={work.id} pct={pct} />}
        </div>
      )}

      {s?.works?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your loops</h3>
          {s.works.map((w) => (
            <button key={w.id} onClick={() => { stop(); setWork(w); }}
              className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-white/30">
              {w.genre || "Instrumental"} <span className="text-white/45">— {w.key}, {w.bpm} BPM</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
