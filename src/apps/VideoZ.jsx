// VideoZ — a multitrack video editor in the Sony Vegas mould, on the member's
// own device. Videos, photos, titles and audio on as many tracks as they need;
// drag, trim, split, crossfade, filters and FX, picture-in-picture, and (StatZ)
// a photo's mouth lip-synced to a voice. Then export to a real file.
//
// The cost/gain line is the whole price: FREE, because nothing leaves the
// device until Save, and Save counts against storage the member already has.
// Export runs at playback speed — said beside the button before it is pressed,
// with the format the browser will write.
//
// It decides nothing on its own: edits are project.js's, the look is look.js's,
// the drawing is render.js's. This file is wiring and words.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FolderOpen, Loader2, Magnet, Pause, Play, Plus, Redo2, Save, SkipBack, Square, Type, Undo2, Upload } from "lucide-react";
import { api } from "../api.js";
import { onHandoff } from "../handoff.js";
import { IconImg } from "../App.jsx";
import Doors from "../components/Doors.jsx";
import { useStatzTrial } from "../components/StatzSample.jsx";
import Timeline from "../videoedit/Timeline.jsx";
import Inspector from "../videoedit/Inspector.jsx";
import {
  ASPECTS, MAX_SECONDS, addClips, addTrack, blockedReason, clipsOn, clock, closeGaps, defaultTrack, duplicateClip,
  kindOfFile, lengthOf, moveClip, moveTrack, newProject, orderByTaken, removeClip, removeTrack, setTrack,
  splitClip, trackName, trimClip, uid, updateClip,
} from "../videoedit/project.js";
import { canRecord, createEngine, fetchAsLocal, probeMedia, recordType } from "../videoedit/render.js";
import { loadVoice, onVoices } from "../videoedit/lipsync.js";

const HISTORY = 100;

function kindOfUpload(u) {
  return kindOfFile(u?.content_type);
}

