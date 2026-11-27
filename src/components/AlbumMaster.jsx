// Album mastering in Mix ConnectZ: several songs to one loudness and one tone, with the settings above.
// The work is src/mastering/album.js (tested); this is the screen. Everything runs on the member's device
// and nothing is charged; the plan says how many songs one album holds (`album_songs`: Free 8, Premium 11,
// StatZ unlimited). Songs are decoded one at a time and only the finished file is kept, so a long album
// does not hold every song's audio in memory at once.
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Disc3, Download, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IN_SHELL } from "../standalone.js";
import { decodeFile, run, saveBlob, slug, MAX_SECONDS } from "../mastering/client.js";
import { TRIM, neg, albumLufs, albumReport, albumRoom, albumTone, songSettings, toneDistance, trackNumber } from "../mastering/album.js";

const r1 = (v) => Math.round(v * 10) / 10;
const sdb = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(r1(v))} dB`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const pick = (a) => ({ lufs: a.lufs, lra: a.lra, truePeakDb: a.truePeakDb, samplePeakDb: a.samplePeakDb, plr: a.plr,
  correlation: a.correlation, lowCorrelation: a.lowCorrelation, sideToMidDb: a.sideToMidDb, seconds: a.seconds,
  sampleRate: a.sampleRate, channels: a.channels, clippedSamples: a.clippedSamples, bands: a.bands });

let seq = 0;

export default function AlbumMaster({ getSettings, inspiration, exportOpts, exportCtl, cap, nextCap, onSaved, defaultsNote = "" }) {
  const input = useRef(null);
  const [songs, setSongs] = useState([]);       // {id, file, name, before, trimDb, out?}
  const [toInspiration, setToInspiration] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const room = albumRoom(songs.length, cap);
  const useInsp = toInspiration && !!inspiration;
  const albumBalance = useInsp ? inspiration.bands : albumTone(songs.map((s) => s.before));
  // Blob addresses are released when a song's file is replaced or the screen closes.
  useEffect(() => () => songs.forEach((s) => s.out?.url && URL.revokeObjectURL(s.out.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add(files) {
    setErr(""); setMsg("");
    let list = songs.slice();
    for (const f of files) {
      if (!albumRoom(list.length, cap).ok) { setErr(`${cap ?? list.length} songs is ${cap != null ? "your plan's album" : "the most one album holds"} — ${f.name} wasn't added.`); break; }
      try {
        setBusy(`Measuring ${f.name}`);
        const d = await decodeFile(f);
        if (d.channels[0].length / d.sampleRate > MAX_SECONDS) throw new Error(`longer than ${MAX_SECONDS / 60} minutes`);
        const a = await run("analyse", { channels: d.channels, sampleRate: d.sampleRate });
        list = [...list, { id: ++seq, file: f, name: f.name.replace(/\.[^.]+$/, ""), sampleRate: d.sampleRate, before: pick(a), trimDb: 0 }];
        setSongs(list);
      } catch (e) { setErr(`${f.name}: ${e.message}`); }
    }
    setBusy("");
  }
  const set = (id, patch) => setSongs((xs) => xs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i, d) => setSongs((xs) => { const j = i + d; if (j < 0 || j >= xs.length) return xs; const n = xs.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; });
  const outRate = (s) => exportOpts.rate || (exportOpts.format === "mp3" && ![32000, 44100, 48000].includes(s.sampleRate) ? 48000 : s.sampleRate);
  const ext = exportOpts.format === "mp3" ? `${exportOpts.kbps}k.mp3` : `${exportOpts.depth}bit.wav`;
  const mime = exportOpts.format === "mp3" ? "audio/mpeg" : "audio/wav";
  const fileName = (s, i) => `${trackNumber(i)}-${slug(s.name)}-master-${ext}`;

  async function masterAll() {
    setErr(""); setMsg("");
    const base = getSettings();
    const target = albumBalance ? { bands: albumBalance } : null;
    for (let i = 0; i < songs.length; i++) {
      const s = songs[i];
      try {
        setBusy(`Mastering ${i + 1} of ${songs.length}: ${s.name}`);
        const d = await decodeFile(s.file);                        // decoded again here and dropped after: one song in memory at a time
        const out = await run("master", { channels: d.channels, sampleRate: d.sampleRate,
          settings: songSettings(base, s.trimDb, inspiration), reference: target });
        setBusy(`Writing ${i + 1} of ${songs.length}: ${s.name}`);
        const file = await run("export", { channels: out.channels, sampleRate: d.sampleRate,
          options: { format: exportOpts.format, bitDepth: exportOpts.depth, dither: exportOpts.depth === 16 && exportOpts.dither, kbps: exportOpts.kbps, rate: outRate(s) } });
        const blob = new Blob([file.bytes], { type: mime });
        if (s.out?.url) URL.revokeObjectURL(s.out.url);
        set(s.id, { out: { blob, url: URL.createObjectURL(blob), after: pick(out.after),
          toneBefore: toneDistance(s.before.bands, albumBalance), toneAfter: toneDistance(out.after.bands, albumBalance), mb: blob.size / (1024 * 1024) } });
      } catch (e) { setErr(`${s.name}: ${e.message}`); }
    }
    setBusy("");
  }

  async function save(s, i) {
    setErr(""); setMsg("");
    try {
      setBusy(`Saving ${s.name}`);
      const fd = new FormData();
      fd.append("file", new File([s.out.blob], fileName(s, i), { type: mime }));
      const up = await api("/api/economy/uploads/", { method: "POST", body: fd });
      if (!up?.upload?.id) throw new Error("The file uploaded but no record came back, so it was not saved as a master.");
      await api("/api/economy/mixz/", { method: "POST", body: { title: `${trackNumber(i)} ${s.name}`, upload_id: up.upload.id,
        settings: { ...songSettings(getSettings(), s.trimDb, inspiration), album: true, format: exportOpts.format, bitDepth: exportOpts.depth, kbps: exportOpts.kbps },
        before: s.before, after: s.out.after } });
      setMsg(`Saved "${s.name}" to Your masters — ${r1(s.out.mb)} MB of your storage.`);
      onSaved?.();
    } catch (e) { setErr(e.message || `${s.name} was not saved.`); } finally { setBusy(""); }
  }

  const report = albumReport(songs.filter((s) => s.out).map((s) => ({ lufs: s.out.after.lufs, trimDb: s.trimDb, toneBefore: s.out.toneBefore, toneAfter: s.out.toneAfter })));
  const allOut = songs.length > 0 && songs.every((s) => s.out);

  return (
    <div className="neon-frame space-y-3 p-4" data-tour="mixz-album">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/80"><Disc3 size={15} /> Album mastering — one loudness, one tone</h3>
        <span className="text-[11px] text-white/60">{cap === null ? `${songs.length} songs · unlimited on your plan` : cap !== undefined ? `${songs.length} of ${cap} songs` : `${songs.length} songs`}</span>
      </div>
      <p className="text-[11px] text-white/50">
        Add the songs of an EP or album. Each is measured, the album's tone is worked out from all of them, and every song is mastered to that
        tone and the same loudness with the settings above (style, intensity, loudness, DynamicZ, VocalZ). Set a song a few dB under the rest
        if it should sit quieter. <span className="text-emerald-300">Free</span> — it runs on your device; nothing is uploaded until you save a song.
      </p>

      {defaultsNote && <p className="text-[11px] text-mcz-gold">{defaultsNote}</p>}
      {songs.length > 0 && (
        <ol className="space-y-2">
          {songs.map((s, i) => (
            <li key={s.id} className="space-y-1 rounded-md bg-white/5 p-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-white/55 tabular-nums">{trackNumber(i)}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{s.name}</span>
                <span className="text-white/60">{mmss(s.before.seconds)} · {neg(s.before.lufs)} LUFS now{albumBalance ? ` · ${r1(toneDistance(s.before.bands, albumBalance) ?? 0)} dB from the album's tone` : ""}</span>
                <button aria-label={`Move ${s.name} up`} className="text-white/50" onClick={() => move(i, -1)}><ArrowUp size={13} /></button>
                <button aria-label={`Move ${s.name} down`} className="text-white/50" onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
                <button aria-label={`Remove ${s.name}`} className="text-white/55 hover:text-mcz-ember" disabled={!!busy}
                  onClick={() => { if (s.out?.url) URL.revokeObjectURL(s.out.url); setSongs((xs) => xs.filter((x) => x.id !== s.id)); }}><Trash2 size={13} /></button>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-white/60">
                <span>Sits</span>
                <input type="range" className="w-40" min={TRIM.min} max={TRIM.max} step={0.5} value={s.trimDb}
                  aria-label={`${s.name} level against the rest`} onChange={(e) => set(s.id, { trimDb: Number(e.target.value) })} />
                <span className="tabular-nums text-white/80">{s.trimDb ? `${sdb(s.trimDb)} under the rest` : "level with the rest"}</span>
              </label>
              {s.out && (
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-1">
                  <audio controls src={s.out.url} className="h-8 max-w-full" />
                  <span className="text-emerald-300">{neg(s.out.after.lufs)} LUFS · peak {neg(s.out.after.truePeakDb)} dBTP{s.out.toneAfter != null ? ` · ${r1(s.out.toneAfter)} dB from the album's tone (was ${r1(s.out.toneBefore)})` : ""}</span>
                  <button className="re-btn !w-auto px-2 text-xs" onClick={() => saveBlob(fileName(s, i), s.out.blob)}><Download size={12} /> Download</button>
                  {!IN_SHELL && <button className="re-btn !w-auto px-2 text-xs" disabled={!!busy} onClick={() => save(s, i)}><Save size={12} /> Save to Your masters ({r1(s.out.mb)} MB)</button>}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {room.ok ? (
          <button className="re-btn !w-auto px-3" disabled={!!busy} onClick={() => input.current?.click()}>
            <Plus size={14} /> Add songs{room.left != null ? ` (${room.left} left)` : ""}
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-1 text-[11px] text-mcz-gold">
            <Lock size={12} /> {cap} songs is your plan's album{nextCap ? ` — Premium masters ${nextCap} together, StatZ unlimited.` : cap != null ? " — StatZ is unlimited." : "."}
            {cap != null && !IN_SHELL && <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See plans</button>}
          </span>
        )}
        <input ref={input} type="file" multiple accept="audio/*,video/*,.wav,.flac,.mp3,.m4a,.aac,.ogg" className="hidden"
          onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ""; if (fs.length) add(fs); }} />
        {songs.length > 1 && (
          <button className="neon-btn-primary !w-auto px-4" disabled={!!busy} onClick={masterAll}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Disc3 size={14} />} {allOut ? "Master the album again" : "Master the album"}
          </button>
        )}
        {songs.length > 1 && <span className="text-[11px] text-emerald-300">Free</span>}
        {allOut && <button className="re-btn !w-auto px-3" onClick={() => songs.forEach((s, i) => saveBlob(fileName(s, i), s.out.blob))}><Download size={14} /> Download all</button>}
      </div>
      {songs.length === 1 && <p className="text-[11px] text-white/60">Add at least one more song: an album master needs two to agree with.</p>}
      {inspiration && songs.length > 1 && (
        <label className="flex items-center gap-2 text-[11px] text-white/60">
          <input type="checkbox" checked={toInspiration} onChange={(e) => setToInspiration(e.target.checked)} />
          Match every song to your Inspiration ({inspiration.name}) instead of the album's own average tone
        </label>
      )}
      {exportCtl && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
          <span>Files:</span>
          <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" aria-label="Album file format"
            value={exportOpts.format === "mp3" ? "mp3" : `wav${exportOpts.depth}`}
            onChange={(e) => { const v = e.target.value; if (v === "mp3") exportCtl.setFormat("mp3"); else { exportCtl.setFormat("wav"); exportCtl.setBitDepth(Number(v.slice(3))); } }}>
            <option value="wav24" disabled={exportCtl.wavBits < 24}>24-bit WAV{exportCtl.wavBits < 24 && exportCtl.wav24Tier ? ` (${exportCtl.wav24Tier})` : ""}</option>
            <option value="wav16" disabled={exportCtl.wavBits < 16}>16-bit WAV{exportCtl.wavBits < 16 && exportCtl.wavTier ? ` (${exportCtl.wavTier})` : ""}</option>
            <option value="mp3">MP3</option>
          </select>
          {exportOpts.format === "mp3" && (
            <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" aria-label="Album MP3 bitrate" value={exportOpts.kbps}
              onChange={(e) => exportCtl.setKbps(Number(e.target.value))}>
              {exportCtl.kbpsList.map((k) => <option key={k} value={k}>{k} kbps</option>)}
            </select>
          )}
          <span className="text-white/55">your plan's WAV ladder, the same as a single master · each song at its own sample rate</span>
        </div>
      )}
      <p className="text-[11px] text-white/55">Every song is mastered to {neg(albumLufs(getSettings(), inspiration))} LUFS, less any trim you set.</p>
      {busy && <p className="text-[11px] text-white/60">{busy}…</p>}
      {report && <div className="space-y-0.5 text-[11px] text-emerald-300">{report.lines.map((l) => <p key={l}>{l}</p>)}</div>}
      {msg && <p className="text-[11px] text-emerald-300">{msg}</p>}
      {err && <p role="alert" className="text-[11px] text-mcz-ember">{err}</p>}
    </div>
  );
}
