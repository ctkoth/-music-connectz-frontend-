// One DAW workspace, shared by every DAW in DawZ. A DAW app (Arsenal, and the ones that follow) passes
// its WORKFLOW — name, mark, which windows it opens and its default edit mode — and this does the rest
// on the shared engine. Everything runs on the member's device; nothing is uploaded until they press
// Save to FileZ, and the screen says so before anything else.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight, ChevronLeft, ChevronRight, Circle, Copy, Download, FolderOpen, Loader2, Minus, Play, Plus, Redo2, Save, Scissors,
  SkipBack, Square, Trash2, Undo2, Upload, Wand2,
} from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import Doors from "../components/Doors.jsx";
import { handOff, onHandoff } from "../handoff.js";
import { mediaError } from "../recorder.js";
import { useRecordingHold, useTabActive } from "../useRecordingHold.js";
import { createDaw } from "./engine.js";
import ChannelRack from "./ChannelRack.jsx";
import EditWindow from "./EditWindow.jsx";
import MixWindow from "./MixWindow.jsx";
import {
  BPM, EDIT_MODES, GRIDS, addRegion, addSource, addTrack, armTrack, armedTrack, barsBeats, cleanSession, deletePlaylist,
  duplicateRegion, findRegion, lengthOf, minSec, moveRegion, newPlaylist, newSession, nudgeRegion, recordInto, regionsOf,
  removeRegion, removeTrack, setSession, setTrack, splitRegion, switchPlaylist, trimRegion, updateRegion, uid,
} from "./session.js";
import { cleanInserts } from "./plugins.js";
import { getSource, listSessions, loadSession, putSource, removeSession, saveSession } from "./store.js";

const MODE_LABEL = {
  slip: { label: "Slip", what: "regions go exactly where you drop them" },
  grid: { label: "Grid", what: "region starts snap to the grid" },
  shuffle: { label: "Shuffle", what: "regions on a track butt up against each other; deleting one closes the gap" },
};
const WINDOW_NAME = { edit: "Edit", mix: "Mix", rack: "Channel Rack" };
const isMedia = (u) => /^(audio|video)\//i.test(u?.content_type || "") || /\.(wav|mp3|m4a|aac|ogg|oga|opus|flac|webm|mp4|mov)$/i.test(u?.name || "");

