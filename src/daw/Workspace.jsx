// One DAW workspace, shared by every DAW in DawZ. A DAW app (Arsenal, and the ones that follow) passes
// its WORKFLOW — name, mark, which windows it opens and its default edit mode — and this does the rest
// on the shared engine. Everything runs on the member's device; nothing is uploaded until they press
// Save to FileZ, and the screen says so before anything else.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import KeyBadge from "../components/KeyBadge.jsx";
import { detectKeyFromChannels } from "../songKey.js";
import { detectTempoFromChannels } from "../tempo.js";
import { instrumentalTracks, keySentence, rhythmTracks, sessionKeyFor, tempoSentence } from "./instrumentalKey.js";
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
import { PCT_MAX, PCT_MIN, TRACK_SIZES, ZOOM_MAX, ZOOM_MIN, clampZoom, zoomFromPct, zoomPct } from "./view.js";
import SynthEditor from "./synth/SynthEditor.jsx";
import PostBounce from "../components/PostBounce.jsx";
import { swipeComp, startComp, clearComp } from "./comp.js";
import DragonBrowser from "./DragonBrowser.jsx";
import { moveSection, duplicateSection, deleteSectionWithMusic, appendSection, addSection, updateSection, removeSection, sectionProblem } from "./arranger.js";
import { loopById, renderLoop, loopFileName } from "./loopRender.js";
import { STARTERS, chainNeedsStatz, chainToInserts } from "./tonePresets.js";
import { PLUGINS } from "./plugins.js";
import CoachMix from "../components/CoachMix.jsx";
import { registerTemp } from "./synth/userPatches.js";
import MixWindow from "./MixWindow.jsx";
import { bandCap, nextBandCap } from "../eqbands.js";
import MidiImport from "./MidiImport.jsx";
import LoopLibrary from "./LoopLibrary.jsx";
import KeyActions from "./KeyActions.jsx";
import VstRack from "./VstRack.jsx";
import { pitchShift, rangeFor } from "./pitch.js";
import { loadLimits } from "../limits.js";
import { normalizeGain, NORMALIZE_TARGET_DB } from "./normalize.js";
import { actionFor, loadKeymap, loadSkin, saveKeymap, saveSkin, skinFilter } from "./keymap.js";
import SmartDrummer from "./SmartDrummer.jsx";
import Songwriter from "./Songwriter.jsx";
import {
  BPM, EDIT_MODES, GRIDS, MAX_PLAYLISTS, addRegion, addSource, addTrack, armTrack, armedTracks, inputClash, barsBeats, cleanSession, deletePlaylist,
  duplicateRegion, findRegion, lengthOf, minSec, moveRegion, newPlaylist, newSession, nudgeRegion, recordInto, regionsOf,
  removeRegion, removeTrack, setSession, setTrack, splitRegion, switchPlaylist, trimRegion, updateRegion, uid, setAuto, audible, playlistOf,
  addMarker, COUNT_INS, punchPlan, emptyTakeCount, removeEmptyTakes, dropIfEmptied, setLoop, toggleLoop, endOf, updateMarker, removeMarker, snapIf, SESSION_KEYS, projectTitle,
} from "./session.js";
import { sliceChannels, takeFileName, wavBytes } from "./takeFile.js";
import { cleanInserts } from "./plugins.js";
import { laneOf, writePass } from "./automation.js";
import { useStatzTrial } from "../components/StatzSample.jsx";
import { goToSpot } from "../goto.js";
import { isLimitMessage } from "../limitHint.js";
const DAW_NAMES = { arsenal: "⚔️ Arsenal", azrael: "☠️ Azrael", intuition: "💭 Intuition", formulawon: "🚦 FormulaWon", fruitymobius: "Fruity Möbius", witchcraft: "🔮 Witchcraft", trumptoupee: "🤵🏼‍♂️ Trump Toupee", studiodragon: "🐉 Studio Dragon" };
import { guessRole } from "../mastering/multitrack.js";
import StagePanel from "./StagePanel.jsx";
import TimingPanel from "./TimingPanel.jsx";
import AutotunePanel from "./AutotunePanel.jsx";
import MixCheck from "./MixCheck.jsx";
import { duckPoints, shiftFader } from "./mixcheck.js";
import { envelopeOf, sameAudioGroups } from "./dupes.js";
import SelectAllBar from "../components/SelectAllBar.jsx";
import { newInsert } from "./plugins.js";
import { shiftTrack } from "./align.js";
import SkillsUsed from "../SkillsUsed.jsx";
import AudioSettings from "./AudioSettings.jsx";
import OutputPick from "./OutputPick.jsx";
import { holdPeak, latencyMs, levelFromSamples, meterPos } from "./audioIO.js";
import { GENRES, GENRE_GROUPS } from "../genres.js";
import { getSource, listSessions, loadSession, putSource, removeSession, saveSession } from "./store.js";
import { listCloud, pullSession, removeCloud, sizeToSend, syncSession } from "./cloud.js";
import { mb, mergeLists, originNote } from "./cloudList.js";

