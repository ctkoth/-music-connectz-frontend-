// The VST tab — a member's own installed VST3 effects, in every DAW, in the Windows app.
//
// A web page cannot load a native plugin, so this only works in the Windows app, where the desktop
// shell starts mcz-vsthost (desktop/vsthost) and hands this page `window.mczVst` — and only this
// site gets it (desktop/preload.cjs). Pick a track and a plugin, set it in the plugin's own window (or
// its settings list), render the track through it: the result is a new take on that track, so the
// original is one switch away in the playlist menu. Free; plugins per track ladder by Corey's numbers
// (Free 3, Premium 6, StatZ unlimited).
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Wand2 } from "lucide-react";
import { BUILDS } from "../downloadBuilds.js";
import { loadLimits, TIER_LABEL } from "../limits.js";
import { goToSpot } from "../goto.js";
import { useTonePresets } from "./TonePresets.jsx";
import { pluginRoom } from "./tonePresets.js";

const vst = () => (typeof window !== "undefined" ? window.mczVst : null);

export default function VstRack({ session, daw, busy: working, onRendered }) {
  const bridge = vst();
  const [plugins, setPlugins] = useState(null);
  const [err, setErr] = useState("");
  const [trackId, setTrackId] = useState(session.tracks[0]?.id || "");
  const [pick, setPick] = useState("");          // `${file}\n${uid}`
  const [state, setState] = useState({});         // pick -> base64 settings
  const [params, setParams] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState("");
  const [lim, setLim] = useState(null);
  const tones = useTonePresets();
  const [presetName, setPresetName] = useState("");
  const [presetMsg, setPresetMsg] = useState("");
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;

  const scan = () => {
    if (!bridge) return;
    setErr(""); setBusy("Looking for your VST3 plugins…");
    bridge.scan().then((r) => {
      if (!r.ok) { setErr(r.error); return; }
      // Instruments need MIDI in, which comes later; effects work now.
      setPlugins(r.plugins.filter((p) => !/instrument|synth/i.test(p.sub)));
    }).catch((e) => setErr(e.message)).finally(() => setBusy(""));
  };
  useEffect(() => { scan(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const plugin = useMemo(() => plugins?.find((p) => `${p.path}\n${p.uid}` === pick) || null, [plugins, pick]);
  const track = session.tracks.find((t) => t.id === trackId) || session.tracks[0];
  const used = track?.vst?.length || 0;
  const full = cap != null && used >= cap;

  useEffect(() => {
    setParams(null); setValues({});
    if (!plugin) return;
    bridge.params(plugin.path, plugin.uid, state[pick] || "").then((r) => { if (r.ok) setParams(r.params); });
  }, [pick]); // eslint-disable-line react-hooks/exhaustive-deps

  const room = plugin ? pluginRoom(tones.state, plugin.uid) : null;
  const mine = (tones.state?.presets || []).filter((p) => p.kind === "vst" && p.chain?.uid === plugin?.uid);
  const sameName = mine.find((p) => p.name.toLowerCase() === presetName.trim().toLowerCase());
  const savePreset = async () => {
    setErr(""); setPresetMsg("");
    if (!state[pick]) { setErr("Open the plugin's window or render once so there are settings to save."); return; }
    try {
      const p = await tones.save(presetName.trim(), { uid: plugin.uid, plugin: plugin.name, vendor: plugin.vendor, state: state[pick] }, sameName?.id, "vst");
      setPresetMsg(`Saved "${p.name}" for ${plugin.name}.`); setPresetName("");
    } catch (e) { setErr(e.message); }
  };
  const usePreset = async (p) => {
    setState((s) => ({ ...s, [pick]: p.chain.state })); setValues({}); setPresetMsg(`${p.name} is loaded. Render to hear it.`);
    const r = await bridge.params(plugin.path, plugin.uid, p.chain.state);
    if (r.ok) setParams(r.params);
  };
  const openWindow = async () => {
    setErr(""); setBusy(`${plugin.name} is open in its own window — close it to keep the settings.`);
    try {
      const r = await bridge.editor(plugin.path, plugin.uid, state[pick] || "");
      if (!r.ok) { setErr(r.error); return; }
      setState((s) => ({ ...s, [pick]: r.state }));
      setValues({});
      const p = await bridge.params(plugin.path, plugin.uid, r.state);
      if (p.ok) setParams(p.params);
    } finally { setBusy(""); }
  };

  const render = async () => {
    if (full) { setErr(`${TIER_LABEL[lim?.tier] || "Your tier"} renders ${cap} plugins per track — Premium 6, StatZ unlimited.`); return; }
    const regions = track.playlists[track.active]?.regions || [];
    if (!regions.length) { setErr("That track has nothing on it to send through a plugin."); return; }
    setErr(""); setBusy(`Rendering ${track.name} through ${plugin.name}…`);
    try {
      // The track alone, as heard (its own effects and fades), from the start of the session.
      const solo = { ...session, tracks: [{ ...track, mute: false, solo: false, gain: 0, pan: 0 }] };
      const buf = await daw.bounce(solo, { tail: 0 });
      const wav = await daw.toWav(buf, 24).arrayBuffer();
      const r = await bridge.render(plugin.path, plugin.uid, wav, state[pick] || "", values);
      if (!r.ok) { setErr(r.error); return; }
      setState((s) => ({ ...s, [pick]: r.state }));
      await onRendered(track.id, r.wav, `${track.name} · ${plugin.name}`, { name: plugin.name, vendor: plugin.vendor });
    } catch (e) { setErr(e.message || "The render didn't finish."); } finally { setBusy(""); }
  };

  if (!bridge) {
    const win = BUILDS.find((b) => b.key === "win");
    return (
      <div className="neon-frame space-y-2 p-4 text-sm" data-tour="daw-vst">
        <h3 className="font-semibold">VST3 plugins</h3>
        <p className="text-white/70">Your own VST3 effects run in the <b>Windows app</b> — a web page or a phone can&apos;t load a desktop plugin. In the app, every DAW gets this tab: pick a plugin, set it in its own window, and render a track through it.</p>
        {win && <a className="re-btn !w-auto px-4" href={win.href}><Download size={14} /> {win.label}</a>}
        <p className="text-[11px] text-white/60">The built-in EQ, compressor, delay, reverb, filter and gain work everywhere, in the Mixer.</p>
      </div>
    );
  }

  return (
    <div className="neon-frame space-y-3 p-4" data-tour="daw-vst">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <h3 className="font-semibold">VST3 plugins</h3>
        <span className="text-emerald-300">free</span>
        <span className="text-white/50">{plugins ? `${plugins.length} effects found on this PC` : ""}</span>
        <button className="re-link" onClick={scan}>Scan again</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">Track
          <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={track?.id || ""} onChange={(e) => setTrackId(e.target.value)}>
            {session.tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="flex items-center gap-1">Plugin
          <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Pick a plugin…</option>
            {(plugins || []).map((p) => <option key={`${p.path}\n${p.uid}`} value={`${p.path}\n${p.uid}`}>{p.name}{p.vendor ? ` — ${p.vendor}` : ""}</option>)}
          </select></label>
      </div>
      {plugins && !plugins.length && <p className="text-xs text-white/60">No VST3 effects found. Install them to the standard folder (C:\Program Files\Common Files\VST3), then Scan again.</p>}
      {plugin && <>
        <div className="flex flex-wrap gap-2">
          <button className="re-btn !w-auto px-3" disabled={!!busy} onClick={openWindow}><ExternalLink size={14} /> Open {plugin.name}&apos;s window</button>
          <button className="neon-btn-primary !w-auto px-3" disabled={!!busy || !!working} onClick={render}><Wand2 size={14} /> Render {track?.name} through it</button>
        </div>
        <div className="space-y-1 rounded bg-black/30 p-2 text-xs" data-tour="daw-vst-presets">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{plugin.name} presets</span>
            <span className={room.ok ? "text-white/60" : "text-mcz-gold"}>{room.line}</span>
            <span className="text-emerald-300">free</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <input className="neon-input !w-auto !py-1 text-xs" placeholder="Name, e.g. Vocal glue" maxLength={60} value={presetName}
                   aria-label="Plugin preset name" onChange={(e) => setPresetName(e.target.value)} />
            <button className="re-btn !w-auto px-3" disabled={!presetName.trim() || (!sameName && !room.ok)} onClick={savePreset}>{sameName ? "Update it" : "Save these settings"}</button>
          </div>
          {!room.ok && !sameName && presetName.trim() && (
            <p className="text-mcz-gold">Your plan keeps {tones.state.limit} per plugin — update or delete one, or Premium keeps {tones.state.ladder?.premium ?? 6}, StatZ unlimited.{" "}
              <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Plans</button></p>)}
          {mine.length > 0 && <ul className="space-y-0.5">{mine.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <button className="min-w-0 flex-1 truncate text-left text-white/80 hover:text-white" onClick={() => usePreset(p)}>{p.name}</button>
              <button className="text-white/40 hover:text-mcz-ember" aria-label={`Delete preset ${p.name}`}
                      onClick={() => { if (window.confirm(`Delete your "${p.name}" preset?`)) tones.remove(p.id).catch((e) => setErr(e.message)); }}>✕</button>
            </li>))}</ul>}
          {presetMsg && <p className="text-emerald-300">{presetMsg}</p>}
          <p className="text-white/50">Saved on your account, so they follow you to every device. Nothing is charged; a failed save is not counted.</p>
        </div>
        {params?.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-white/70">Settings ({params.length})</summary>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              {params.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <span className="w-28 truncate" title={p.title}>{p.title}</span>
                  <input type="range" min="0" max="1" step={p.steps > 0 ? 1 / p.steps : 0.001} className="flex-1"
                    value={values[p.id] ?? p.value} onChange={(e) => setValues({ ...values, [p.id]: Number(e.target.value) })} />
                  <span className="w-10 text-right text-white/50">{Math.round((values[p.id] ?? p.value) * 100)}%</span>
                </label>
              ))}
            </div>
          </details>
        )}
      </>}
      <p className="text-[11px] text-white/60">
        The render is a new take on the track — the original stays in its playlist menu. {track?.name}: {used} plugin render{used === 1 ? "" : "s"}{cap != null ? ` of ${cap} on ${TIER_LABEL[lim?.tier] || "your tier"}` : ""}.
        {cap != null && <> <button className="re-link" onClick={() => goToSpot("membershipz", "")}>Premium 6, StatZ unlimited</button></>}
      </p>
      {busy && <p className="text-xs text-mcz-cyan">{busy}</p>}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