function Library({ onPick, onClose }) {
  const [files, setFiles] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/economy/uploads/").then((d) => setFiles((d.uploads || []).filter((u) => isMedia(u) && u.url && !u.missing))).catch((e) => setErr(e.message));
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="neon-frame max-h-[85vh] w-full max-w-lg overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-semibold">From FileZ</p>
        <p className="mb-3 text-xs text-white/55">Audio and video you've saved. A video brings in its sound.</p>
        {!files && !err && <p className="text-xs text-white/50"><Loader2 size={12} className="mr-1 inline animate-spin" />Loading…</p>}
        {files && !files.length && <p className="text-xs text-white/50">No audio or video in FileZ yet.</p>}
        <ul className="space-y-1">
          {(files || []).map((u) => (
            <li key={u.id}>
              <button type="button" className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-left text-xs hover:bg-white/10" onClick={() => onPick(u)}>
                <span className="truncate">{u.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {err && <p className="mt-2 text-xs text-mcz-ember">{err}</p>}
        <button className="re-btn mt-3 !w-auto px-4" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function Workspace({ workflow }) {
  const daw = useMemo(() => createDaw(), []);
  const [session, setRaw] = useState(() => setSession(newSession(), { editMode: workflow.editMode || "slip" }));
  const sRef = useRef(session);
  const past = useRef([]);
  const future = useRef([]);
  const [, bump] = useState(0);
  const [sessionId, setSessionId] = useState(() => uid("ses"));
  const [saved, setSaved] = useState([]);         // sessions on this device
  const [storeErr, setStoreErr] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(() => workflow.windows?.[0] || "edit");
  const [zoom, setZoom] = useState(40);           // pixels per second
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [click, setClick] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [lib, setLib] = useState(false);
  const [note, setNote] = useState("");
  const [bounced, setBounced] = useState(null);   // { blob, url, seconds }
  const [upload, setUpload] = useState(null);     // the FileZ row once saved
  const [storage, setStorage] = useState(null);
  const [missing, setMissing] = useState(0);
  const fileIn = useRef(null);
  const headRef = useRef(0);

  const put = (s) => { sRef.current = s; setRaw(s); };
  const commit = useCallback((fn) => {
    const next = fn(sRef.current);
    if (next === sRef.current) return;
    past.current = [...past.current.slice(-99), sRef.current];
    future.current = [];
    put(next);
    bump((n) => n + 1);
  }, []);
  const undo = () => { if (!past.current.length) return; future.current = [sRef.current, ...future.current]; put(past.current.pop()); bump((n) => n + 1); };
  const redo = () => { if (!future.current.length) return; past.current = [...past.current, sRef.current]; put(future.current.shift()); bump((n) => n + 1); };

  // ---- the device: sessions and their audio ----
  const refreshList = useCallback(() => listSessions().then((rows) => setSaved(rows.filter((r) => r.app === workflow.app))).catch(() => setSaved([])), [workflow.app]);

  const open = useCallback(async (id) => {
    setBusy("Opening the session…"); setErr(""); setMsg("");
    try {
      const row = await loadSession(id);
      if (!row) throw new Error("That session isn't on this device any more.");
      const s = cleanSession(row.session);
      s.tracks = s.tracks.map((t) => ({ ...t, inserts: cleanInserts(t.inserts) }));
      let lost = 0;
      for (const sid of Object.keys(s.sources)) {
        if (daw.buffer(sid)) continue;
        const blob = await getSource(sid);
        if (!blob) { lost += 1; continue; }
        try {
          const meta = await daw.decode(await blob.arrayBuffer(), s.sources[sid].name);
          daw.adopt(sid, daw.buffer(meta.id));
        } catch { lost += 1; }
      }
      setMissing(lost);
      past.current = []; future.current = [];
      put(s); setSessionId(id); setSelected(null); setPlayhead(0); setBounced(null); setUpload(null);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  }, [daw]);

  useEffect(() => {
    refreshList().then(() => listSessions().then((rows) => {
      const last = rows.find((r) => r.app === workflow.app);
      if (last) open(last.id);
    }).catch(() => setStoreErr("This browser isn't keeping sessions here (private window or blocked site data), so this session lasts until the tab closes.")));
    api("/api/economy/dawz/").then((d) => setNote(d?.plugin_note || "")).catch(() => {});
    api("/api/economy/uploads/").then(setStorage).catch(() => {});
    return () => daw.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave, a moment after the last edit.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!lengthOf(session) && !Object.keys(session.sources).length && session.tracks.length === 1) return;
      saveSession(sessionId, workflow.app, session).then(() => { setStoreErr(""); refreshList(); })
        .catch((e) => setStoreErr(`Couldn't keep this session on the device: ${e.message}`));
    }, 800);
    return () => clearTimeout(t);
  }, [session, sessionId, workflow.app, refreshList]);

  // Faders and pans reach a playing session without a restart.
  useEffect(() => { daw.setLive(session); }, [daw, session]);

  // The playhead while playing.
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0; let last = 0;
    const tick = (now) => {
      const p = daw.position();
      if (p != null) { headRef.current = p; if (now - last > 50) { setPlayhead(p); last = now; } }
      if (!recording && p != null && p > lengthOf(sRef.current) + 2 && lengthOf(sRef.current) > 0) { stopPlay(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- transport ----
  const startPlay = async (from = playhead) => {
    setErr("");
    try { await daw.play(sRef.current, from, { click }); setPlaying(true); } catch (e) { setErr(e.message); }
  };
  const stopPlay = () => {
    const p = daw.stop();
    setPlaying(false);
    if (p != null) setPlayhead(p);
  };
  const seek = (t) => {
    const at = Math.max(0, t);
    setPlayhead(at); headRef.current = at;
    if (playing && !recording) startPlay(at);
  };
  const restartIfPlaying = () => { if (playing && !recording) startPlay(headRef.current); };

  const record = async () => {
    setErr(""); setMsg("");
    if (recording) {
      setBusy("Finishing the take…");
      try {
        const take = await daw.stopRecording();
        setUnsaved(true); setRecording(false); setPlaying(false);
        if (!take) { setErr("Nothing was captured — the microphone sent no sound."); return; }
        if (take.silent) { setErr("That take is silent — check the microphone isn't muted, then record again. It was not added."); return; }
        const armed = armedTrack(sRef.current);
        if (!armed) return;
        const name = `${armed.name} take`;
        let kept = false;
        commit((s) => {
          const withSrc = addSource(s, { id: take.id, name, duration: take.duration, channels: take.channels, rate: take.rate });
          const out = recordInto(withSrc, armed.id, { src: take.id, at: take.from, name });
          kept = out.keptPrevious;
          return out.session;
        });
        setPlayhead(take.from + take.duration);
        const lined = take.offsetMs > 0 ? ` Lined up ${take.offsetMs} ms earlier for this device's own audio delay.` : "";
        setMsg(`Recorded ${minSec(take.duration)} onto ${armed.name}.${kept ? " What was under it is kept as the previous take in the playlist menu." : ""}${lined}`);
        try { await putSource(take.id, daw.toWav(daw.buffer(take.id), 24)); } catch { setStoreErr("The take is in this session but couldn't be kept on the device — bounce or save before closing the tab."); }
      } catch (e) { setErr(e.message); } finally { setBusy(""); setTimeout(() => setUnsaved(false), 1500); }
      return;
    }
    const armed = armedTrack(sRef.current);
    if (!armed) { setErr("Arm a track first — press R on the track you want to record onto."); return; }
    try {
      let stream;
      try { stream = await daw.openMic(); } catch (e) {
        const m = mediaError(e, false);
        if (!m.retry) throw new Error(m.msg);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      await daw.startRecording(sRef.current, playhead, { click, stream });
      setRecording(true); setPlaying(true);
    } catch (e) { setErr(e.message); }
  };

  // A take keeps running when the member opens another app (recordingHold.js):
  // the shell keeps this workspace mounted, and its bar's Stop lands here. The
  // hold outlasts the take by the moment it takes to autosave, or leaving would
  // unmount the session before the new take was written to the device.
  const [unsaved, setUnsaved] = useState(false);
  useRecordingHold({ recording: recording || unsaved, label: `a take in ${workflow.name}`, stop: () => { if (recording) record(); } });
  const onScreen = useTabActive();

  // ---- getting audio in ----
  const targetTrack = (s) => {
    const sel = selected && findRegion(s, selected);
    if (sel) return sel.track.id;
    const empty = s.tracks.find((t) => !regionsOf(t).length);
    return empty?.id || null;
  };
  const bring = async (items, { own = false } = {}) => {
    setErr(""); setMsg("");
    for (const it of items) {
      setBusy(`Reading ${it.name}…`);
      try {
        const meta = await daw.decode(await it.blob.arrayBuffer(), it.name);
        try { await putSource(meta.id, it.blob); } catch { setStoreErr("This audio couldn't be kept on the device — it plays now but won't be here after the tab closes."); }
        const at = playhead;
        commit((s) => {
          let next = addSource(s, meta);
          let track = items.length === 1 && !own ? targetTrack(next) : null;
          if (!track) { next = addTrack(next, it.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40)); track = next.tracks.at(-1).id; }
          return addRegion(next, track, { src: meta.id, at, name: it.name });
        });
      } catch {
        setErr(`"${it.name}" couldn't be read as audio. WAV, MP3, M4A, OGG, FLAC and most videos work.`);
      }
    }
    setBusy("");
  };
  const fromDevice = (files) => bring([...files].map((f) => ({ name: f.name, blob: f })));
  const fromFileZ = async (u) => {
    setLib(false);
    setBusy(`Fetching ${u.name}…`);
    try {
      const r = await fetch(u.url);
      if (!r.ok) throw new Error(r.status === 404 || r.status === 410 ? "That file isn't on the server any more." : `Couldn't fetch it (${r.status}).`);
      await bring([{ name: u.name, blob: await r.blob() }]);
    } catch (e) { setErr(e.message); setBusy(""); }
  };
  // A track handed over from another app (a post, a take, a master) arrives as a URL.
  useEffect(() => onHandoff(workflow.app, (p) => { if (p?.url) fromFileZ({ url: p.url, name: p.title || p.name || "Imported audio" }); }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- region edits ----
  const sel = selected ? findRegion(session, selected) : null;
  const onCommit = (op) => {
    if (op.type === "move") commit((s) => moveRegion(s, op.id, op.at, op.track));
    if (op.type === "trim") commit((s) => trimRegion(s, op.id, op.edge, op.t));
    restartIfPlaying();
  };
  const split = () => sel && commit((s) => splitRegion(s, sel.region.id, headRef.current || playhead));
  const del = () => { if (sel) { commit((s) => removeRegion(s, sel.region.id)); setSelected(null); } };

  // ---- keys ----
  useEffect(() => {
    const onKey = (e) => {
      // Mounted but hidden behind another app: its keys are that app's keys.
      if (!onScreen) return;
      if (e.target.closest?.("input, select, textarea")) return;
      if (e.code === "Space") { e.preventDefault(); if (recording) record(); else if (playing) stopPlay(); else startPlay(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selected) { e.preventDefault(); del(); }
      else if (e.key.toLowerCase() === "b" && selected) split();
      else if (e.key === "Enter") seek(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- out ----
  const bounce = async () => {
    setErr(""); setUpload(null);
    setBusy("Bouncing the mix…");
    try {
      const buf = await daw.bounce(sRef.current);
      const blob = daw.toWav(buf, 24);
      if (bounced?.url) URL.revokeObjectURL(bounced.url);
      setBounced({ blob, url: URL.createObjectURL(blob), seconds: buf.duration });
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const fileName = () => `${(session.name || workflow.app).replace(/[^\w-]+/g, "_").slice(0, 40)}.wav`;
  const saveToFileZ = async () => {
    if (!bounced) return;
    setBusy("Saving to FileZ…"); setErr("");
    try {
      const form = new FormData();
      form.append("file", bounced.blob, fileName());
      const res = await api("/api/economy/uploads/", { method: "POST", body: form });
      setUpload(res?.upload || null);
      setStorage(res);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const mb = bounced ? bounced.blob.size / 1048576 : 0;

  const newOne = () => {
    if (playing) stopPlay();
    past.current = []; future.current = [];
    put(setSession(newSession(), { editMode: workflow.editMode || "slip" }));
    setSessionId(uid("ses")); setSelected(null); setPlayhead(0); setBounced(null); setUpload(null); setMissing(0); setMsg("");
  };
  const dropSession = async () => {
    if (!window.confirm(`Delete "${session.name}" from this device? Its recordings go with it. Anything you saved to FileZ stays.`)) return;
    try { await removeSession(sessionId); } catch { /* already gone */ }
    newOne();
    refreshList();
  };

  const len = lengthOf(session);
  const armed = armedTrack(session);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3">
        <IconImg icon={workflow.icon} alt={workflow.name} className="h-14 w-14 rounded-2xl shadow-neon"
                 fallback={<span className="text-4xl">{workflow.emoji}</span>} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold text-mcz-cyan">{workflow.emoji} {workflow.name}</h2>
          <p className="text-sm text-white/60">{workflow.tagline}</p>
        </div>
      </header>

      <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
        <span className="text-emerald-300">Free.</span> Everything runs on your device: your session is kept in this browser on this device, and nothing is
        uploaded until you press Save to FileZ{storage?.storage_free_mb != null ? <> (counts against your storage — {storage.storage_free_mb} MB free)</> : " (counts against your storage)"}.
        Use headphones when you record, so the playback doesn't get into the mic.
      </p>
      {note && <p className="text-[11px] text-white/45">🔌 {note}</p>}
      {storeErr && <p className="text-xs text-amber-200">{storeErr}</p>}
      {missing > 0 && <p className="text-xs text-amber-200">{missing} recording{missing === 1 ? "" : "s"} in this session couldn't be found on this device, so {missing === 1 ? "it plays" : "they play"} as silence.</p>}

      {/* Session bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input className="neon-input !w-48 !py-1.5" value={session.name} aria-label="Session name"
               onChange={(e) => commit((s) => ({ ...s, name: e.target.value.slice(0, 60) }))} />
        <select className="neon-input !w-auto !py-1.5" value="" data-nomemo="true" aria-label="Open a saved session"
                onChange={(e) => e.target.value && open(e.target.value)}>
          <option value="">Open a session on this device…</option>
          {saved.map((r) => <option key={r.id} value={r.id}>{r.name} · {new Date(r.updated).toLocaleDateString()}</option>)}
        </select>
        <button type="button" className="re-btn !w-auto px-3" onClick={newOne}><Plus size={13} /> New</button>
        <button type="button" className="re-btn !w-auto px-3" onClick={dropSession}><Trash2 size={13} /> Delete</button>
        <button type="button" className="re-btn !w-auto px-3" onClick={() => fileIn.current?.click()}><Upload size={13} /> Import audio</button>
        <input ref={fileIn} type="file" accept="audio/*,video/*" multiple className="hidden" onChange={(e) => { fromDevice(e.target.files || []); e.target.value = ""; }} />
        <button type="button" className="re-btn !w-auto px-3" onClick={() => setLib(true)}><FolderOpen size={13} /> From FileZ</button>
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2 text-xs">
        <button type="button" className="re-btn !w-auto px-2" aria-label="Back to the start" onClick={() => seek(0)} disabled={recording}><SkipBack size={14} /></button>
        {playing && !recording
          ? <button type="button" className="neon-btn-primary !w-auto px-3" onClick={stopPlay}><Square size={14} /> Stop</button>
          : <button type="button" className="neon-btn-primary !w-auto px-3" onClick={() => startPlay()} disabled={recording}><Play size={14} /> Play</button>}
        <button type="button" onClick={record} disabled={!!busy && !recording}
                className={`!w-auto rounded-full px-3 py-1.5 font-semibold ${recording ? "animate-pulse bg-red-600 text-white" : "border border-red-500/60 text-red-300"}`}
                title={armed ? `Records onto ${armed.name}` : "Arm a track first (R)"}>
          <Circle size={12} className="mr-1 inline" fill="currentColor" />{recording ? "Stop recording" : armed ? `Record → ${armed.name}` : "Record"}
        </button>
        <label className="flex items-center gap-1 text-white/70"><input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} disabled={playing} /> Click</label>
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-sm tabular-nums text-emerald-300">{barsBeats(session, playhead)}</span>
        <span className="font-mono tabular-nums text-white/60">{minSec(playhead)} / {minSec(len)}</span>
        <label className="flex items-center gap-1 text-white/60">BPM
          <input type="number" className="neon-input !w-16 !py-1" min={BPM.min} max={BPM.max} value={session.bpm} disabled={recording}
                 onChange={(e) => commit((s) => setSession(s, { bpm: e.target.value }))} />
        </label>
        <label className="flex items-center gap-1 text-white/60">Beats/bar
          <input type="number" className="neon-input !w-12 !py-1" min={1} max={12} value={session.meter} disabled={recording}
                 onChange={(e) => commit((s) => setSession(s, { meter: e.target.value }))} />
        </label>
      </div>

      {/* Edit tools */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex overflow-hidden rounded-lg border border-white/15" role="tablist" aria-label="Window">
          {(workflow.windows || ["edit", "mix"]).map((w) => (
            <button key={w} type="button" role="tab" aria-selected={view === w} onClick={() => setView(w)}
                    className={`px-3 py-1.5 ${view === w ? "bg-mcz-cyan/25 text-white" : "text-white/60"}`}>{workflow.windowNames?.[w] || WINDOW_NAME[w] || w}</button>
          ))}
        </div>
        {view === "edit" && (
          <>
            <div className="flex overflow-hidden rounded-lg border border-white/15" role="radiogroup" aria-label="Edit mode">
              {EDIT_MODES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={session.editMode === m} title={MODE_LABEL[m].what}
                        onClick={() => commit((s) => setSession(s, { editMode: m }))}
                        className={`px-2.5 py-1.5 ${session.editMode === m ? "bg-white/20 text-white" : "text-white/55"}`}>{MODE_LABEL[m].label}</button>
              ))}
            </div>
            <label className="flex items-center gap-1 text-white/60">Grid
              <select className="neon-input !w-auto !py-1" data-nomemo="true" value={session.grid} onChange={(e) => commit((s) => setSession(s, { grid: e.target.value }))}>
                {Object.keys(GRIDS).map((g) => <option key={g} value={g}>{g === "1" ? "1 bar" : `${g} note`}</option>)}
              </select>
            </label>
            <button type="button" className="re-btn !w-auto px-2" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(5, z / 1.5))}><Minus size={13} /></button>
            <button type="button" className="re-btn !w-auto px-2" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(400, z * 1.5))}><Plus size={13} /></button>
            <button type="button" className="re-btn !w-auto px-2" aria-label="Undo" onClick={undo} disabled={!past.current.length}><Undo2 size={13} /></button>
            <button type="button" className="re-btn !w-auto px-2" aria-label="Redo" onClick={redo} disabled={!future.current.length}><Redo2 size={13} /></button>
            <span className="text-white/40">{MODE_LABEL[session.editMode].what}</span>
          </>
        )}
      </div>

      {view === "rack" ? (
        <ChannelRack app={workflow.app} daw={daw} bpm={session.bpm} busy={busy}
                     onSend={async (blob, name) => { await bring([{ name, blob }], { own: true }); setMsg(`${name.replace(/\.wav$/, "")} is on the Playlist at the playhead, on its own track.`); }} />
      ) : view === "edit" ? (
        <EditWindow
          session={session} daw={daw} zoom={zoom} selected={selected} onSelect={setSelected} onSeek={seek} playhead={playhead}
          onCommit={onCommit} recording={recording}
          onTrack={(id, patch) => commit((s) => setTrack(s, id, patch))}
          onArm={(id) => commit((s) => armTrack(s, id))}
          onAddTrack={() => commit((s) => addTrack(s))}
          onRemoveTrack={(id) => { if (window.confirm("Remove this track and every take on it?")) { commit((s) => removeTrack(s, id)); restartIfPlaying(); } }}
          onPlaylist={(id, op) => {
            if (op.type === "switch") commit((s) => switchPlaylist(s, id, op.index));
            if (op.type === "new") commit((s) => newPlaylist(s, id));
            if (op.type === "copy") commit((s) => newPlaylist(s, id, { copy: true }));
            restartIfPlaying();
          }}
        />
      ) : (
        <MixWindow
          session={session} daw={daw} playing={playing}
          onTrack={(id, patch) => commit((s) => setTrack(s, id, patch))}
          onInserts={(id, list) => { commit((s) => setTrack(s, id, { inserts: cleanInserts(list) })); restartIfPlaying(); }}
          onMaster={(g) => commit((s) => setSession(s, { master: g }))}
        />
      )}

      {/* Region (spot) editor */}
      {view === "edit" && sel && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-black/40 p-2 text-xs">
          <label className="text-white/60">Region
            <input className="neon-input !w-40 !py-1" value={sel.region.name} onChange={(e) => commit((s) => updateRegion(s, sel.region.id, { name: e.target.value }))} />
          </label>
          <label className="text-white/60" title="Spot: type the exact start">Start (s)
            <input type="number" step="0.01" className="neon-input !w-24 !py-1" value={Number(sel.region.at.toFixed(3))}
                   onChange={(e) => commit((s) => updateRegion(s, sel.region.id, { at: e.target.value }))} />
          </label>
          <label className="text-white/60">Gain (dB)
            <input type="number" step="0.5" className="neon-input !w-20 !py-1" value={sel.region.gain} onChange={(e) => commit((s) => updateRegion(s, sel.region.id, { gain: e.target.value }))} />
          </label>
          <label className="text-white/60">Fade in (s)
            <input type="number" step="0.05" min="0" className="neon-input !w-20 !py-1" value={sel.region.fadeIn} onChange={(e) => commit((s) => updateRegion(s, sel.region.id, { fadeIn: e.target.value }))} />
          </label>
          <label className="text-white/60">Fade out (s)
            <input type="number" step="0.05" min="0" className="neon-input !w-20 !py-1" value={sel.region.fadeOut} onChange={(e) => commit((s) => updateRegion(s, sel.region.id, { fadeOut: e.target.value }))} />
          </label>
          <button type="button" className="re-btn !w-auto px-2" onClick={split} title="Split at the playhead (B)"><Scissors size={13} /> Split</button>
          <button type="button" className="re-btn !w-auto px-2" onClick={() => commit((s) => duplicateRegion(s, sel.region.id))}><Copy size={13} /> Duplicate</button>
          <button type="button" className="re-btn !w-auto px-2" aria-label="Nudge earlier" onClick={() => commit((s) => nudgeRegion(s, sel.region.id, -1))}><ChevronLeft size={13} /></button>
          <button type="button" className="re-btn !w-auto px-2" aria-label="Nudge later" onClick={() => commit((s) => nudgeRegion(s, sel.region.id, 1))}><ChevronRight size={13} /></button>
          <button type="button" className="re-btn !w-auto px-2 text-mcz-ember" onClick={del}><Trash2 size={13} /> Delete</button>
          <span className="text-white/40">Nudge moves by one grid step. Drag the edges to trim.</span>
        </div>
      )}

      {view === "edit" && session.tracks.some((t) => t.playlists.length > 1) && (
        <p className="text-[11px] text-white/45">
          <ArrowLeftRight size={11} className="mr-1 inline" />Each track's menu switches between its takes. Only the take shown plays.
          {session.tracks.filter((t) => t.playlists.length > 1).map((t) => (
            <button key={t.id} type="button" className="ml-2 underline" onClick={() => { if (window.confirm(`Delete "${t.playlists[t.active].name}" on ${t.name}?`)) commit((s) => deletePlaylist(s, t.id)); }}>
              Delete {t.name}'s current take
            </button>
          ))}
        </p>
      )}

      {(busy || msg || err) && (
        <div className="text-xs" role="status">
          {busy && <p className="text-white/60"><Loader2 size={12} className="mr-1 inline animate-spin" />{busy}</p>}
          {msg && <p className="text-emerald-300">{msg}</p>}
          {err && <p className="text-mcz-ember">{err}</p>}
        </div>
      )}

      {/* Bounce and what to do with it */}
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="neon-btn-primary !w-auto px-4" disabled={!len || !!busy || recording} onClick={bounce}><Wand2 size={14} /> Bounce the mix</button>
          <span className="text-white/55"><span className="text-emerald-300">Free</span> · a 24-bit WAV of everything you can hear, made on your device ({minSec(len, false)} plus a 2-second tail for reverb and delay).</span>
        </div>
        {bounced && (
          <div className="space-y-2">
            <audio src={bounced.url} controls className="w-full" />
            <div className="flex flex-wrap items-center gap-2">
              <a className="re-btn !w-auto px-3" href={bounced.url} download={fileName()}><Download size={13} /> Download WAV ({mb.toFixed(1)} MB)</a>
              {!upload && (
                <button type="button" className="neon-btn-primary !w-auto px-3" disabled={!!busy} onClick={saveToFileZ}>
                  <Save size={13} /> Save to FileZ <span className="text-white/60">· uses {mb.toFixed(1)} MB of your storage</span>
                </button>
              )}
              {upload && (
                <button type="button" className="re-btn !w-auto px-3" onClick={() => handOff("mixconnectz", "", { url: upload.url, title: session.name })}>
                  🎚️ Master it in Mix ConnectZ (free)
                </button>
              )}
            </div>
            {upload && (
              <>
                <p className="text-emerald-300">Saved to FileZ.</p>
                <Doors item={{ title: session.name, url: upload.url, kind: "audio", uploadId: upload.id }} />
              </>
            )}
          </div>
        )}
      </div>

      {lib && <Library onPick={fromFileZ} onClose={() => setLib(false)} />}
    </div>
  );
}