/** Pick from what the member already has on the platform: FileZ uploads and finished Video ConnectZ renders. */
function Library({ onAdd, onClose }) {
  const [files, setFiles] = useState(null);
  const [renders, setRenders] = useState([]);
  const [pick, setPick] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/economy/uploads/").then((d) => setFiles((d.uploads || []).filter((u) => kindOfUpload(u) && u.url))).catch((e) => setErr(e.message));
    api("/api/economy/videoz/").then((d) => setRenders((d.works || []).filter((w) => w.status === "done" && w.video_url))).catch(() => {});
  }, []);
  const rows = [
    ...renders.map((w) => ({ key: `r${w.id}`, url: w.video_url, name: w.title || `${w.label} — ${w.prompt.slice(0, 40)}`, kind: "video", from: "Video ConnectZ" })),
    ...(files || []).map((u) => ({ key: `u${u.id}`, url: u.url, name: u.name, kind: kindOfUpload(u), from: "FileZ", taken: Date.parse(u.created_at) || 0 })),
  ];
  const toggle = (k) => setPick((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const add = async () => {
    setBusy(true); setErr("");
    try {
      // In the order they were ticked — that is the order they land on the track.
      await onAdd(pick.map((k) => rows.find((r) => r.key === k)));
      onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="neon-frame max-h-[85vh] w-full max-w-lg overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-semibold">From your files</p>
        <p className="mb-3 text-xs text-white/55">Tick them in the order you want them — that's the order they go onto the track.</p>
        {!files && !err && <p className="text-xs text-white/50"><Loader2 size={12} className="mr-1 inline animate-spin" />Loading…</p>}
        {files && !rows.length && <p className="text-xs text-white/50">No videos, photos or audio in FileZ yet.</p>}
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs">
                <input type="checkbox" checked={pick.includes(r.key)} onChange={() => toggle(r.key)} />
                {pick.includes(r.key) && <span className="rounded bg-mcz-cyan/30 px-1 tabular-nums">{pick.indexOf(r.key) + 1}</span>}
                <span className="truncate">{r.name}</span>
                <span className="ml-auto shrink-0 text-white/40">{r.kind} · {r.from}</span>
              </label>
            </li>
          ))}
        </ul>
        {err && <p className="mt-2 text-xs text-mcz-ember">{err}</p>}
        <div className="mt-3 flex gap-2">
          <button className="neon-btn-primary !w-auto px-4" disabled={!pick.length || busy} onClick={add}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add {pick.length || ""}
          </button>
          <button className="re-btn !w-auto px-4" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function VideoZ() {
  const [project, setProjectRaw] = useState(newProject);
  const past = useRef([]);
  const future = useRef([]);
  const dragStart = useRef(null);
  const [, bumpHistory] = useState(0);
  const [selected, setSelected] = useState(null);
  const [t, setT] = useState(0);
  const [zoom, setZoom] = useState(40);
  const [snapOn, setSnapOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [lib, setLib] = useState(false);
  const [exp, setExp] = useState(null);        // { t, total } while exporting
  const [result, setResult] = useState(null);  // { url, blob, ext, hiddenSeconds }
  const [saved, setSaved] = useState(null);    // the FileZ upload once saved
  const [storage, setStorage] = useState(null);
  const [muteExport, setMuteExport] = useState(false);
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const tRef = useRef(0);
  const { s: statz } = useStatzTrial();
  const lipAllowed = !!(statz?.is_statz || statz?.active);

  // ---- history: every committed edit is one undo step ----
  // The project lives in a ref as well as state, so an edit never runs inside a
  // state updater (React may run those twice, and history would double up).
  const pRef = useRef(project);
  const put = (next) => { pRef.current = next; setProjectRaw(next); };
  const commit = useCallback((fn) => {
    const p = pRef.current;
    const next = typeof fn === "function" ? fn(p) : fn;
    if (next === p) return p;
    past.current = [...past.current.slice(-HISTORY + 1), p];
    future.current = [];
    bumpHistory((n) => n + 1);
    put(next);
    return next;
  }, []);
  const live = (fn) => {
    if (!dragStart.current) dragStart.current = pRef.current;
    put(fn(pRef.current));
  };
  const settle = (changed) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (changed && start && start !== pRef.current) {
      past.current = [...past.current.slice(-HISTORY + 1), start];
      future.current = [];
      bumpHistory((n) => n + 1);
    }
  };
  const undo = () => {
    if (!past.current.length) return;
    future.current = [pRef.current, ...future.current];
    put(past.current.pop());
    bumpHistory((n) => n + 1);
  };
  const redo = () => {
    if (!future.current.length) return;
    past.current = [...past.current, pRef.current];
    put(future.current.shift());
    bumpHistory((n) => n + 1);
  };

  // ---- the engine ----
  useEffect(() => {
    engine.current = createEngine(canvasRef.current);
    api("/api/economy/uploads/").then((d) => setStorage(d)).catch(() => {});
    return () => engine.current?.destroy();
  }, []);
  const redraw = useCallback(() => { if (!engine.current?.isPlaying()) engine.current?.drawAt(tRef.current); }, []);
  useEffect(() => {
    engine.current?.setProject(project);
    engine.current?.setLipAllowed(lipAllowed);
    redraw();
  }, [project, lipAllowed, redraw]);
  useEffect(() => onVoices(redraw), [redraw]);
  // Read every voice a lip-synced photo follows, once per file.
  useEffect(() => {
    const lips = project.clips.filter((c) => c.kind === "image" && c.lip?.on);
    if (!lips.length || !lipAllowed) return;
    const sounding = project.clips.filter((c) => c.kind === "video" || c.kind === "audio");
    lips.forEach((c) => (c.lip.source === "mix" ? sounding : sounding.filter((x) => x.id === c.lip.source)).forEach((x) => loadVoice(x.src)));
  }, [project, lipAllowed]);

  const length = lengthOf(project);
  const seek = (x) => {
    const v = Math.max(0, Math.min(x, Math.max(length, 0)));
    tRef.current = v; setT(v);
    if (!engine.current?.isPlaying()) engine.current?.drawAt(v);
  };

  const play = async () => {
    if (playing) { engine.current.stop(); return; }
    if (!length) return;
    const from = tRef.current >= length - 0.05 ? 0 : tRef.current;
    setPlaying(true); setErr("");
    let last = 0;
    try {
      await engine.current.play({
        from,
        onTick: (now) => { tRef.current = now; if (performance.now() - last > 60) { last = performance.now(); setT(now); } },
      });
    } catch (e) { setErr(e.message); }
    setPlaying(false);
    setT(tRef.current);
    redraw();
  };

  // ---- adding media ----
  const addLocal = async (items, opts = {}) => {
    const probed = await Promise.all(items.map(async (it) => {
      const meta = await probeMedia(it.src, it.kind);
      return { ...it, duration: meta.duration, width: meta.width, height: meta.height };
    }));
    commit((p) => addClips(p, probed, opts));
  };
  const onFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    const ok = files.filter((f) => kindOfFile(f.type));
    if (!ok.length) { if (files.length) setErr("VideoZ takes videos, photos and audio files."); return; }
    setBusy("Opening your files…"); setErr("");
    try {
      await addLocal(ok.map((f) => ({ kind: kindOfFile(f.type), name: f.name, src: URL.createObjectURL(f), taken: f.lastModified })));
    } catch (x) { setErr(x.message); } finally { setBusy(""); }
  };
  const addFromLibrary = async (rows) => {
    setBusy("Fetching your files…");
    try {
      const local = [];
      for (const r of rows) {
        const f = await fetchAsLocal(r.url);
        local.push({ kind: r.kind, name: r.name, src: f.src, taken: r.taken || 0 });
      }
      await addLocal(local);
    } finally { setBusy(""); }
  };
  // A finished video handed over from Video ConnectZ (or anywhere with an "Edit in VideoZ").
  useEffect(() => onHandoff("videoz", (p) => {
    if (!p?.url) return;
    addFromLibrary([{ url: p.url, name: p.name || "Video", kind: p.kind || "video" }]).catch((e) => setErr(e.message));
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addTitle = () => {
    const id = uid();
    commit((p) => addClips(p, [{ id, kind: "text", text: "Your title", seconds: 3 }], { track: defaultTrack(p, "text"), at: tRef.current }));
    setSelected(id);
  };

  // ---- selection and keys ----
  const sel = project.clips.find((c) => c.id === selected) || null;
  const split = () => sel && commit((p) => splitClip(p, sel.id, tRef.current));
  const del = () => { if (sel) { commit((p) => removeClip(p, sel.id)); setSelected(null); } };
  useEffect(() => {
    const key = (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (e.code === "Space") { e.preventDefault(); play(); }
      else if (e.key === "s" || e.key === "S") split();
      else if (e.key === "Delete" || e.key === "Backspace") del();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const onClipDrag = (d) => live((p) => (d.type === "move" ? moveClip(p, d.id, d.at, d.track) : trimClip(p, d.id, d.edge, d.time)));
  const onTrack = (op, id, arg) => {
    if (op === "set") commit((p) => setTrack(p, id, arg));
    else if (op === "move") commit((p) => moveTrack(p, id, arg));
    else if (op === "remove") {
      const n = clipsOn(project, id).length;
      if (n && !window.confirm(`Remove ${trackName(project, id)} and its ${n} clip${n === 1 ? "" : "s"}? Undo brings it back.`)) return;
      commit((p) => removeTrack(p, id));
    }
  };

  // ---- export ----
  const recorder = canRecord();
  const type = useMemo(() => (recorder ? recordType() : ""), [recorder]);
  const blocked = blockedReason(project, { recorder });
  const doExport = async () => {
    if (blocked || exp) return;
    engine.current.stop();
    setResult((r) => { if (r?.url) URL.revokeObjectURL(r.url); return null; });
    setSaved(null); setErr("");
    setExp({ t: 0, total: length });
    engine.current.setMonitor(!muteExport);
    let last = 0;
    try {
      const out = await engine.current.play({
        from: 0, record: true,
        onTick: (now, total) => { if (performance.now() - last > 200) { last = performance.now(); setExp({ t: now, total }); } },
      });
      if (out) setResult({ ...out, url: URL.createObjectURL(out.blob) });
    } catch (e) { setErr(e.message); }
    engine.current.setMonitor(true);
    setExp(null);
    redraw();
  };
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const saveToFileZ = async () => {
    if (!result) return;
    setBusy("Saving to FileZ…"); setErr("");
    try {
      const form = new FormData();
      form.append("file", result.blob, `videoz-${stamp()}.${result.ext}`);
      const res = await api("/api/economy/uploads/", { method: "POST", body: form });
      setSaved(res?.upload || null);
      setStorage(res);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const mb = result ? result.blob.size / 1048576 : 0;

  const { w: W, h: H } = ASPECTS[project.aspect];
  const bottomVideo = project.tracks.filter((x) => x.kind === "video").at(-1)?.id;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <IconImg icon="videoz.png" alt="VideoZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">VideoZ</h2>
          <p className="text-sm text-white/60">A multitrack editor on your device — finished videos, photos, titles and sound, in the order you want, with filters and FX.</p>
        </div>
      </header>
      <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
        <span className="text-emerald-300">Free.</span> Everything runs on your device and nothing is uploaded until you press Save to FileZ
        {storage?.storage_free_mb != null ? <> (counts against your storage — {storage.storage_free_mb} MB free)</> : " (counts against your storage)"}.
        This edit lives in this tab until you export it.
      </p>

      {/* Add */}
      <div className="flex flex-wrap items-center gap-2" data-tour="videoz-add">
        <label className="neon-btn-primary !w-auto cursor-pointer px-4">
          <Upload size={14} /> Add videos, photos or audio
          <input type="file" multiple accept="video/*,image/*,audio/*" className="hidden" onChange={onFiles} />
        </label>
        <button className="re-btn !w-auto px-3" onClick={() => setLib(true)}><FolderOpen size={14} /> From FileZ / Video ConnectZ</button>
        <button className="re-btn !w-auto px-3" onClick={addTitle}><Type size={14} /> Title at playhead</button>
        <button className="re-btn !w-auto px-3" onClick={() => commit((p) => addTrack(p, "video"))}>+ Video track</button>
        <button className="re-btn !w-auto px-3" onClick={() => commit((p) => addTrack(p, "audio"))}>+ Audio track</button>
        {busy && <span className="text-xs text-white/55"><Loader2 size={12} className="mr-1 inline animate-spin" />{busy}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2">
          <div className={`mx-auto overflow-hidden rounded-xl bg-black ${project.aspect === "9:16" ? "max-w-xs" : project.aspect === "1:1" ? "max-w-md" : ""}`}>
            <canvas ref={canvasRef} width={W} height={H} className="block h-auto w-full" aria-label="Preview" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className="re-btn !w-auto px-3" onClick={() => seek(0)} title="Go to start"><SkipBack size={14} /></button>
            <button className="neon-btn-primary !w-auto px-4" onClick={play} disabled={!length || !!exp} title="Play / pause (Space)">
              {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Play"}
            </button>
            <span className="tabular-nums text-white/70">{clock(t, true)} / {clock(length, true)}</span>
            <span className="mx-1 h-4 w-px bg-white/15" />
            <button className="re-btn !w-auto px-2" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
            <button className="re-btn !w-auto px-2" onClick={redo} disabled={!future.current.length} title="Redo (Ctrl+Shift+Z)"><Redo2 size={14} /></button>
            <button className={`re-btn !w-auto px-2 ${snapOn ? "!border-mcz-cyan" : ""}`} onClick={() => setSnapOn(!snapOn)} aria-pressed={snapOn} title="Snap to edges and the playhead"><Magnet size={14} /></button>
            <label className="flex items-center gap-1 text-xs text-white/60">Zoom
              <input type="range" min={8} max={200} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-mcz-cyan" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {Object.entries(ASPECTS).map(([k, a]) => (
              <button key={k} onClick={() => commit((p) => ({ ...p, aspect: k }))}
                className={`rounded-full border px-3 py-1 ${project.aspect === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{a.label}</button>
            ))}
            <button onClick={() => commit((p) => ({ ...p, fit: p.fit === "cover" ? "contain" : "cover" }))} className="rounded-full border border-white/15 px-3 py-1 text-white/70">
              {project.fit === "cover" ? "Fill the frame (crops)" : "Fit whole picture (black bars)"}
            </button>
            <label className="flex items-center gap-1 text-white/60">Fade from black
              <input type="number" min={0} max={10} step={0.5} value={project.fadeIn} className="neon-input w-14 py-0.5 text-xs"
                onChange={(e) => commit((p) => ({ ...p, fadeIn: Math.max(0, Math.min(10, Number(e.target.value) || 0)) }))} />s
            </label>
            <label className="flex items-center gap-1 text-white/60">Fade to black
              <input type="number" min={0} max={10} step={0.5} value={project.fadeOut} className="neon-input w-14 py-0.5 text-xs"
                onChange={(e) => commit((p) => ({ ...p, fadeOut: Math.max(0, Math.min(10, Number(e.target.value) || 0)) }))} />s
            </label>
          </div>
        </div>
        <div className="neon-frame max-h-[70vh] overflow-y-auto p-3">
          <Inspector project={project} clip={sel} t={t} lipAllowed={lipAllowed}
            onChange={(patch) => commit((p) => updateClip(p, sel.id, patch))}
            onLive={(patch, done) => (done ? settle(true) : live((p) => updateClip(p, sel.id, patch)))}
            onSplit={split} onDuplicate={() => commit((p) => duplicateClip(p, sel.id))} onDelete={del} />
        </div>
      </div>

      <Timeline project={project} t={t} zoom={zoom} selected={selected} snapOn={snapOn} length={length}
        onSelect={setSelected} onSeek={seek} onClipDrag={onClipDrag} onClipDone={settle} onTrack={onTrack} />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-white/45">Upper video tracks play over lower ones. Overlap two clips on one track to crossfade. S splits at the playhead, Space plays.</span>
        {bottomVideo && clipsOn(project, bottomVideo).length > 1 && (
          <>
            <button className="re-link" onClick={() => commit((p) => orderByTaken(p, bottomVideo))}>Put {trackName(project, bottomVideo)} in the order they were taken</button>
            <button className="re-link" onClick={() => commit((p) => closeGaps(p, bottomVideo))}>Close the gaps on {trackName(project, bottomVideo)}</button>
          </>
        )}
      </div>

      {/* Export */}
      <div className="neon-frame space-y-3 p-4" data-tour="videoz-export">
        <div className="flex flex-wrap items-center gap-3">
          <button className="neon-btn-primary !w-auto px-5" disabled={!!blocked || !!exp} onClick={doExport}>
            {exp ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export the video
          </button>
          {exp && <button className="re-btn !w-auto px-3" onClick={() => engine.current.stop(false)}><Square size={12} /> Cancel</button>}
          <span className="text-xs text-white/60">
            {blocked || <>Free · makes {type.startsWith("video/mp4") ? "an MP4" : "a WebM"} at {W}×{H} · takes as long as the video ({clock(length)}) — keep this tab on screen while it runs</>}
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked={muteExport} onChange={(e) => setMuteExport(e.target.checked)} /> Silence my speakers while it exports (the file keeps its sound)
        </label>
        {exp && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-mcz-cyan" style={{ width: `${exp.total ? (exp.t / exp.total) * 100 : 0}%` }} />
            </div>
            <p className="mt-1 text-xs tabular-nums text-white/55">{clock(exp.t)} of {clock(exp.total)}</p>
          </div>
        )}
        {result && (
          <div className="space-y-2">
            <video src={result.url} controls playsInline className={`w-full rounded-xl bg-black ${project.aspect === "9:16" ? "mx-auto max-w-xs" : ""}`} />
            {result.hiddenSeconds > 0 && (
              <p className="text-xs text-mcz-gold">The tab was hidden for about {result.hiddenSeconds}s while it exported, and a browser stops drawing a hidden tab — those parts may stutter. Export again with the tab on screen.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <a className="re-btn !w-auto px-4" href={result.url} download={`videoz-${stamp()}.${result.ext}`}><Download size={14} /> Download ({mb.toFixed(1)} MB)</a>
              {!saved && (
                <button className="neon-btn-primary !w-auto px-4" disabled={!!busy} onClick={saveToFileZ}>
                  <Save size={14} /> Save to FileZ <span className="text-white/60">· uses {mb.toFixed(1)} MB of your storage</span>
                </button>
              )}
            </div>
            {saved?.url && (
              <>
                <p className="text-xs text-emerald-300">Saved to FileZ.</p>
                <Doors item={{ title: "My video", url: saved.url, kind: "video", uploadId: saved.id }} />
              </>
            )}
          </div>
        )}
        {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
        <p className="text-[11px] text-white/40">Up to {clock(MAX_SECONDS)} per export. Filters, FX, titles and the timeline are free at every tier; lip-sync is StatZ.</p>
      </div>

      {lib && <Library onAdd={addFromLibrary} onClose={() => setLib(false)} />}
    </div>
  );
}