const MODE_LABEL = {
  slip: { label: "Slip", what: "regions go exactly where you drop them" },
  grid: { label: "Grid", what: "region starts snap to the grid" },
  shuffle: { label: "Shuffle", what: "regions on a track butt up against each other; deleting one closes the gap" },
};
const WINDOW_NAME = { edit: "Edit", mix: "Mix", rack: "Channel Rack", drummer: "Drummer", song: "Songwriter", midi: "MIDI", loops: "Loops", actions: "Actions", vst: "VST", synth: "Synth" };
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
  const stemIn = useRef(null);
  const [others, setOthers] = useState([]);       // sessions made in the other DAWs
  const [saved, setSaved] = useState([]);         // sessions on this device
  const [storeErr, setStoreErr] = useState("");
  const remoteRef = useRef([]);                       // the merged picker rows, for open() to read
  const [cloudOn, setCloudOn] = useState(false);      // this session is also kept on the account
  const [cloudMsg, setCloudMsg] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudBytes, setCloudBytes] = useState(0);    // what turning it on would add to storage
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(() => workflow.windows?.[0] || "edit");
  const [zoom, setZoomRaw] = useState(40);        // pixels per second
  const [trackSizeKey, setTrackSizeRaw] = useState(() => { try { const v = localStorage.getItem("mcz_daw_tracksize"); return TRACK_SIZES.some((x) => x.key === v) ? v : localStorage.getItem("mcz_daw_compact") === "1" ? "compact" : "normal"; } catch { return "normal"; } });
  const setTrackSize = (k) => { setTrackSizeRaw(k); try { localStorage.setItem("mcz_daw_tracksize", k); } catch { /* not remembered */ } };
  const zoomedByHand = useRef(false);             // once the member zooms, we stop fitting for them
  const setZoom = (v) => { zoomedByHand.current = true; setZoomRaw(v); };
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [click, setClick] = useState(false);
  const [countBars, setCountBarsRaw] = useState(() => { try { const v = Number(localStorage.getItem("mcz_daw_countin")); return COUNT_INS.includes(v) ? v : 0; } catch { return 0; } });
  const [punchOn, setPunchRaw] = useState(() => { try { return localStorage.getItem("mcz_daw_punch") === "1"; } catch { return false; } });
  const setPunch = (v) => { setPunchRaw(v); try { localStorage.setItem("mcz_daw_punch", v ? "1" : "0"); } catch { /* not remembered */ } };
  const [cycleOn, setCycleRaw] = useState(() => { try { return localStorage.getItem("mcz_daw_cycle") === "1"; } catch { return false; } });
  const setCycle = (v) => { setCycleRaw(v); try { localStorage.setItem("mcz_daw_cycle", v ? "1" : "0"); } catch { /* not remembered */ } };
  const cycleInfo = useRef(null);                 // { t0, len } of the cycle being recorded, for the pass counter
  const [cyclePass, setCyclePass] = useState(0);
  const punchRef = useRef(null);                  // the plan of the take being recorded, if it is a punch
  const recordRef = useRef(null);                 // always the latest record(), for the auto punch-out
  const setCountBars = (v) => { setCountBarsRaw(v); try { localStorage.setItem("mcz_daw_countin", String(v)); } catch { /* not remembered */ } };
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
  // This device's sessions, plus the ones kept on the account (made on another device, or newer there). A failed
  // account fetch just means this device's list: the DAW never waits on the network to open what is already here.
  const refreshList = useCallback(() => listSessions().then(async (local) => {
    const remote = await listCloud().catch(() => []);
    const rows = mergeLists(local, remote);
    remoteRef.current = rows;
    setSaved(rows.filter((r) => r.app === workflow.app));
    setOthers(rows.filter((r) => r.app !== workflow.app));
  }).catch(() => { setSaved([]); setOthers([]); }), [workflow.app]);

  // asCopy: a session made in another DAW comes in as a NEW session of this one. The original stays
  // where it was, untouched; the audio is shared (sources are keyed by id), so nothing is duplicated.
  const open = useCallback(async (id, asCopy = false) => {
    setBusy("Opening the session…"); setErr(""); setMsg("");
    try {
      // Made on another device, or newer on the account: bring it here first (arrangement and every sound).
      const there = remoteRef.current.find((r) => r.id === id);
      if (there?.remote) {
        setBusy("Bringing it from your account…");
        try { await pullSession(id); } catch (e) { throw new Error(`Couldn't bring that session from your account: ${e.message}`); }
      }
      const row = await loadSession(id);
      if (!row) throw new Error("That session isn't on this device any more.");
      const s = cleanSession(row.session);
      if (asCopy) s.name = `${s.name} (from ${DAW_NAMES[row.app] || "another DAW"})`.slice(0, 60);
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
      setCloudOn(!asCopy && !!row.cloud?.on); setCloudMsg("");
      put(s); setSessionId(asCopy ? uid("ses") : id); setSelected(null); setPlayhead(0); setBounced(null); setUpload(null);
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
      saveSession(sessionId, workflow.app, session).then(() => { setStoreErr(""); setSavedAt(Date.now()); refreshList(); })
        .catch((e) => setStoreErr(`Couldn't keep this session on the device: ${e.message}`));
    }, 800);
    return () => clearTimeout(t);
  }, [session, sessionId, workflow.app, refreshList]);

  // Kept on the account: a few seconds after the last edit (after the device's own save has landed), send it up.
  useEffect(() => {
    if (!cloudOn) return undefined;
    const t = setTimeout(() => {
      syncSession(sessionId).then(() => setCloudMsg(`On your account · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`))
        .catch((e) => setCloudMsg(`Not on your account yet: ${e.message}`));
    }, 4000);
    return () => clearTimeout(t);
  }, [session, sessionId, cloudOn]);
  // What turning it on would add to storage, said before the switch.
  useEffect(() => {
    if (cloudOn) return undefined;
    let live = true;
    sizeToSend(session).then((n) => { if (live) setCloudBytes(n); }).catch(() => {});
    return () => { live = false; };
  }, [session.sources, cloudOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- automation writing (latch): while it plays with Write on, a fader or pan the member moves
  // is recorded at the playhead; that param follows the hand, not its lane, until playback stops,
  // and then the pass is written into the lane (automation.js writePass). ----
  const [lim, setLim] = useState(null);
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  // Tracks per session are the tier's (Corey: Free 3, Premium 6, StatZ unlimited — the shared count).
  // A session already over it keeps every track; only adding is refused, and the screen says so.
  const trackCapLine = (lead = "") => `${lead ? `${lead} ` : ""}${tierCap} tracks is your plan's limit${lim?.tier === "free" ? ` — Premium has ${lim?.tiers?.premium?.imagez_layers ?? 6}, StatZ unlimited` : " — StatZ is unlimited"}.`;
  const addOneTrack = () => {
    if (tierCap != null && sRef.current.tracks.length >= tierCap) { setMsg(trackCapLine("Couldn't add a track:")); return; }
    commit((s) => addTrack(s, undefined, tierCap));
  };
  // Automation is StatZ's (or the daily sample's) — Corey's call. A lane drawn while it was
  // allowed keeps playing and bouncing after; only drawing and writing lock.
  const { s: statz } = useStatzTrial();
  const autoAllowed = !!(statz?.is_statz || statz?.active);
  const [writeAuto, setWriteAuto] = useState(false);
  const writeBuf = useRef({});                    // "trackId|param" -> [{ t, v }]
  const tierCap = lim && "imagez_layers" in lim ? lim.imagez_layers : undefined;
  const liveView = (s) => {
    const keys = Object.keys(writeBuf.current);
    if (!keys.length) return s;
    return { ...s, tracks: s.tracks.map((t) => {
      const mine = keys.filter((k) => k.startsWith(`${t.id}|`)).map((k) => k.split("|")[1]);
      if (!mine.length) return t;
      const auto = { ...(t.auto || {}) };
      for (const p of mine) auto[p] = { ...laneOf(t, p), on: false };
      return { ...t, auto };
    }) };
  };
  const flushWrites = () => {
    const buf = writeBuf.current;
    writeBuf.current = {};
    const keys = Object.keys(buf).filter((k) => buf[k].length);
    if (!keys.length) return;
    commit((s) => keys.reduce((acc, k) => {
      const [id, param] = k.split("|");
      const tr = acc.tracks.find((t) => t.id === id);
      return tr ? setAuto(acc, id, param, writePass(param, laneOf(tr, param), buf[k])) : acc;
    }, s));
    setMsg(`Wrote ${keys.length === 1 ? "an automation pass" : `${keys.length} automation passes`}. In Tracks, set a track's lane to Volume or Pan to see the line and move its points.`);
  };
  const recordWrite = (id, patch) => {
    if (!writeAuto || recording || !autoAllowed) return;
    const pos = daw.position();
    if (pos == null) return;
    for (const [key, param] of [["gain", "volume"], ["pan", "pan"]]) {
      if (!(key in patch)) continue;
      const k = `${id}|${param}`;
      if (!writeBuf.current[k]) {
        writeBuf.current[k] = [];
      }
      writeBuf.current[k].push({ t: pos, v: Number(patch[key]) });
    }
  };

  // Faders and pans reach a playing session without a restart (automation included).
  useEffect(() => { daw.setLive(liveView(session)); }, [daw, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit the whole session on screen. Automatic when a session opens or first gets audio (until the member zooms by hand);
  // the Fit button does it on demand. Free at every tier: seeing your own session is not a feature.
  const fitZoom = (byHand = false) => {
    const len = lengthOf(sRef.current);
    const w = (document.querySelector("[data-timeline]")?.clientWidth || 0) - 24;
    if (len <= 0 || w <= 0) return;
    setZoomRaw(clampZoom(w / (len * 1.05)));
    zoomedByHand.current = byHand;
  };
  const sessionLen = lengthOf(session);
  useEffect(() => {
    zoomedByHand.current = false;
  }, [sessionId]);                                 // a different session: fit again
  useEffect(() => {
    if (zoomedByHand.current || !sessionLen || recording) return undefined;   // never rescale under a take being recorded
    const id = requestAnimationFrame(() => fitZoom(false));
    return () => cancelAnimationFrame(id);
  }, [sessionLen, sessionId, view]);               // eslint-disable-line react-hooks/exhaustive-deps
  // Rotating a phone or resizing the window re-fits too, until the member has zoomed by hand.
  useEffect(() => {
    const on = () => { if (!zoomedByHand.current && !recording) fitZoom(false); };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [recording]); // eslint-disable-line react-hooks/exhaustive-deps
  // Loop exactly the selected region (its start to its end), on. No selection says so rather than guessing.
  const loopSelected = () => {
    const r = selected && session.tracks.flatMap((t) => regionsOf(t)).find((x) => x.id === selected);
    if (!r) { setMsg("Select a region first (click it), then press Shift+L — or drag in the loop lane above the ruler."); return; }
    commit((s) => setLoop(s, r.at, endOf(r)));
    setMsg(`Looping ${minSec(r.at)} to ${minSec(endOf(r))}. Press L to turn it off, Space to hear it.`);
  };
  // The playhead while playing.
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0; let last = 0;
    const tick = (now) => {
      const p = daw.position();
      if (p != null && punchRef.current && p >= punchRef.current.out) { punchRef.current = null; recordRef.current?.(); return; }       // punch out: the take stops itself
      if (cycleInfo.current) { const c = cycleInfo.current; setCyclePass(Math.floor((performance.now() - c.t0) / 1000 / c.len) + 1); }
      if (p != null) { headRef.current = p; if (now - last > 50) { setPlayhead(p); last = now; } }
      if (!recording && p != null && !(sRef.current.loop?.on && p <= sRef.current.loop.end + 0.05) && p > lengthOf(sRef.current) + 2 && lengthOf(sRef.current) > 0) { stopPlay(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, recording]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- transport ----
  const startPlay = async (from = playhead) => {
    setErr("");
    flushWrites();
    try { daw.resetPeak(); setClipDb(null); await daw.play(sRef.current, from, { click }); setPlaying(true); } catch (e) { setErr(e.message); }
  };
  // Copies of the same audio on several tracks. Stacked copies of one recording comb and partly cancel, which
  // sounds like static — and a folder of exports often holds several. Each track's envelope is worked out once
  // per region and kept, so this costs nothing on the next render.
  const envCache = useRef(new Map());
  const copies = useMemo(() => {
    const items = [];
    for (const t of session.tracks) {
      if (t.mute) continue;
      const r = playlistOf(t).regions[0];
      const buf = r && daw.buffer(r.src);
      if (!buf) continue;
      const key = `${r.src}|${r.in}|${r.out}`;
      if (!envCache.current.has(key)) envCache.current.set(key, envelopeOf(buf, r.in, r.out));
      items.push({ id: t.id, env: envCache.current.get(key) });
    }
    return sameAudioGroups(items);
  }, [session.tracks, session.sources, daw]); // eslint-disable-line react-hooks/exhaustive-deps
  const nameOf = (id) => session.tracks.find((t) => t.id === id)?.name || "a track";
  // Ticked tracks, for doing one thing to many. Ticking is free; "Select all" is StatZ's (SelectAllBar).
  const [picked, setPicked] = useState([]);
  const pickedLive = picked.filter((id) => session.tracks.some((t) => t.id === id));
  const toPicked = (patch, word) => {
    commit((s) => pickedLive.reduce((acc, id) => setTrack(acc, id, patch), s));
    setMsg(`${word} ${pickedLive.length} track${pickedLive.length === 1 ? "" : "s"}. Undo puts them back.`);
  };
  const removePicked = () => {
    if (pickedLive.length >= session.tracks.length) { setErr("A session keeps at least one track — leave one unticked."); return; }
    if (!window.confirm(`Remove ${pickedLive.length} track${pickedLive.length === 1 ? "" : "s"}? Undo puts them back.`)) return;
    commit((s) => pickedLive.reduce((acc, id) => removeTrack(acc, id), s));
    setPicked([]);
  };
  // Every copy but the first of each group: what the AI prompt and the checks leave out, so they work on the
  // fewest tracks that still hold every recording once.
  const copyIds = useMemo(() => new Set(copies.flatMap((g) => g.slice(1))), [copies]);
  // StatZ (or the sample): copies that arrive with an import are removed by themselves, said, and undoable.
  // Only right after an import — copies a member made on purpose later are theirs to keep.
  const justImported = useRef(0);
  const [cleaned, setCleaned] = useState(null);    // { n, names } — what StatZ removed, on its own line
  useEffect(() => {
    // Watch the whole import, not just its first copy: files land one by one, and a third copy arriving after
    // the first clean-up must be caught too. The window closes 20 s after the import started.
    if (!copies.length || !justImported.current || Date.now() - justImported.current > 20000) return;
    if (!(statz?.is_statz || statz?.active)) return;
    const n = copies.reduce((a, g) => a + g.length - 1, 0);
    const names = copies.map((g) => nameOf(g[0]));
    commit((s) => copies.flatMap((g) => g.slice(1)).reduce((acc, id) => removeTrack(acc, id), s));
    setCleaned((c) => ({ n: (c?.n || 0) + n, names: [...new Set([...(c?.names || []), ...names])] }));
  }, [copies]); // eslint-disable-line react-hooks/exhaustive-deps
  const muteCopies = (g) => { commit((s) => g.slice(1).reduce((acc, id) => setTrack(acc, id, { mute: true }), s)); setMsg(`Muted ${g.length - 1} cop${g.length === 2 ? "y" : "ies"} — ${nameOf(g[0])} plays on its own. Undo puts them back.`); };
  const removeCopies = (g) => { commit((s) => g.slice(1).reduce((acc, id) => removeTrack(acc, id), s)); setMsg(`Removed ${g.length - 1} cop${g.length === 2 ? "y" : "ies"} of ${nameOf(g[0])}. Undo puts them back.`); };

  // Clipping, said while it happens: the loudest peak since Play, checked four times a second. Over 0 dBFS the
  // output distorts, and across a whole song that is static, not music.
  const [clipDb, setClipDb] = useState(null);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => { const p = daw.peak(); if (p > 0.05) setClipDb(Math.round(p * 10) / 10); }, 250);
    return () => clearInterval(t);
  }, [playing, daw]);
  const fixClip = () => {
    const down = Math.ceil((clipDb || 0) + 1);
    commit((s) => ({ ...s, tracks: s.tracks.map((t) => ({ ...t, gain: shiftFader(t.gain, -down) })) }));
    setClipDb(null);
    setMsg(`Every fader down ${down} dB — the balance between tracks is the same. Undo puts it back.`);
    if (playing) { stopPlay(); }
  };
  const stopPlay = () => {
    const p = daw.stop();
    setPlaying(false);
    flushWrites();
    if (p != null) setPlayhead(p);
  };
  const seek = (t) => {
    const at = Math.max(0, t);
    setPlayhead(at); headRef.current = at;
    if (playing && !recording) startPlay(at);
  };
  // A click on the timeline lands on the grid while Snap is on; a jump to a marker never does (it goes exactly there).
  const seekClick = (t) => seek(snapIf(sRef.current || session, t));
  const restartIfPlaying = () => { if (playing && !recording) startPlay(headRef.current); };

  // ---- stem transposition: a track up or down in key, its tempo kept (pitch.js) ----
  // The range is the tier's (Corey's numbers: Free ±3, Premium ±6, StatZ ±12), read from the server.
  const keyRange = rangeFor(lim && "imagez_layers" in lim ? lim.imagez_layers : 12);
  const transposeTrack = async (trackId, semis) => {
    const tr = sRef.current.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    if (Math.abs(semis) > keyRange) { setErr(`Your tier moves a stem up to ±${keyRange} semitones — Premium ±6, StatZ a full octave.`); return; }
    const regions = tr.playlists[tr.active]?.regions || [];
    if (!regions.length) { setErr("There's nothing on that track to transpose yet."); return; }
    setErr(""); setBusy(`Moving ${tr.name} ${semis > 0 ? "up" : "down"} ${Math.abs(semis)} semitone${Math.abs(semis) === 1 ? "" : "s"}…`);
    try {
      const made = new Map();   // original source -> shifted source, so a source shared by regions is shifted once
      const patches = [];
      for (const r of regions) {
        const base = r.orig || r.src;
        if (!semis) { patches.push([r.id, { src: base, orig: undefined, semis: 0 }]); continue; }
        if (!made.has(base)) {
          const buf = daw.buffer(base);
          if (!buf) throw new Error("A recording on that track isn't loaded — reopen the session and try again.");
          await new Promise((res) => setTimeout(res, 0));   // let the busy line paint before the work
          const chans = pitchShift(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)), buf.sampleRate, semis);
          const out = new AudioBuffer({ numberOfChannels: chans.length, length: chans[0].length, sampleRate: buf.sampleRate });
          chans.forEach((c, i) => out.copyToChannel(c, i));
          const id = `${base}k${semis < 0 ? "m" : "p"}${Math.abs(semis)}`;
          daw.adopt(id, out);
          made.set(base, { id, out, name: `${sRef.current.sources[base]?.name || "Audio"} (${semis > 0 ? "+" : ""}${semis})` });
        }
        patches.push([r.id, { src: made.get(base).id, orig: base, semis }]);
      }
      commit((s) => {
        let cur = s;
        for (const { id, out, name } of made.values()) cur = addSource(cur, { id, name, duration: out.duration, channels: out.numberOfChannels, rate: out.sampleRate });
        for (const [rid, patch] of patches) cur = updateRegion(cur, rid, patch);
        return setTrack(cur, trackId, { semis });
      });
      for (const { id, out } of made.values()) { try { await putSource(id, daw.toWav(out, 24)); } catch { setStoreErr("The new key is in this session but couldn't be kept on the device — bounce or save before closing the tab."); } }
      setMsg(semis ? `${tr.name} is now ${semis > 0 ? "+" : ""}${semis} semitone${Math.abs(semis) === 1 ? "" : "s"}, same tempo. Set it back to 0 for the original.` : `${tr.name} is back in its original key.`);
    } catch (e) { setErr(e.message || "Couldn't transpose that track."); } finally { setBusy(""); }
  };

  // The inputs this device offers (labels appear once the browser has allowed a mic once).
  const [devices, setDevices] = useState([]);
  const refreshDevices = useCallback(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((ds) => setDevices(ds.filter((d) => d.kind === "audioinput" && d.deviceId !== "default")
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` })))).catch(() => {});
  }, []);
  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  // A live level on every ARMED track, opened the moment it is armed: so a mic that is blocked, held by another app, or simply the wrong
  // device shows up as a flat bar and a sentence on the track, BEFORE a take is wasted on it. One stream per device, shared by the
  // tracks reading it; nothing is recorded or heard (monitoring is the 🎧). Opened here rather than at Record so the permission prompt
  // and any failure arrive when somebody arms, which is when they are looking at the track.
  // The mix's own output level while it plays — so "it moves but I hear nothing" has an answer on screen: a moving bar means the app is
  // producing sound and the silence is the output device (or the volume); a flat bar means the app is not, and says so.
  const [outDb, setOutDb] = useState(null);
  const [silentFor, setSilentFor] = useState(0);
  useEffect(() => {
    if (!playing) { setOutDb(null); setSilentFor(0); return undefined; }
    let quiet = 0;
    const id = setInterval(() => {
      const db = daw.meters().master;
      const v = Number.isFinite(db) ? db : -90;
      setOutDb(v); quiet = v < -60 ? quiet + 0.1 : 0; setSilentFor(quiet);
    }, 100);
    return () => clearInterval(id);
  }, [playing, daw]);
  const [levels, setLevels] = useState({});
  const armedKey = session.tracks.filter((t) => t.armed).map((t) => `${t.id}|${t.input?.device || ""}`).join(",");
  useEffect(() => {
    const list = armedKey ? armedKey.split(",").map((x) => x.split("|")) : [];
    if (!list.length) { setLevels({}); return undefined; }
    let dead = false, raf = 0, wakeOff = () => {};
    const open = new Map();
    const held = {};
    (async () => {
      for (const [, dev] of list) {
        if (open.has(dev)) continue;
        try {
          const stream = await daw.openMic(dev);
          if (dead) { stream.getTracks().forEach((x) => x.stop()); return; }
          open.set(dev, { stream, meter: daw.inputMeter(stream) });
        } catch (e) { open.set(dev, { err: mediaError(e, false).msg || e.message }); }
      }
      if (dead) return;
      refreshDevices();
      // The first tap or key anywhere wakes a suspended engine: until then a meter reads silence however loud the room is.
      const wake = () => { const c = daw.context(); if (c.state !== "running") c.resume().catch(() => {}); };
      wake();
      window.addEventListener("pointerdown", wake); window.addEventListener("keydown", wake);
      wakeOff = () => { window.removeEventListener("pointerdown", wake); window.removeEventListener("keydown", wake); };
      let last = performance.now(), painted = 0;
      const tick = (now) => {
        const next = {};
        for (const [id, dev] of list) {
          const o = open.get(dev);
          if (!o) continue;
          if (o.err) { next[id] = { err: o.err }; continue; }
          const l = levelFromSamples(o.meter.read());
          held[id] = holdPeak(held[id], l.peakDb, (now - last) / 1000);
          next[id] = { peakDb: l.peakDb, held: held[id], clipped: l.clipped };
        }
        last = now;
        if (now - painted > 66) { painted = now; setLevels(next); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => { dead = true; wakeOff(); cancelAnimationFrame(raf); for (const o of open.values()) { o.meter?.stop(); o.stream?.getTracks().forEach((x) => x.stop()); } };
  }, [armedKey, daw]); // eslint-disable-line react-hooks/exhaustive-deps
  const useInputForArmed = (dev) => commit((s) => s.tracks.filter((t) => t.armed).reduce((cur, t) => setTrack(cur, t.id, { input: { ...(t.input || {}), device: dev } }), s));

  // Monitor: hear the armed track's input through the output. One track at a time, off by default, and only while the track is
  // armed. It is the DIRECT input (before the track's effects), so it adds no processing delay of ours; the browser's own audio
  // delay is said beside the button. A mic beside speakers feeds back, so turning it on asks about headphones first.
  const [monitorTrack, setMonitorTrack] = useState(null);
  const [monitorLat, setMonitorLat] = useState(null);
  const monStream = useRef(null);
  const stopMonitor = useCallback(() => {
    daw.monitorOff(); monStream.current?.getTracks().forEach((x) => x.stop()); monStream.current = null; setMonitorTrack(null);
  }, [daw]);
  const toggleMonitor = async (trackId) => {
    if (monitorTrack === trackId) { stopMonitor(); return; }
    const tr = sRef.current.tracks.find((x) => x.id === trackId);
    if (!tr) return;
    if (!window.confirm("Hear this track's input through your output while you record? Use headphones: a mic beside speakers will squeal. You may also hear a small delay.")) return;
    setErr("");
    try {
      stopMonitor();
      monStream.current = await daw.openMic(tr.input?.device || "");
      await daw.monitorOn(monStream.current);
      setMonitorTrack(trackId); setMonitorLat(latencyMs(daw.context()));
    } catch (e) { stopMonitor(); setErr(mediaError(e, false).msg || e.message); }
  };
  // Disarming the track (or leaving) ends the monitor: nothing keeps listening to a mic the member is not recording from.
  useEffect(() => { if (monitorTrack && !session.tracks.some((t) => t.id === monitorTrack && t.armed)) stopMonitor(); }, [session, monitorTrack, stopMonitor]);
  useEffect(() => stopMonitor, [stopMonitor]);

  const record = async () => {
    setErr(""); setMsg("");
    if (recording) {
      punchRef.current = null; cycleInfo.current = null; setCyclePass(0);
      setBusy("Finishing the take…");
      try {
        const takes = await daw.stopRecording();
        setUnsaved(true); setRecording(false); setPlaying(false);
        const good = takes.filter((t) => !t.empty && !t.silent);
        const byId = Object.fromEntries(sRef.current.tracks.map((t) => [t.id, t]));
        const silent = takes.filter((t) => t.silent).map((t) => byId[t.key]?.name).filter(Boolean);
        if (!good.length) { setErr(takes.some((t) => t.silent) ? "That take is silent — check the microphone isn't muted, then record again. It was not added." : "Nothing was captured — the microphone sent no sound."); return; }
        let kept = 0, longest = 0;
        commit((s) => {
          let cur = s;
          for (const take of good) {
            const tr = byId[take.key];
            if (!tr) continue;
            const cyc = take.pass != null;                          // a pass of a cycle: always its own take lane, whatever the track's mode
            const name = cyc ? `${tr.name} take ${take.pass}` : `${tr.name} take`;
            cur = addSource(cur, { id: take.id, name, duration: take.duration, channels: take.channels, rate: take.rate });
            if (cyc) cur = setTrack(cur, tr.id, { recMode: "takes" });
            const out = recordInto(cur, tr.id, { src: take.id, at: take.from, name });
            if (out.keptPrevious) kept++;
            cur = out.session;
            if (cyc) cur = setTrack(cur, tr.id, { recMode: tr.recMode });
            longest = Math.max(longest, take.from + take.duration);
          }
          return cur;
        });
        setPlayhead(longest || playhead);
        const names = good.map((t) => byId[t.key]?.name).filter(Boolean);
        const lined = good[0].offsetMs > 0 ? ` Lined up ${good[0].offsetMs} ms earlier for this device's own audio delay.` : "";
        const passes = good[0].pass != null ? good.filter((t) => t.key === good[0].key).length : 0;
        if (passes) { setMsg(`Cycle recorded ${passes} pass${passes === 1 ? "" : "es"} onto ${[...new Set(names)].join(", ")}, each as its own take. The last one is playing; pick another from the track's take menu to hear it.${silent.length ? " A silent pass was not added." : ""}`); }
        else setMsg(`Recorded ${minSec(good[0].duration)} onto ${names.join(", ")}.${kept ? " What was under it is kept as the previous take in the playlist menu." : ""}${silent.length ? ` ${silent.join(", ")} came in silent and ${silent.length === 1 ? "was" : "were"} not added.` : ""}${lined}`);
        for (const take of good) {
          try { await putSource(take.id, daw.toWav(daw.buffer(take.id), 24)); } catch { setStoreErr("The take is in this session but couldn't be kept on the device — bounce or save before closing the tab."); }
        }
      } catch (e) { setErr(e.message); } finally { setBusy(""); setTimeout(() => setUnsaved(false), 1500); }
      return;
    }
    const armed = armedTracks(sRef.current);
    if (!armed.length) { setErr("Arm a track first — press R on the track (or tracks) you want to record onto."); return; }
    const clash = inputClash(armed);
    if (clash) { setErr(`${clash[0].name} and ${clash[1].name} are set to the same input, so they'd record the same sound twice — give each its own input (a different device, or Left and Right of a stereo one).`); return; }
    // Say what it is doing while it waits. A microphone that is slow to open (another app holding it — Windows Voice Access, Zoom,
    // Teams, OBS, a second tab) used to look like a button that only glowed; now every stage is on screen, a slow one says why, and
    // a mic that never answers ends in a sentence instead of silence.
    const SLOW = "Still waiting for the microphone… Another app may be holding it (Windows Voice Access, Zoom, Teams, OBS, another tab). Close it, or pick another input in Audio settings.";
    const slow = setTimeout(() => setBusy(SLOW), 4000);
    const giveUp = (p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("The microphone didn't answer in 15 seconds. Another app is probably holding it (Windows Voice Access, Zoom, Teams, OBS, another tab). Close it, or choose a different input in Audio settings, then press Record again.")), 15000))]);
    try {
      setBusy("Opening the microphone…");
      // One stream per device; the tracks reading it take their own channel of it.
      const streams = new Map();
      for (const t of armed) {
        const dev = t.input?.device || "";
        if (streams.has(dev)) continue;
        let stream;
        try { stream = await giveUp(daw.openMic(dev)); } catch (e) {
          const m = mediaError(e, false);
          if (!m.retry) throw new Error(m.msg || e.message);
          stream = await giveUp(navigator.mediaDevices.getUserMedia({ audio: dev ? { deviceId: { exact: dev } } : true }));
        }
        streams.set(dev, stream);
      }
      clearTimeout(slow);
      refreshDevices();
      if (countBars > 0) { setBusy(`Count-in: ${countBars} bar${countBars === 1 ? "" : "s"}, then recording…`); await daw.countIn(sRef.current, countBars); }
      setBusy("Starting playback and recording…");
      const lp = sRef.current.loop;
      const cyc = cycleOn && lp && lp.end - lp.start >= 0.5 ? { start: lp.start, end: lp.end } : null;      // cycle: every pass of the loop is a take
      const plan = cyc ? null : punchPlan(sRef.current, punchOn);
      punchRef.current = plan;
      if (plan) setPlayhead(plan.from); else if (cyc) setPlayhead(cyc.start);
      await daw.startRecording(sRef.current, plan ? plan.from : cyc ? cyc.start : playhead, { click, cycle: cyc, punch: plan ? { in: plan.in, out: plan.out } : null,
        inputs: armed.map((t) => ({ key: t.id, stream: streams.get(t.input?.device || ""), channel: t.input?.channel || "both" })) });
      if (cyc) { cycleInfo.current = { t0: performance.now(), len: cyc.end - cyc.start }; setCyclePass(1); }
      setRecording(true); setPlaying(true);
    } catch (e) { setErr(e.message); } finally { clearTimeout(slow); setBusy(""); }
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
  const bring = async (items, { own = false, stems = false, at: atGiven, mix = null, trackId = null } = {}) => {
    setErr(""); setMsg("");
    for (const it of items) {
      setBusy(`Reading ${it.name}…`);
      try {
        const meta = await daw.decode(await it.blob.arrayBuffer(), it.name);
        try { await putSource(meta.id, it.blob); } catch { setStoreErr("This audio couldn't be kept on the device — it plays now but won't be here after the tab closes."); }
        const at = stems ? 0 : atGiven ?? playhead;   // stems line up from the top of the song; a take recorded alongside goes where it started
        commit((s) => {
          let next = addSource(s, meta);
          let track = trackId && next.tracks.some((t) => t.id === trackId) ? trackId : items.length === 1 && !own && !stems ? targetTrack(next) : null;
          if (!track) {
            const more = addTrack(next, it.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40), tierCap);
            if (more !== next) { next = more; track = next.tracks.at(-1).id; if (mix) next = setTrack(next, track, mix); if (stems) next = setTrack(next, track, { role: guessRole(it.name) }); }
            else {
              // At the tier's track count: it goes on an empty track if there is one, else the last track.
              track = next.tracks.find((t) => !regionsOf(t).length)?.id || next.tracks.at(-1).id;
              const tn = next.tracks.find((t) => t.id === track)?.name;
              setTimeout(() => setMsg(trackCapLine(`"${it.name}" went onto ${tn} instead of a new track.`)), 0);
            }
          }
          return addRegion(next, track, { src: meta.id, at, name: it.name });
        });
      } catch {
        setErr(`"${it.name}" couldn't be read as audio. WAV, MP3, M4A, OGG, FLAC and most videos work.`);
      }
    }
    setBusy("");
  };
  // ---- Studio Dragon: drag and drop, and the arranger ----
  const [dragonTones, setDragonTones] = useState(null);
  const savedToneIds = (dragonTones?.presets || []).filter((p) => p.kind === "tone").map((p) => p.id);
  const dragonEffect = (trackId, type) => {
    const spec = PLUGINS[type]; const tr = sRef.current.tracks.find((t) => t.id === trackId);
    if (!spec || !tr) return;
    if (spec.statz && !autoAllowed) { setErr(`${spec.label} is a StatZ effect. Try StatZ free from MembershipZ — it was not added.`); return; }
    const before = tr.inserts || [];
    const list = cleanInserts([...before, newInsert(type)]);
    if (list.length === before.length) { setMsg(`${tr.name} already holds the most effects a track can.`); return; }
    commit((s) => setTrack(s, trackId, { inserts: list })); restartIfPlaying();
    setErr(""); setMsg(`${spec.label} is on ${tr.name}. Undo takes it off.`);
  };
  const dragonTone = (trackId, ref) => {
    const tr = sRef.current.tracks.find((t) => t.id === trackId); if (!tr) return;
    let chain = null, name = "";
    if (ref.source === "starter") { const st = STARTERS.find((x) => x.key === ref.key); if (st) { chain = st.chain(); name = st.name; } }
    else { const p = (dragonTones?.presets || []).find((x) => x.kind === "tone" && String(x.id) === String(ref.id)); if (p) { chain = p.chain; name = p.name; } }
    const inserts = chainToInserts(chain);
    if (!inserts.length) { setErr("That tone has nothing in it, so nothing changed."); return; }
    if (chainNeedsStatz(inserts) && !autoAllowed) { setErr(`${name} uses StatZ effects. Try StatZ free from MembershipZ — nothing changed.`); return; }
    commit((s) => setTrack(s, trackId, { inserts })); restartIfPlaying();
    setErr(""); setMsg(`${name} is on ${tr.name}, in place of its effects. Undo brings them back.`);
  };
  const dragonLoop = async (loopId, trackId, at) => {
    const loop = loopById(loopId); if (!loop) return;
    setErr(""); setBusy(`Making ${loop.label}…`);
    try {
      const bars = 8;
      const buf = await renderLoop(loop, { bpm: sRef.current.bpm, sessionKey: sRef.current.key, bars, rate: daw.sampleRate() });
      const whereAt = at == null ? playhead : snapIf(sRef.current, at);
      await bring([{ name: loopFileName(loop, sRef.current.key, bars), blob: daw.toWav(buf, 24) }], { own: true, at: whereAt, trackId });
      setMsg(`${loop.label} is on ${trackId ? "that track" : "a new track"} at ${minSec(whereAt)}, ${bars} bars at ${sRef.current.bpm} BPM. Undo takes it off.`);
    } catch (e) { setErr(e.message || "Couldn't make that loop."); } finally { setBusy(""); }
  };
  const dragonDrop = (trackId, item, at) => {
    if (item.kind === "effect") dragonEffect(trackId, item.type);
    else if (item.kind === "tone") dragonTone(trackId, item);
    else if (item.kind === "loop") dragonLoop(item.id, trackId, at);
  };
  const dragonFiles = async (files, trackId, at, skipped) => {
    if (!files.length) { setErr(skipped ? "Only audio and video files can be dropped on a track." : ""); return; }
    justImported.current = Date.now();
    await bring(files.map((f) => ({ name: f.name, blob: f })), { own: true, at: at == null ? playhead : snapIf(sRef.current, at), trackId });
    if (skipped) setMsg(`${skipped} file${skipped === 1 ? " was" : "s were"} not audio or video and was left out.`);
    setTimeout(() => { justImported.current = 0; }, 1500);
  };
  const arranger = workflow.arranger ? {
    add: () => { const before = sRef.current; const name = ["Intro", "Verse", "Chorus", "Bridge", "Outro"][(before.sections || []).length % 5]; const next = appendSection(before, name, 8); if (next === before) setErr("The song map is full."); else commit(() => next); },
    fromLoop: () => { const lp = sRef.current.loop; if (!lp) return; const why = sectionProblem(sRef.current, lp.start, lp.end); if (why) { setErr(why); return; } commit((s) => addSection(s, { name: `Section ${(s.sections || []).length + 1}`, start: lp.start, end: lp.end })); },
    move: (id, to) => { commit((s) => moveSection(s, id, to)); restartIfPlaying(); setMsg("Section moved, with the music inside it. Undo puts it back."); },
    duplicate: (id) => { commit((s) => duplicateSection(s, id)); restartIfPlaying(); setMsg("Copied straight after the original; everything after it moved along. Undo removes the copy."); },
    cut: (id) => { commit((s) => deleteSectionWithMusic(s, id)); restartIfPlaying(); setMsg("Cut, and the gap closed. Undo brings it back."); },
    unlabel: (id) => commit((s) => removeSection(s, id)),
    update: (id, patch) => commit((s) => updateSection(s, id, patch)),
  } : null;

  const fromDevice = async (files) => {
    justImported.current = Date.now();
    await bring([...files].map((f) => ({ name: f.name, blob: f })));
    setTimeout(() => { justImported.current = 0; }, 1500);
  };
  // Stems: every file on its own track, all starting at 0:00 so they play in time, each with a guessed
  // role (vocal, bass, drums…) that the gain-staging panel reads.
  const fromStems = async (files) => {
    const list = [...files];
    if (!list.length) return;
    justImported.current = Date.now();
    await bring(list.map((f) => ({ name: f.name, blob: f })), { stems: true });
    // The watch ends shortly after the import lands, so an Undo of the clean-up is the member's and sticks.
    setTimeout(() => { justImported.current = 0; }, 1500);
    setMsg(`${list.length} stem${list.length === 1 ? "" : "s"} on ${list.length === 1 ? "its own track" : "their own tracks"}, all lined up from 0:00.`);
  };
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
  // A MIDI file handed over (Instrumental ConnectZ's .mid) opens in the MIDI window; anything else is audio.
  const [midiIn, setMidiIn] = useState(null);
  useEffect(() => onHandoff(workflow.app, (p) => {
    if (p?.midi) { setMidiIn({ url: p.midi, name: p.name || "Imported.mid", sounds: p.sounds }); setView("midi"); return; }
    if (p?.url) fromFileZ({ url: p.url, name: p.title || p.name || "Imported audio" });
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- region edits ----
  const sel = selected ? findRegion(session, selected) : null;
  const onCommit = (op) => {
    if (op.type === "move") commit((s) => moveRegion(s, op.id, op.at, op.track));
    if (op.type === "trim") commit((s) => trimRegion(s, op.id, op.edge, op.t));
    restartIfPlaying();
  };
  // A take as a file: the clip as trimmed, written as a 24-bit WAV from the recording already on this device.
  const takeWav = () => {
    if (!sel) return null;
    const buf = daw.buffer(sel.region.src);
    if (!buf) return null;
    const chans = sliceChannels(Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i)), buf.sampleRate, sel.region.in, sel.region.out);
    if (!chans) return null;
    const made = { numberOfChannels: chans.length, sampleRate: buf.sampleRate, getChannelData: (i) => chans[i] };
    return { blob: daw.toWav(made, 24), name: takeFileName(sel.track?.name, sel.region.name) };
  };
  const takeBytes = () => {
    const buf = sel && daw.buffer(sel.region.src);
    return buf ? wavBytes(Math.max(0, Math.round((sel.region.out - sel.region.in) * buf.sampleRate)), buf.numberOfChannels, 24) : 0;
  };
  const saveTakeFile = () => {
    setErr("");
    const t = takeWav();
    if (!t) { setErr("That take has no audio on this device to save — it may have been cleared. Re-record or re-import it."); return; }
    const url = URL.createObjectURL(t.blob);
    const a = document.createElement("a");
    a.href = url; a.download = t.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setMsg(`Saved “${t.name}” (${(t.blob.size / 1048576).toFixed(1)} MB) to your downloads.`);
  };
  const saveTakeToFileZ = async () => {
    setErr("");
    const t = takeWav();
    if (!t) { setErr("That take has no audio on this device to save — it may have been cleared."); return; }
    setBusy("Saving the take to FileZ…");
    try {
      const form = new FormData();
      form.append("file", t.blob, t.name);
      const res = await api("/api/economy/uploads/", { method: "POST", body: form });
      setStorage(res);
      setMsg(`“${t.name}” is in your FileZ.`);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const split = () => sel && commit((s) => splitRegion(s, sel.region.id, headRef.current || playhead));
  // StatZ (or the sample): deleting the last region of a take lane removes that lane too — only the lane just emptied,
  // never one that is merely new. Everyone else keeps the free "Remove empty takes" button.
  const del = () => {
    if (!sel) return;
    const { track, playlist, region } = { track: sel.track, playlist: sel.playlist, region: sel.region };
    const gone = autoAllowed && playlist.regions.length === 1 && track.playlists.length > 1;
    commit((s) => { const out = removeRegion(s, region.id); return gone ? dropIfEmptied(out, track.id, playlist.id) : out; });
    if (gone) setMsg(`Deleted the region, and the empty take lane "${playlist.name}" with it (StatZ). Undo brings both back.`);
    setSelected(null);
  };

  recordRef.current = record;

  // ---- keys ----
  // The shortcuts are a map every DAW reads (defaults unless changed); Azrael is where it is edited.
  const [keymap, setKeymapRaw] = useState(() => loadKeymap(workflow.app));
  const setKeymap = (m) => { setKeymapRaw(m); saveKeymap(workflow.app, m); };
  const [skin, setSkinRaw] = useState(() => loadSkin(workflow.app));
  const setSkin = (k) => { setSkinRaw(k); saveSkin(workflow.app, k); };
  useEffect(() => {
    const onKey = (e) => {
      // Mounted but hidden behind another app: its keys are that app's keys.
      if (!onScreen) return;
      if (e.target.closest?.("input, select, textarea")) return;
      const act = actionFor(keymap, e);
      if (!act) return;
      if (act === "play") { e.preventDefault(); if (recording) record(); else if (playing) stopPlay(); else startPlay(); }
      else if (act === "record") { e.preventDefault(); record(); }
      else if (act === "undo") { e.preventDefault(); undo(); }
      else if (act === "redo") { e.preventDefault(); redo(); }
      else if (act === "delete" && selected) { e.preventDefault(); del(); }
      else if (act === "split" && selected) split();
      else if (act === "home") seek(0);
      else if (act === "addtrack") addOneTrack();
      else if (act === "bounce") { e.preventDefault(); bounce(); }
      else if (act === "loop") { e.preventDefault(); if (session.loop) commit((s) => toggleLoop(s)); else loopSelected(); }
      else if (act === "loopsel") { e.preventDefault(); loopSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- out ----
  // Stems: every track you can hear, rendered on its own exactly as it sounds in this mix (its
  // effects, fader, pan and automation), so the stems summed at 0 dB and centre ARE the bounce.
  // Mix ConnectZ takes them as TrackZ tracks to rebalance and master. Its track count is the tier's.
  const stemTracks = useMemo(() => {
    const heard = new Set(audible(session).map((t) => t.id));
    return session.tracks.filter((t) => heard.has(t.id) && playlistOf(t).regions.length);
  }, [session]);
  const stemCap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;
  // One track alone, pre-fader (0 dB, centre, no automation; its polarity as set): what the timing and gain
  // panels measure, so their answers are about the audio itself rather than the current settings.
  // ---- name & save: the session is kept on this device as it changes; this makes that visible and lets a member name it on purpose ----
  const [savedAt, setSavedAt] = useState(0);
  const nameAndSave = async () => {
    let name = session.name;
    if (!name || name === "Untitled session") {
      const given = window.prompt("Name this session", "");
      if (given === null) return;                                  // cancelled: nothing changes
      name = given.trim().slice(0, 60) || "Untitled session";
    }
    const next = { ...sRef.current, name };
    commit((x) => ({ ...x, name }));
    try { await saveSession(sessionId, workflow.app, next); setStoreErr(""); setSavedAt(Date.now()); refreshList(); }
    catch (e) { setStoreErr(`Couldn't keep this session on the device: ${e.message}`); }
  };

  // ---- key and tempo from the instrumental: free, on this device, and it says what it heard ----
  const [keyNote, setKeyNote] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const channelsOf = (buf) => ({ channels: Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), rate: buf.sampleRate });
  const renderOnly = (cur, picked) => {
    const ids = new Set(picked.map((t) => t.id));
    return daw.bounce({ ...cur, tracks: cur.tracks.map((x) => ({ ...x, solo: ids.has(x.id), mute: ids.has(x.id) ? false : x.mute, ...(ids.has(x.id) ? { gain: 0, pan: 0, auto: {} } : {}) })) }, { tail: 0 });
  };
  const detectProjectKey = async () => {
    const cur = sRef.current;
    const withAudio = (t) => playlistOf(t).regions.length > 0;
    const all = cur.tracks.filter(withAudio);
    if (!all.length) { setKeyNote("Add or record some audio first — there is nothing to listen to yet."); return; }
    // The key listens to the instrumental (no vocals, no drums: drums have no pitch). The tempo listens to everything but the
    // vocals, drums included, because they carry the pulse. With no such track either one falls back to the whole mix and says so.
    let inst = instrumentalTracks(cur.tracks, withAudio), keyWhole = false;
    if (!inst.length) { inst = all; keyWhole = true; }
    let beat = rhythmTracks(cur.tracks, withAudio), beatWhole = false;
    if (!beat.length) { beat = all; beatWhole = true; }
    setKeyBusy(true); setKeyNote("");
    try {
      const keyBuf = await renderOnly(cur, inst);
      const found = detectKeyFromChannels(channelsOf(keyBuf));
      const sameSet = beat.length === inst.length && beat.every((t, i) => t.id === inst[i].id);
      const tempoBuf = sameSet ? keyBuf : await renderOnly(cur, beat);
      const tempo = detectTempoFromChannels(channelsOf(tempoBuf));
      const named = sessionKeyFor(found);
      if (named || tempo) commit((x) => setSession(x, { ...(named ? { key: named } : {}), ...(tempo ? { bpm: tempo.bpm } : {}) }));
      const set = [named && `key to ${named}`, tempo && `tempo to ${tempo.bpm} BPM`].filter(Boolean).join(" and ");
      setKeyNote(`${keySentence(found, inst.map((t) => t.name), keyWhole)} ${tempoSentence(tempo, beat.map((t) => t.name), beatWhole)}${set ? ` I've set the project ${set}.` : ""}`);
    } catch (e) {
      setKeyNote(`Couldn't read this audio: ${e.message || "unknown error"}`);
    } finally { setKeyBusy(false); }
  };
  const measureTrackAudio = async (t) => {
    const cur = sRef.current;
    const solo = { ...cur, tracks: cur.tracks.map((x) => ({ ...x, solo: x.id === t.id, mute: x.id === t.id ? false : x.mute, ...(x.id === t.id ? { gain: 0, pan: 0, auto: {} } : {}) })) };
    const buf = await daw.bounce(solo, { tail: 0 });
    return { channels: Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), rate: buf.sampleRate };
  };
  // Normalize: each ticked track (or all of them when none is ticked) gets the fader that puts its peak at -1 dBFS.
  const normalizeTracks = async () => {
    setErr("");
    const ids = pickedLive.length ? pickedLive : session.tracks.map((t) => t.id);
    const targets = session.tracks.filter((t) => ids.includes(t.id) && playlistOf(t).regions.length);
    if (!targets.length) { setMsg("Nothing to normalize yet: no track has audio on it."); return; }
    const moves = []; const quiet = []; const maxed = [];
    try {
      for (const [i, t] of targets.entries()) {
        setBusy(`Measuring ${i + 1} of ${targets.length}: ${t.name}…`);
        const r = normalizeGain((await measureTrackAudio(t)).channels);
        if (!r) quiet.push(t.name); else { moves.push({ id: t.id, gain: r.gain }); if (r.clamped) maxed.push(t.name); }
      }
      if (moves.length) commit((s) => moves.reduce((acc, m) => setTrack(acc, m.id, { gain: m.gain }), s));
      setMsg(`${moves.length ? `Normalized ${moves.length} track${moves.length === 1 ? "" : "s"} so each one's loudest moment sits at ${NORMALIZE_TARGET_DB} dBFS (peak, not loudness — two tracks can still sound different in level). Undo puts the faders back.` : "Nothing changed."}${maxed.length ? ` ${maxed.join(", ")} hit the top of the fader and are still quiet.` : ""}${quiet.length ? ` Silent, left alone: ${quiet.join(", ")}.` : ""} Stacked tracks can add up past 0 dB on the master, so check the meter.`);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const sendStems = async () => {
    setErr("");
    const list = stemCap == null ? stemTracks : stemTracks.slice(0, stemCap);
    const stems = [];
    try {
      for (const [i, t] of list.entries()) {
        setBusy(`Rendering stem ${i + 1} of ${list.length}: ${t.name}…`);
        const cur = sRef.current;
        const solo = { ...cur, tracks: cur.tracks.map((x) => ({ ...x, solo: x.id === t.id, mute: x.id === t.id ? false : x.mute })) };
        const buf = await daw.bounce(solo);
        stems.push({ url: URL.createObjectURL(daw.toWav(buf, 24)), title: `${t.name}.wav` });
      }
      handOff("mixconnectz", "mixz-tracks", { stems, title: session.name, of: stemTracks.length });
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

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
  const fileName = () => `${(projectTitle(session) || workflow.app).replace(/[^\w-]+/g, "_").slice(0, 40)}.wav`;
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
  const bounceMb = bounced ? bounced.blob.size / 1048576 : 0;

  const mixEl = (
    <MixWindow
          session={session} daw={daw} playing={playing}
          onTrack={(id, patch) => { if (playing) recordWrite(id, patch); commit((s) => setTrack(s, id, patch)); }}
          writeAuto={writeAuto} onWriteAuto={(on) => { if (!on) flushWrites(); setWriteAuto(on); }}
          autoAllowed={autoAllowed} bands={{ cap: bandCap(lim), next: nextBandCap(lim) }}
          onInserts={(id, list) => { commit((s) => setTrack(s, id, { inserts: cleanInserts(list) })); restartIfPlaying(); }}
          onMaster={(g) => commit((s) => setSession(s, { master: g }))}
        />
  );

  const newOne = () => {
    if (playing) stopPlay();
    past.current = []; future.current = [];
    put(setSession(newSession(), { editMode: workflow.editMode || "slip" }));
    setSessionId(uid("ses")); setSelected(null); setPlayhead(0); setBounced(null); setUpload(null); setMissing(0); setMsg("");
  };
  const toggleCloud = async () => {
    setCloudBusy(true); setCloudMsg("");
    try {
      if (cloudOn) {
        if (!window.confirm("Stop keeping this session on your account? Its sounds are removed from your account and your storage is freed. The copy on this device stays.")) return;
        await removeCloud(sessionId);
        await saveSession(sessionId, workflow.app, sRef.current, null);
        setCloudOn(false); setCloudMsg("Removed from your account.");
      } else {
        await saveSession(sessionId, workflow.app, sRef.current);     // make sure this device has the latest first
        await syncSession(sessionId);
        setCloudOn(true); setCloudMsg("On your account — open it from any device you sign in on.");
        api("/api/economy/uploads/").then(setStorage).catch(() => {});
      }
      refreshList();
    } catch (e) { setCloudMsg(`${cloudOn ? "Couldn't remove it" : "Not kept on your account"}: ${e.message}`); }
    finally { setCloudBusy(false); }
  };
  const dropSession = async () => {
    if (!window.confirm(cloudOn
      ? `Delete "${session.name}" from this device AND your account? Its recordings go with it on both. Anything you saved to FileZ stays.`
      : `Delete "${session.name}" from this device? Its recordings go with it. Anything you saved to FileZ stays.`)) return;
    if (cloudOn) { try { await removeCloud(sessionId); } catch { setStoreErr("Couldn't remove the copy on your account — it is still there. Try again."); return; } }
    try { await removeSession(sessionId); } catch { /* already gone */ }
    newOne();
    refreshList();
  };

  const len = lengthOf(session);
  const armedAll = armedTracks(session);
  const armed = armedAll[0] || null;
  const armedNames = armedAll.length > 2 ? `${armedAll.length} tracks` : armedAll.map((t) => t.name).join(" + ");

  return (
    <div className="space-y-3" style={skinFilter(skin) ? { filter: skinFilter(skin) } : undefined}>
      <header className="flex items-center gap-3">
        <IconImg icon={workflow.icon} alt={workflow.name} className="h-14 w-14 rounded-2xl shadow-neon"
                 fallback={<span className="text-4xl">{workflow.emoji}</span>} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold text-mcz-cyan">{workflow.emoji} {workflow.name}</h2>
          <p className="text-sm text-white/60">{workflow.tagline}</p>
        </div>
      </header>
      {/* The helpers a session needs beside it — each opens as a mini pane next to the DAW, which stays
          open and keeps playing or recording. Tap again to close. Free at every tier. */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs" data-tour="daw-helpers">
        {/* One tap for the whole practice kit on one page: MetZ, TunerZ, ChordZ and Sentence ConnectZ as
            mini panes beside the DAW. Tap again and they all close. Free; mini panes are not PaneZ opens. */}
        <button type="button" className="pill !border-mcz-cyan/60 text-[11px] font-semibold !text-mcz-cyan"
                onClick={() => window.dispatchEvent(new CustomEvent("mcz-kit"))}>🧰 Whole kit on one page</button>
        <span className="text-white/60">Keep open beside it:</span>
        {[["metz", "🎚️ MetZ"], ["tunerz", "🎯 TunerZ"], ["chordz", "🎼 ChordZ"], ["sentenceconnectz", "✍️ Sentence ConnectZ"]].map(([k, label]) => (
          <button key={k} type="button" className="pill text-[11px]" onClick={() => window.dispatchEvent(new CustomEvent("mcz-mini", { detail: k }))}>{label}</button>
        ))}
        <span className="text-white/60">· Split the page with:</span>
        {[["sentencez", "📝 SentenceZ"], ["sentenceconnectz", "✍️ Sentence ConnectZ"]].map(([k, label]) => (
          <button key={`split-${k}`} type="button" className="pill text-[11px]" onClick={() => window.dispatchEvent(new CustomEvent("mcz-split", { detail: k }))}>⊞ {label}</button>
        ))}
      </div>

      <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
        <span className="text-emerald-300">Free.</span> Everything runs on your device: your session is kept in this browser on this device, and nothing is
        uploaded until you press Save to FileZ or turn on Open on my other devices (which keeps this one session on your account){storage?.storage_free_mb != null ? <> (counts against your storage — {storage.storage_free_mb} MB free)</> : " (counts against your storage)"}.
        Use headphones when you record, so the playback doesn't get into the mic.
      </p>
      {note && <p className="text-[11px] text-white/60">🔌 {note}</p>}
      {storeErr && <p className="text-xs text-amber-200">{storeErr}</p>}
      {cloudMsg && <p className="text-xs text-white/70" role="status">☁️ {cloudMsg}</p>}
      {missing > 0 && <p className="text-xs text-amber-200">{missing} recording{missing === 1 ? "" : "s"} in this session couldn't be found on this device, so {missing === 1 ? "it plays" : "they play"} as silence.</p>}

      {/* Session bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input className="neon-input !w-48 !py-1.5" value={session.name} aria-label="Session name"
               onChange={(e) => commit((s) => ({ ...s, name: e.target.value.slice(0, 60) }))} />
        <button type="button" className="re-btn !w-auto px-3" onClick={nameAndSave}
                title="Kept on this device as you work. This names it and saves it right now. To keep a copy of the sound itself, bounce it and Save to FileZ.">
          💾 {session.name === "Untitled session" ? "Name & save" : "Save"}
        </button>
        <button type="button" className="re-btn !w-auto px-3" disabled={cloudBusy} onClick={toggleCloud} data-tour="daw-cloud"
                title={cloudOn ? "Stops keeping this session on your account and frees the storage its sounds used." : "Keeps this session on your account so it opens on your other devices."}>
          ☁️ {cloudBusy ? "Working…" : cloudOn ? "On my other devices ✓" : "Open on my other devices"}
          {!cloudBusy && !cloudOn && (
            <span className="ml-2 text-mcz-ember">−{mb(cloudBytes)} MB storage{storage?.storage_free_mb != null ? ` (${storage.storage_free_mb} free)` : ""}</span>
          )}
          {!cloudBusy && !cloudOn && <span className="ml-1 text-emerald-300">+ opens on any device</span>}
        </button>
        <span className="text-[11px] text-white/50" role="status">
          {savedAt ? `Saved on this device · ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Kept on this device as you work"}
        </span>
        <select className="neon-input !w-auto !py-1.5" value="" data-nomemo="true" aria-label="Open a saved session"
                onChange={(e) => e.target.value && open(e.target.value)}>
          <option value="">Open a session…</option>
          {saved.map((r) => <option key={r.id} value={r.id}>{[r.genre, r.key, r.name].filter(Boolean).join(" - ")}{r.skills?.length ? ` · ${r.skills.length} skill${r.skills.length === 1 ? "" : "s"}` : ""} · {new Date(r.updated).toLocaleDateString()}{originNote(r)}</option>)}
        </select>
        {others.length > 0 && (
          <select className="neon-input !w-auto !py-1.5" value="" data-nomemo="true" aria-label="Copy in a session from another DAW"
                  title="Opens a copy here. The original stays in its own DAW, unchanged."
                  onChange={(e) => e.target.value && open(e.target.value, true)}>
            <option value="">Copy in from another DAW…</option>
            {others.map((r) => <option key={r.id} value={r.id}>{DAW_NAMES[r.app] || r.app} · {r.name} · {new Date(r.updated).toLocaleDateString()}{originNote(r)}</option>)}
          </select>
        )}
        <details className="basis-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs" data-tour="daw-project-details">
          <summary className="cursor-pointer text-white/80">Project details: <b>{projectTitle(session) || "not set"}</b>{session.skills?.length ? ` · ${session.skills.length} skill${session.skills.length === 1 ? "" : "s"} used` : ""}</summary>
          <div className="mt-2 space-y-2">
            <p className="text-white/60">Saved with the project and used to name it: <b>Genre - Key - Name</b>. Skills used are your own learned skills, the same list a post uses.</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-white/60">Genre
                <select className="neon-input !w-auto !py-1" data-nomemo="true" aria-label="Project genre" value={GENRES.includes(session.genre) ? session.genre : ""}
                        onChange={(e) => commit((s) => setSession(s, { genre: e.target.value }))}>
                  <option value="">{session.genre && !GENRES.includes(session.genre) ? `Your own: ${session.genre}` : "not set"}</option>
                  {GENRE_GROUPS.map((grp) => (
                    <optgroup key={grp.key} label={`${grp.emoji} ${grp.label}`}>
                      {grp.genres.map(([name, emoji]) => <option key={name} value={name}>{name} {emoji}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <input className="neon-input !w-40 !py-1" maxLength={60} placeholder="…or type your own" aria-label="Project genre, your own"
                     value={session.genre || ""} onChange={(e) => commit((s) => setSession(s, { genre: e.target.value }))} />
            </div>
            <SkillsUsed value={session.skills || []} onChange={(skills) => commit((s) => setSession(s, { skills }))} label="Skills used on this project" />
          </div>
        </details>
        <button type="button" className="re-btn !w-auto px-3" onClick={newOne}><Plus size={13} /> New</button>
        <button type="button" className="re-btn !w-auto px-3" onClick={dropSession}><Trash2 size={13} /> Delete</button>
        <button type="button" className="re-btn !w-auto px-3" onClick={() => fileIn.current?.click()}><Upload size={13} /> Import audio</button>
        <input ref={fileIn} type="file" accept="audio/*,video/*" multiple className="hidden" onChange={(e) => { fromDevice(e.target.files || []); e.target.value = ""; }} />
        <button type="button" className="re-btn !w-auto px-3" onClick={() => stemIn.current?.click()} data-tour="daw-import-stems"><Upload size={13} /> Import stems</button>
        <input ref={stemIn} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => { fromStems(e.target.files || []); e.target.value = ""; }} />
        <button type="button" className="re-btn !w-auto px-3" onClick={() => setLib(true)}><FolderOpen size={13} /> From FileZ</button>
      </div>

      {cleaned && (
        <p role="status" className="rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs text-white/80">
          <span className="font-semibold text-emerald-300">StatZ removed {cleaned.n} cop{cleaned.n === 1 ? "y" : "ies"} of the same audio</span>
          {" "}so each recording plays once ({cleaned.names.join(", ")}). Undo puts them back.{" "}
          <button type="button" className="underline" onClick={() => setCleaned(null)}>OK</button>
        </p>
      )}
      {copies.map((g) => (
        <div key={g.join()} role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-mcz-gold/50 bg-mcz-gold/10 px-3 py-2 text-xs">
          <span className="font-semibold text-mcz-gold">⚠ {g.length} tracks play the same audio</span>
          <span className="text-white/75">— {g.slice(0, 4).map(nameOf).join(", ")}{g.length > 4 ? ` and ${g.length - 4} more` : ""}. Copies of one recording stacked together sound like static.</span>
          <button type="button" className="re-btn !w-auto px-3 !py-1" onClick={() => muteCopies(g)}>Mute the copies (keep {nameOf(g[0])})</button>
          <button type="button" className="re-btn !w-auto px-3 !py-1 !text-mcz-ember" onClick={() => removeCopies(g)}>Remove the copies</button>
          <span className="text-emerald-300">Free · Undo puts it back</span>
        </div>
      ))}
      {clipDb != null && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-mcz-ember/50 bg-mcz-ember/10 px-3 py-2 text-xs">
          <span className="font-semibold text-mcz-ember">⚠ The mix is clipping</span>
          <span className="text-white/75">— peaks reach +{clipDb} dB over full scale. Clipping across a song sounds like static or distortion, not your tracks.</span>
          <button type="button" className="re-btn !w-auto px-3 !py-1" onClick={fixClip}>Turn every fader down {Math.ceil(clipDb + 1)} dB</button>
          <span className="text-emerald-300">Free · Undo puts it back</span>
        </div>
      )}
      {/* Transport */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-2 text-xs">
        <button type="button" className="re-btn !w-auto px-2" aria-label="Back to the start" onClick={() => seek(0)} disabled={recording}><SkipBack size={14} /></button>
        {playing && !recording
          ? <button type="button" className="neon-btn-primary !w-auto px-3" onClick={stopPlay}><Square size={14} /> Stop</button>
          : <button type="button" className="neon-btn-primary !w-auto px-3" onClick={() => startPlay()} disabled={recording}><Play size={14} /> Play</button>}
        <button type="button" onClick={record} disabled={!!busy && !recording}
                className={`!w-auto min-h-[2.75rem] rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 ${recording ? "animate-pulse bg-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.5)]" : "border-2 border-red-500/70 bg-red-500/10 text-mcz-ember"}`}
                title={armed ? `Records onto ${armedAll.map((t) => t.name).join(", ")} at once` : "Arm a track first (R) — arm several to record them together"}>
          <Circle size={16} className="mr-1.5 inline" fill="currentColor" />{recording ? "Stop recording" : armed ? `Record → ${armedNames}` : "Record"}
        </button>
        <label className="flex items-center gap-1 text-white/70" title="Clicks this many bars before recording starts, so you can come in on the beat. Nothing is recorded during the count-in.">
          Count-in
          <select className="neon-input !w-auto !py-0.5" data-nomemo="true" value={countBars} disabled={recording} onChange={(e) => setCountBars(Number(e.target.value))} aria-label="Count-in bars">
            {COUNT_INS.map((n) => <option key={n} value={n}>{n === 0 ? "Off" : `${n} bar${n === 1 ? "" : "s"}`}</option>)}
          </select>
        </label>
        <label className={`flex items-center gap-1 ${session.loop ? "text-white/70" : "text-white/35"}`}
               title={session.loop ? "Records only inside the loop region: you hear a bar before it, the take is kept from its start to its end, and recording stops itself at the end. Whatever was there outside it is untouched." : "Draw a loop region first (drag in the loop lane above the ruler): that is the stretch a punch replaces."}>
          <input type="checkbox" checked={punchOn && !!session.loop && !cycleOn} disabled={!session.loop || recording || cycleOn} onChange={(e) => setPunch(e.target.checked)} /> Punch in/out
        </label>
        <label className={`flex items-center gap-1 ${session.loop ? "text-white/70" : "text-white/35"}`}
               title={session.loop ? "Loop recording: the loop plays over and over while you record, and every pass is kept as its own take on the track. Pick the best from the track's take menu. Needs a loop region at least half a second long." : "Draw a loop region first (drag in the loop lane above the ruler): each trip around it becomes a take."}>
          <input type="checkbox" checked={cycleOn && !!session.loop} disabled={!session.loop || recording} onChange={(e) => setCycle(e.target.checked)} /> Cycle record
        </label>
        {recording && cyclePass > 0 && <span className="rounded-full border border-red-400/60 bg-red-500/15 px-2 py-0.5 font-mono text-xs text-red-300" role="status">● pass {cyclePass}</span>}
        <label className="flex items-center gap-1 text-white/70"><input type="checkbox" checked={click} onChange={(e) => setClick(e.target.checked)} disabled={playing} /> Click</label>
        <span className="rounded-lg border border-white/15 bg-black/50 px-2 py-1 text-sm font-semibold text-white" title="This project">
          🎼 {session.name} <span className="font-mono text-mcz-cyan">· {session.bpm} BPM</span> <span className="text-emerald-300">· {session.key || "key not set"}</span>
        </span>
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-sm tabular-nums text-emerald-300">{barsBeats(session, playhead)}</span>
        <span className="font-mono tabular-nums text-white/60">{minSec(playhead)} / {minSec(len)}</span>
        <OutputPick daw={daw} />
        {playing && outDb != null && (
          <span className="flex items-center gap-1 text-[11px]" role="status" title="The level of the mix the app is sending to your output">
            <span className="text-white/60">🔊</span>
            <span className="relative h-2 w-24 overflow-hidden rounded bg-white/15">
              <span className={`absolute inset-y-0 left-0 ${outDb < -60 ? "bg-white/20" : outDb > -1 ? "bg-red-500" : "bg-emerald-400"}`} style={{ width: `${meterPos(outDb) * 100}%` }} />
            </span>
            <span className={silentFor > 1.5 ? "text-mcz-ember" : "text-white/60"}>
              {silentFor > 1.5 ? "Mix is silent — check track mute, faders and effects" : `${outDb < -60 ? "—" : `${Math.round(outDb)} dB`} · if you hear nothing, check the 🎧 output menu`}
            </span>
          </span>
        )}
        <AudioSettings daw={daw} onUseInput={useInputForArmed} />
        <label className="flex items-center gap-1 text-white/60">Key
          <select className="neon-input !w-auto !py-1" data-nomemo="true" value={session.key || ""} disabled={recording} aria-label="Project key"
                  onChange={(e) => commit((s) => setSession(s, { key: e.target.value }))}>
            <option value="">not set</option>
            {SESSION_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <button type="button" className="re-btn !w-auto px-3" onClick={detectProjectKey} disabled={keyBusy || recording}
                title="Listens to the instrumental, tells you the key and the BPM, and sets both on the project. Free, on your device.">
          {keyBusy ? "Listening…" : "🎹 Detect key & BPM"}
        </button>
        <label className="flex items-center gap-1 text-white/60">BPM
          <input type="number" className="neon-input !w-16 !py-1" min={BPM.min} max={BPM.max} value={session.bpm} disabled={recording}
                 onChange={(e) => commit((s) => setSession(s, { bpm: e.target.value }))} />
        </label>
        <label className="flex items-center gap-1 text-white/60">Beats/bar
          <input type="number" className="neon-input !w-12 !py-1" min={1} max={12} value={session.meter} disabled={recording}
                 onChange={(e) => commit((s) => setSession(s, { meter: e.target.value }))} />
        </label>
      </div>

      {keyNote && <p role="status" className="rounded-xl border border-mcz-cyan/40 bg-mcz-cyan/10 px-3 py-2 text-xs text-white/85">🎹 {keyNote}</p>}

      {/* Edit tools */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex overflow-hidden rounded-lg border border-white/15" role="tablist" aria-label="Window">
          {[...(workflow.windows || ["edit", "mix"]), "midi", "synth", "vst"].map((w) => (
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
              <button type="button" aria-pressed={session.snap !== false} title="Snap clicks on the timeline and new markers to the grid"
                      className={`rounded-lg border px-2 py-1 ${session.snap !== false ? "border-mcz-cyan bg-mcz-cyan/20 text-white" : "border-white/15 text-white/55"}`}
                      onClick={() => commit((s) => setSession(s, { snap: s.snap === false }))}>🧲 Snap {session.snap !== false ? "on" : "off"}</button>
              <select className="neon-input !w-auto !py-1" data-nomemo="true" value={session.grid} onChange={(e) => commit((s) => setSession(s, { grid: e.target.value }))}>
                {Object.keys(GRIDS).map((g) => <option key={g} value={g}>{g === "1" ? "1 bar" : `${g} note`}</option>)}
              </select>
            </label>
            <button type="button" className="re-btn !w-auto px-2" aria-label="Undo" onClick={undo} disabled={!past.current.length}><Undo2 size={13} /></button>
            <button type="button" className="re-btn !w-auto px-2" aria-label="Redo" onClick={redo} disabled={!future.current.length}><Redo2 size={13} /></button>
            <span className="text-white/55">{MODE_LABEL[session.editMode].what}</span>
          </>
        )}
      </div>

      {view === "loops" ? (
        <LoopLibrary daw={daw} bpm={session.bpm} busy={busy}
                     onSend={async (blob, name) => { await bring([{ name, blob }], { own: true }); setMsg(`${name.replace(/\.wav$/, "")} is on its own track at the playhead.`); }} />
      ) : view === "vst" ? (
        <VstRack session={session} daw={daw} busy={busy}
                 onRendered={async (trackId, wav, name, plug) => {
                   const meta = await daw.decode(wav, name);
                   let kept = false;
                   commit((s) => {
                     const withSrc = addSource(s, { id: meta.id, name, duration: meta.duration, channels: meta.channels, rate: meta.rate });
                     const out = recordInto(withSrc, trackId, { src: meta.id, at: 0, name });
                     kept = out.keptPrevious;
                     const tr = out.session.tracks.find((t) => t.id === trackId);
                     return setTrack(out.session, trackId, { vst: [...(tr?.vst || []), plug].slice(-64) });
                   });
                   try { await putSource(meta.id, daw.toWav(daw.buffer(meta.id), 24)); } catch { setStoreErr("The render is in this session but couldn't be kept on the device — bounce or save before closing the tab."); }
                   setMsg(`${name} is a new take${kept ? " — the original is the previous take in the playlist menu" : ""}.`);
                 }} />
      ) : view === "actions" ? (
        <KeyActions keymap={keymap} onKeymap={setKeymap} skin={skin} onSkin={setSkin} />
      ) : view === "synth" ? (
        <SynthEditor studio={{
          bpm: session.bpm, playhead, busy: !!busy || recording, hasAudio: lengthOf(session) > 0, name: session.name,
          position: () => daw.position(), start: (from) => startPlay(from), stop: () => stopPlay(),
          sampleRate: () => daw.sampleRate(), toWav: (buf) => daw.toWav(buf, 24),
          place: async (blob, name, at) => { await bring([{ name, blob }], { own: true, at }); },
          editNotes: (k) => { seek(k.from); setMidiIn({ take: { name: k.name, bpm: k.bpm, notes: k.notes, soundKey: registerTemp(k.patch), soundLabel: `🎛️ ${k.patch.name || "This take's patch"} (this take)` }, n: Date.now() }); setView("midi"); },
        }} />
      ) : view === "midi" ? (
        <MidiImport daw={daw} bpm={session.bpm} busy={busy} initial={midiIn}
                    onBpm={(v) => { if (!recording) commit((s) => setSession(s, { bpm: v })); }}
                    onSend={async (blob, name, mix) => { await bring([{ name, blob }], { own: true, mix }); setMsg(`${name.replace(/\.wav$/, "")} is on its own track at the playhead${mix && (mix.gain !== 0 || mix.pan !== 0) ? `, with its gain and pan set on the track's fader and pan` : ""}.`); }} />
      ) : view === "rack" ? (
        <ChannelRack app={workflow.app} daw={daw} bpm={session.bpm} busy={busy}
                     onSend={async (blob, name) => { await bring([{ name, blob }], { own: true }); setMsg(`${name.replace(/\.wav$/, "")} is on the Playlist at the playhead, on its own track.`); }} />
      ) : view === "song" ? (
        <Songwriter app={workflow.app} daw={daw} bpm={session.bpm} busy={busy}
                    onBpm={(v) => { if (!recording) commit((s) => setSession(s, { bpm: v })); }}
                    onSend={async (blob, name) => { await bring([{ name, blob }], { own: true }); setMsg(`${name.replace(/\.wav$/, "")} is on its own track at the playhead — open Tracks to see it.`); }} />
      ) : view === "drummer" ? (
        <SmartDrummer app={workflow.app} daw={daw} bpm={session.bpm} busy={busy}
                      onSend={async (blob, name) => { await bring([{ name, blob }], { own: true }); setMsg(`${name.replace(/\.wav$/, "")} is on its own track at the playhead — open Tracks to see it.`); }} />
      ) : view === "edit" ? (<>
        <div className="flex flex-wrap items-center gap-2 text-xs" data-tour="daw-select-tracks">
          <SelectAllBar all={session.tracks.map((t) => t.id)} picked={pickedLive} onChange={setPicked} disabled={recording} allLabel="Select all tracks" />
          <button type="button" className="pill" disabled={!!busy || recording} onClick={normalizeTracks}
                  title={`Raise or lower each track's fader so its loudest moment sits at ${NORMALIZE_TARGET_DB} dBFS. Free, on this device; Undo puts it back.`}>
            📏 Normalize {pickedLive.length ? `${pickedLive.length} selected` : "all"}
          </button>
          <span className="flex items-center gap-1" data-tour="daw-zoom" title="Zoom the timeline. Ctrl + scroll over it zooms at the pointer.">
              <button type="button" className="re-btn !w-auto px-2" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z / 1.5))}><Minus size={13} /></button>
              <input type="range" className="w-24 accent-cyan-400" min={0} max={1000} aria-label="Timeline zoom"
                     value={Math.round(1000 * Math.log(zoom / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN))}
                     onChange={(e) => setZoom(ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, Number(e.target.value) / 1000))} />
              <button type="button" className="re-btn !w-auto px-2" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z * 1.5))}><Plus size={13} /></button>
              <button type="button" className="re-btn !w-auto px-2 text-xs" aria-label="Fit the whole session on screen" title="Fit the whole session on screen"
                      onClick={() => fitZoom(true)}>Fit</button>
              <label className="flex items-center gap-0.5 text-[11px] text-white/60" title="Zoom as a percentage. 100% is the DAW's classic view; type a number to set it.">
                <input type="number" className="neon-input !w-[4.5rem] !py-0.5 text-right text-xs" aria-label="Zoom percentage" min={PCT_MIN} max={PCT_MAX} step="any"
                       key={Math.round(zoom * 1000)} defaultValue={Number(zoomPct(zoom).toPrecision(3))}
                       onBlur={(e) => { const z = zoomFromPct(e.target.value); if (z != null) setZoom(z); else e.target.value = Number(zoomPct(zoom).toPrecision(3)); }}
                       onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />%
              </label>
            </span>
          <span className="flex items-center gap-1" data-tour="daw-trackheight" role="radiogroup" aria-label="Track height">
            <span className="text-white/55">Track height</span>
            {TRACK_SIZES.map((x) => (
              <button key={x.key} type="button" role="radio" aria-checked={trackSizeKey === x.key} onClick={() => setTrackSize(x.key)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${trackSizeKey === x.key ? "border-mcz-cyan/60 bg-mcz-cyan/15 text-mcz-cyan" : "border-white/15 text-white/55"} hover:text-white`}
                      title={x.full ? `${x.label}: every control on the track` : "Compact: name, record, solo and mute only, so more tracks fit"}>{x.label}</button>
            ))}
          </span>
          {emptyTakeCount(session) > 0 && (
            <button type="button" className="pill" disabled={recording} onClick={() => { const n = emptyTakeCount(session); commit((s) => removeEmptyTakes(s)); setMsg(`Removed ${n} empty take lane${n === 1 ? "" : "s"}. Takes with audio are untouched. Undo puts them back.`); }}
                    title="Delete take lanes that have nothing in them (overdubbing and New take leave these behind)">🧹 Remove {emptyTakeCount(session)} empty take{emptyTakeCount(session) === 1 ? "" : "s"}</button>
          )}
          {pickedLive.length > 0 && (<>
            <span className="text-white/60">{pickedLive.length} selected:</span>
            <button type="button" className="pill" onClick={() => toPicked({ mute: true }, "Muted")}>Mute</button>
            <button type="button" className="pill" onClick={() => toPicked({ mute: false }, "Unmuted")}>Unmute</button>
            <button type="button" className="pill" onClick={() => toPicked({ solo: true }, "Soloed")}>Solo</button>
            <button type="button" className="pill" onClick={() => toPicked({ solo: false }, "Unsoloed")}>Unsolo</button>
            <button type="button" className="pill !text-mcz-ember" disabled={recording} onClick={removePicked}>Remove</button>
          </>)}
        </div>
        <AutotunePanel tracks={session.tracks.filter((t) => playlistOf(t).regions.length)} measure={measureTrackAudio} toWav={daw.toWav} busy={!!busy || recording}
          onRendered={async (trackId, wav, name, cents) => {
            const meta = await daw.decode(await wav.arrayBuffer(), name);
            let kept = false;
            commit((s) => { const out = recordInto(addSource(s, { id: meta.id, name, duration: meta.duration, channels: meta.channels, rate: meta.rate }), trackId, { src: meta.id, at: 0, name }); kept = out.keptPrevious; return out.session; });
            try { await putSource(meta.id, wav); } catch { setStoreErr("The tuned take is in this session but couldn't be kept on the device — bounce or save before closing the tab."); }
            setMsg(`${name} is a new take — moved about ${cents} cents on average${kept ? "; the original is the previous take in the playlist menu" : ""}.`);
          }} />
        <div className={workflow.browser ? "grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]" : ""}>
          {workflow.browser && <DragonBrowser tracks={session.tracks} statzOk={autoAllowed} onTones={setDragonTones}
                                              onEffect={dragonEffect} onTone={dragonTone} onLoop={(id) => dragonLoop(id, null, null)} />}
          <div className="min-w-0 space-y-3">
        <EditWindow
          arranger={arranger} onDropItem={workflow.browser ? dragonDrop : null} onDropFiles={workflow.browser ? dragonFiles : null} savedToneIds={savedToneIds}
          picked={pickedLive} onPick={setPicked} onMeasure={measureTrackAudio}
          session={session} daw={daw} zoom={zoom} onZoom={(f) => setZoom((z) => clampZoom(z * f))} trackSizeKey={trackSizeKey} punchArmed={punchOn && !!session.loop} selected={selected} onSelect={setSelected} onSeek={seekClick} onJump={seek} playhead={playhead}
          onCommit={onCommit} recording={recording}
          onTrack={(id, patch) => commit((s) => setTrack(s, id, patch))}
          onArm={(id) => commit((s) => armTrack(s, id))}
          devices={devices} onInput={(id, input) => commit((s) => setTrack(s, id, { input }))}
          keyRange={keyRange} onTranspose={transposeTrack}
          onAuto={(id, param, lane) => commit((s) => setAuto(s, id, param, lane))} autoAllowed={autoAllowed}
          onAddTrack={addOneTrack}
          onComp={(id, lane, a, b) => { const before = sRef.current; commit((s) => swipeComp(s, id, lane, snapIf(s, a), snapIf(s, b))); restartIfPlaying(); const t = before.tracks.find((x) => x.id === id); if (t && t.playlists.length >= MAX_PLAYLISTS && !t.playlists.some((p) => p.comp)) setErr("This track already holds the most takes it can, so there is no room for a comp lane. Delete a take first."); else setMsg("That stretch is in the comp. Swipe more, or press Undo."); }}
          onStartComp={(id, lane) => { commit((s) => startComp(s, id, lane)); restartIfPlaying(); setMsg("The comp is now a copy of that take. Swipe the better bits in from the others."); }}
          onClearComp={(id) => { commit((s) => clearComp(s, id)); restartIfPlaying(); setMsg("Comp cleared. Your takes are untouched."); }}
          onLoop={(a, b) => commit((s) => (a == null ? setLoop(s, null) : setLoop(s, snapIf(s, a), snapIf(s, b))))} onToggleLoop={() => commit((s) => toggleLoop(s))}
          onAddMarker={(t) => commit((s) => addMarker(s, snapIf(s, t ?? headRef.current ?? playhead)))}
          onMarker={(id, patch) => commit((s) => updateMarker(s, id, patch))}
          onRemoveMarker={(id) => commit((s) => removeMarker(s, id))}
          onInserts={(id, list) => { commit((s) => setTrack(s, id, { inserts: cleanInserts(list) })); restartIfPlaying(); }}
          onOpenMix={() => setView("mix")}
          monitorTrack={monitorTrack} monitorLat={monitorLat} onMonitor={toggleMonitor} levels={levels}
          onAudioSettings={() => window.dispatchEvent(new Event("mcz-audio-settings"))}
          trackLabel={tierCap == null ? "" : `${session.tracks.length} of ${tierCap}`}
          atTrackCap={tierCap != null && session.tracks.length >= tierCap} onUpgrade={() => goToSpot("membershipz", "membershipz-plans")}
          onRemoveTrack={(id) => { if (window.confirm("Remove this track and every take on it?")) { commit((s) => removeTrack(s, id)); restartIfPlaying(); } }}
          onPlaylist={(id, op) => {
            if (op.type === "switch") commit((s) => switchPlaylist(s, id, op.index));
            if (op.type === "new") commit((s) => newPlaylist(s, id));
            if (op.type === "copy") commit((s) => newPlaylist(s, id, { copy: true }));
            restartIfPlaying();
          }}
        />
            {workflow.oneWindow && mixEl}
          </div>
        </div></>
      ) : (
        mixEl
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
          <button type="button" className="re-btn !w-auto px-2" onClick={saveTakeFile} title="Download this clip as a 24-bit WAV — the clip as recorded and trimmed, without the track's fader, effects or this region's gain and fades"><Download size={13} /> Save as file · {(takeBytes() / 1048576).toFixed(1)} MB</button>
          <button type="button" className="re-btn !w-auto px-2" onClick={saveTakeToFileZ} disabled={!!busy} title="Keep this clip in FileZ">Save to FileZ · {(takeBytes() / 1048576).toFixed(1)} MB of your storage</button>
          <button type="button" className="re-btn !w-auto px-2" onClick={split} title="Split at the playhead (B)"><Scissors size={13} /> Split</button>
          <button type="button" className="re-btn !w-auto px-2" onClick={() => commit((s) => duplicateRegion(s, sel.region.id))}><Copy size={13} /> Duplicate</button>
          <button type="button" className="re-btn !w-auto px-2" aria-label="Nudge earlier" onClick={() => commit((s) => nudgeRegion(s, sel.region.id, -1))}><ChevronLeft size={13} /></button>
          <button type="button" className="re-btn !w-auto px-2" aria-label="Nudge later" onClick={() => commit((s) => nudgeRegion(s, sel.region.id, 1))}><ChevronRight size={13} /></button>
          <button type="button" className="re-btn !w-auto px-2 text-mcz-ember" onClick={del}><Trash2 size={13} /> Delete</button>
          <span className="text-white/55">Nudge moves by one grid step. Drag the edges to trim. “Save as file” is free and writes the clip as recorded and trimmed (not the mix); Bounce writes the whole mix.</span>
        </div>
      )}

      {view === "edit" && session.tracks.some((t) => t.playlists.length > 1) && (
        <p className="text-[11px] text-white/60">
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
          {msg && <p className="text-emerald-300">{msg}{isLimitMessage(msg) && <button type="button" className="re-btn ml-2 !w-auto px-2 py-0.5" onClick={() => goToSpot("membershipz", "membershipz-plans")}>🔒 See plans</button>}</p>}
          {err && <p className="text-mcz-ember">{err}{isLimitMessage(err) && <button type="button" className="re-btn ml-2 !w-auto px-2 py-0.5" onClick={() => goToSpot("membershipz", "membershipz-plans")}>🔒 See plans</button>}</p>}
        </div>
      )}

      {/* Bounce and what to do with it */}
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="neon-btn-primary !w-auto px-4" disabled={!len || !!busy || recording} onClick={bounce}><Wand2 size={14} /> Bounce the mix</button>
          <span className="text-white/55"><span className="text-emerald-300">Free</span> · a 24-bit WAV of everything you can hear, made on your device ({minSec(len, false)} plus a 2-second tail for reverb and delay).</span>
        </div>
        {stemTracks.length > 1 && (
          <TimingPanel tracks={stemTracks.filter((t) => !copyIds.has(t.id))} measure={measureTrackAudio} busy={!!busy || recording}
            apply={(fixes) => commit((s) => fixes.reduce((acc, f) => {
              let next = f.move ? shiftTrack(acc, f.id, f.move) : acc;
              if (f.flip) next = setTrack(next, f.id, { invert: !next.tracks.find((t) => t.id === f.id)?.invert });
              return next;
            }, s))} />
        )}
        {stemTracks.length > 1 && (
          <MixCheck tracks={stemTracks.filter((t) => !copyIds.has(t.id))} measure={measureTrackAudio} busy={!!busy || recording}
            measureMix={async () => { const buf = await daw.bounce(sRef.current, { tail: 0 }); return { channels: Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)), rate: buf.sampleRate }; }}
            apply={(ch) => commit((s) => {
              let next = s;
              if (ch.faders) next = { ...next, tracks: next.tracks.map((t) => ({ ...t, gain: shiftFader(t.gain, ch.faders) })) };
              for (const c of ch.cuts || []) {
                const eq = newInsert("eq");
                eq.bands = eq.bands.map((b, i) => (i === 1 ? { ...b, f: c.f, gain: c.gain, q: c.q } : b));
                const t = next.tracks.find((x) => x.id === c.id);
                if (t) next = setTrack(next, c.id, { inserts: [...(t.inserts || []), eq] });
              }
              // The line is drawn around the fader as it is NOW (after any headroom move), so ducking never undoes it.
              if (ch.duck) { const t = next.tracks.find((x) => x.id === ch.duck.id); if (t) next = setAuto(next, t.id, "volume", { on: true, points: duckPoints(ch.duck.env, t.gain || 0) }); }
              return next;
            })} />
        )}
        {stemTracks.length > 1 && (
          <StagePanel tracks={stemTracks.filter((t) => !copyIds.has(t.id))} measure={measureTrackAudio} apply={(moves) => commit((s) => moves.reduce((acc, m) => setTrack(acc, m.id, { gain: m.gain_db, pan: m.pan }), s))}
             busy={!!busy || recording} />
        )}
        {stemTracks.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="re-btn !w-auto px-3" disabled={!!busy || recording} onClick={sendStems} data-tour="daw-stems">
              🎚️ Send {stemCap != null && stemTracks.length > stemCap ? `${stemCap} of ${stemTracks.length}` : stemTracks.length} tracks to Mix ConnectZ as stems
            </button>
            <span className="text-white/55">
              <span className="text-emerald-300">Free</span> · each track on its own, as it sounds here, becomes a fader in Mix ConnectZ to rebalance, pan and master. Nothing is uploaded.
              {stemCap != null && stemTracks.length > stemCap && <span className="text-mcz-gold"> Your plan mixes {stemCap} tracks there, so the first {stemCap} go — Premium mixes {lim?.tiers?.premium?.imagez_layers ?? 6}, StatZ unlimited.</span>}
            </span>
          </div>
        )}
        {bounced && (
          <div className="space-y-2">
            <audio src={bounced.url} controls className="w-full" />
            <KeyBadge url={bounced.url} auto />
            <div className="flex flex-wrap items-center gap-2">
              <a className="re-btn !w-auto px-3" href={bounced.url} download={fileName()}><Download size={13} /> Download WAV ({bounceMb.toFixed(1)} MB)</a>
              {!upload && (
                <button type="button" className="neon-btn-primary !w-auto px-3" disabled={!!busy} onClick={saveToFileZ}>
                  <Save size={13} /> Save to FileZ <span className="text-white/60">· uses {bounceMb.toFixed(1)} MB of your storage</span>
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
                <Doors item={{ title: session.name, url: upload.url, kind: "audio", uploadId: upload.id }} noPost />
                <CoachMix url={upload.url} uploadId={upload.id} title={session.name} />
                <PostBounce url={upload.url} uploadId={upload.id} title={session.name} sizeMb={bounceMb} />
              </>
            )}
          </div>
        )}
      </div>

      {lib && <Library onPick={fromFileZ} onClose={() => setLib(false)} />}
    </div>
  );
}
