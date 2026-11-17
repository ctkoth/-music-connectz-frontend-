import { useEffect, useRef, useState } from "react";
import { Lock, Pause, Play, Plus, Trash2, Wand2 } from "lucide-react";
import { goToSpot } from "../goto.js";
import { IN_SHELL } from "../standalone.js";
import { toAudioBuffer, run } from "../mastering/client.js";
import { GAIN_MIN, GAIN_MAX, ROLES, audible, panLabel, suggestMix, trackRoom } from "../mastering/multitrack.js";

// Mix ConnectZ's multitrack section: every track's gain and pan, mute and solo, heard live while
// they move, and "Suggest a balance", which measures the tracks and proposes a starting mix with a
// reason per track. Mixing runs on the device and costs nothing; the tier says how MANY tracks
// (the shared Free 3 / Premium 6 / StatZ unlimited count from /limits/), never whether.
//
// The live preview is a StereoPannerNode per track and the render uses that node's own law
// (multitrack.js), so what the member sets by ear is what gets mastered.

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const stereo = (ch) => (ch.length >= 2 ? [ch[0], ch[1]] : [ch[0], ch[0]]);
const dbToGain = (db) => Math.pow(10, db / 20);

function useLiveMix(tracks, sampleRate) {
  const ref = useRef({ ctx: null, nodes: [], srcs: [], startAt: 0, offset: 0, bufs: new Map() });
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = tracks.length ? Math.max(...tracks.map((t) => t.channels[0].length / (t.sampleRate || sampleRate))) : 0;

  const apply = () => {
    const s = ref.current;
    if (!s.ctx) return;
    const on = audible(tracks);
    const t0 = s.ctx.currentTime;
    s.nodes.forEach((n, i) => {
      if (!n || !tracks[i]) return;
      n.gain.gain.setTargetAtTime(on[i] ? dbToGain(Number(tracks[i].gainDb) || 0) : 0, t0, 0.02);
      n.pan.pan.setTargetAtTime(Number(tracks[i].pan) || 0, t0, 0.02);
    });
  };
  const stop = (keep = true) => {
    const s = ref.current;
    if (s.ctx && keep) s.offset = Math.min(total, s.offset + (s.ctx.currentTime - s.startAt));
    s.srcs.forEach((x) => { try { x.stop(); } catch { /* already stopped */ } });
    s.srcs = []; s.nodes = [];
    setPlaying(false);
  };
  const play = () => {
    const s = ref.current;
    if (!tracks.length) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!s.ctx) s.ctx = new Ctx({ sampleRate });
    if (s.offset >= total - 0.05) s.offset = 0;
    s.startAt = s.ctx.currentTime + 0.05;
    s.nodes = tracks.map((t) => {
      let buf = s.bufs.get(t.id);
      if (!buf) { buf = toAudioBuffer(s.ctx, stereo(t.channels), t.sampleRate || sampleRate); s.bufs.set(t.id, buf); }
      const src = s.ctx.createBufferSource(); src.buffer = buf;
      const gain = s.ctx.createGain(); gain.gain.value = 0;
      const pan = s.ctx.createStereoPanner();
      src.connect(gain).connect(pan).connect(s.ctx.destination);
      if (s.offset < buf.duration) src.start(s.startAt, s.offset);
      s.srcs.push(src);
      return { gain, pan };
    });
    setPlaying(true);
    apply();
  };
  useEffect(() => { apply(); }); // every render: a fader moved, a mute pressed
  useEffect(() => {
    if (!playing) return undefined;
    const iv = setInterval(() => {
      const s = ref.current;
      const p = Math.min(total, s.offset + Math.max(0, s.ctx.currentTime - s.startAt));
      setPos(p);
      if (p >= total - 0.02) { stop(false); s.offset = 0; setPos(0); }
    }, 250);
    return () => clearInterval(iv);
  }, [playing, total]); // eslint-disable-line react-hooks/exhaustive-deps
  // A track added or removed rebuilds the graph on the next press.
  const ids = tracks.map((t) => t.id).join(",");
  useEffect(() => { if (playing) stop(true); }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stop(false); ref.current.ctx?.close?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { playing, play, stop: () => stop(true), pos, total };
}

export default function TrackMixer({ tracks, sampleRate, onChange, onAdd, onRemove, onApply, cap, nextCap, busy }) {
  const input = useRef(null);
  const live = useLiveMix(tracks, sampleRate);
  const [why, setWhy] = useState(null);       // reasons from the last suggestion, by track id
  const [image, setImage] = useState(null);   // stereo report of the mix as set
  const [working, setWorking] = useState("");
  const [err, setErr] = useState("");
  const room = trackRoom(tracks.length, cap);

  const payload = () => tracks.map((t) => ({ channels: t.channels, sampleRate: t.sampleRate || sampleRate,
    gainDb: t.gainDb, pan: t.pan, mute: t.mute, solo: t.solo, name: t.name }));

  async function suggest() {
    setErr(""); setWorking("Measuring each track");
    try {
      const m = await run("measure", { tracks: tracks.map((t) => ({ channels: t.channels.map((c) => c.slice()), sampleRate: t.sampleRate || sampleRate })) });
      const out = suggestMix(tracks.map((t, i) => ({ role: t.role, m: m[i], name: t.name })));
      onApply(out.map((o) => ({ gainDb: o.gainDb, pan: o.pan })));
      setWhy(Object.fromEntries(tracks.map((t, i) => [t.id, out[i].why])));
      setImage(null);
    } catch (e) { setErr(e.message); } finally { setWorking(""); }
  }
  async function check() {
    setErr(""); setWorking("Measuring the stereo image");
    try {
      setImage(await run("image", { tracks: payload().map((t) => ({ ...t, channels: t.channels.map((c) => c.slice()) })), sampleRate }));
    } catch (e) { setErr(e.message); } finally { setWorking(""); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 p-3" data-tour="mixz-tracks">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white/80">TrackZ — mix several tracks</h3>
        <span className="text-[11px] text-white/45">
          {cap === null ? `${tracks.length} tracks · unlimited on your plan` : cap !== undefined ? `${tracks.length} of ${cap} tracks` : `${tracks.length} tracks`}
        </span>
      </div>
      <p className="text-[11px] text-white/45">
        Add your stems — vocal, beat, bass, backing vocals — and set each one's level and place in the stereo field. They are
        mixed on your device, then mastered as one. Free: nothing is uploaded and nothing is charged.
      </p>

      <div className="space-y-2">
        {tracks.map((t, i) => (
          <div key={t.id} className="space-y-1 rounded-md bg-white/5 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{t.name}{i === 0 && <span className="ml-1 font-normal text-white/40">(your song)</span>}</span>
              <select className="neon-input !w-auto !py-1 text-xs" aria-label={`What ${t.name} is`} data-nomemo="true" value={t.role}
                onChange={(e) => onChange(i, { role: e.target.value })}>
                {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
              <button className={`re-btn !w-auto px-2 text-xs ${t.mute ? "!bg-mcz-ember/30" : ""}`} aria-pressed={!!t.mute} onClick={() => onChange(i, { mute: !t.mute })}>M</button>
              <button className={`re-btn !w-auto px-2 text-xs ${t.solo ? "!bg-mcz-gold/30" : ""}`} aria-pressed={!!t.solo} onClick={() => onChange(i, { solo: !t.solo })}>S</button>
              {i > 0 && <button className="re-btn !w-auto px-2" aria-label={`Remove ${t.name}`} onClick={() => onRemove(i)}><Trash2 size={13} /></button>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-[11px] text-white/60">
                <span className="w-9">Gain</span>
                <input type="range" className="flex-1" min={GAIN_MIN} max={GAIN_MAX} step={0.5} value={t.gainDb}
                  aria-label={`${t.name} gain`} onChange={(e) => onChange(i, { gainDb: Number(e.target.value) })}
                  onDoubleClick={() => onChange(i, { gainDb: 0 })} />
                <span className="w-14 text-right tabular-nums text-white/80">{t.gainDb > 0 ? "+" : ""}{Number(t.gainDb).toFixed(1)} dB</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-white/60">
                <span className="w-9">Pan</span>
                <input type="range" className="flex-1" min={-1} max={1} step={0.05} value={t.pan}
                  aria-label={`${t.name} pan`} onChange={(e) => onChange(i, { pan: Number(e.target.value) })}
                  onDoubleClick={() => onChange(i, { pan: 0 })} />
                <span className="w-14 text-right tabular-nums text-white/80">{panLabel(Number(t.pan) || 0)}</span>
              </label>
            </div>
            {why?.[t.id] && <p className="text-[11px] text-emerald-300/80">{why[t.id]}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {room.ok ? (
          <button className="re-btn !w-auto px-3" disabled={!!busy || !!working} onClick={() => input.current?.click()}>
            <Plus size={14} /> Add a track{room.left != null ? ` (${room.left} left)` : ""}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-mcz-gold">
            <Lock size={12} /> {cap} tracks is your plan's limit{nextCap ? ` — Premium mixes ${nextCap}, StatZ unlimited` : " — StatZ mixes unlimited"}.
            {!IN_SHELL && <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See plans</button>}
          </span>
        )}
        <input ref={input} type="file" multiple accept="audio/*,.wav,.flac,.mp3,.m4a,.ogg" className="hidden"
          onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ""; if (fs.length) onAdd(fs); }} />
        <button className="re-btn !w-auto px-3" disabled={!tracks.length} onClick={live.playing ? live.stop : live.play}>
          {live.playing ? <Pause size={14} /> : <Play size={14} />} {live.playing ? "Stop" : "Hear the mix"}
        </button>
        {live.total > 0 && <span className="text-[11px] tabular-nums text-white/45">{mmss(live.pos)} / {mmss(live.total)}</span>}
      </div>

      {tracks.length > 1 && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button className="re-btn !w-auto px-3" disabled={!!working || !!busy} onClick={suggest}>
              <Wand2 size={14} /> Suggest a balance
            </button>
            <button className="re-btn !w-auto px-3" disabled={!!working || !!busy} onClick={check}>Check the stereo image</button>
            <span className="text-[11px] text-emerald-300">Free</span>
            {working && <span className="text-[11px] text-white/50">{working}…</span>}
          </div>
          <p className="text-[11px] text-white/40">
            The suggestion measures each track's loudness, tone and width and sets a starting point from what each one is — the
            reason is under every track. It is a starting point, not a verdict: move anything, by ear.
          </p>
        </div>
      )}

      {image && (
        <div className="space-y-1 rounded-md bg-white/5 p-2 text-[11px] text-white/70">
          <p>Correlation <b className="text-white">{image.correlation}</b> (+1 is mono, under 0 cancels on a phone) · low end <b className="text-white">{image.lowCorrelation}</b> (should stay near +1) · sides {image.widthDb == null ? "silent (mono)" : <b className="text-white">{image.widthDb} dB</b>} under the centre (about −10 is a typical stereo mix).</p>
          {image.notes.length ? image.notes.map((n) => <p key={n} className="text-mcz-gold">• {n}</p>) : <p className="text-emerald-300">Nothing to fix: the image is wide, the low end is centred and nothing cancels in mono.</p>}
        </div>
      )}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
