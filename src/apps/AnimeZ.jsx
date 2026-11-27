// AnimeZ — the anime studio: an episode put together from your MangaZ pages (a motion comic, each line
// a subtitled beat), your Anime ConnectZ pieces and clips, in the order you set. Free and on your
// device: the episode is kept here (this browser), nothing is uploaded, and "Make it in VideoZ" hands
// the scenes to VideoZ's one engine to cut, preview and export — so what you approve there is the
// file. Full-length EpisodeZ and MovieZ are made here, by joining pieces; a single AI render cannot be
// that long, and Anime ConnectZ says so.
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Film, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { handOff, onHandoff } from "../handoff.js";
import { MAX_SCENES, SECONDS, cleanScenes, moveScene, sceneFromVideo, scenesFromPage, toVideoItems, totalSeconds } from "../anime/scenes.js";
import { useWorkSave } from "../workSave.js";
import WorkSaveBar from "../components/WorkSaveBar.jsx";

const KEY = "mcz_animez_episode";
const mmss = (s) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor((s % 3600) / 60)).padStart(Math.floor(s / 3600) ? 2 : 1, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || "{}"); return { title: String(d.title || "My episode"), scenes: cleanScenes(d.scenes) }; } catch { return { title: "My episode", scenes: [] }; } };

export default function AnimeZ() {
  const [ep, setEp] = useState(load);
  const [pages, setPages] = useState(null);
  const [pieces, setPieces] = useState(null);
  const [msg, setMsg] = useState("");
  const [stored, setStored] = useState(true);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(ep)); setStored(true); } catch { setStored(false); }
  }, [ep]);
  // StatZ keeps the episode on the account too (src/workSave.js). A restored copy puts its scenes back on this screen.
  const blank = ep.scenes.length === 0 && ep.title === "My episode";
  const work = useWorkSave({ app: "animez", wid: "episode", data: blank ? null : ep, name: ep.title,
    apply: (d) => setEp({ title: String(d.title || "My episode"), scenes: cleanScenes(d.scenes) }) });
  useEffect(() => {
    api("/api/economy/mangaz/").then((d) => setPages(d.pages || [])).catch(() => setPages([]));
    api("/api/economy/animez/").then((d) => setPieces((d.works || []).filter((w) => w.status === "done" && w.video_url))).catch(() => setPieces([]));
  }, []);
  const add = (scenes, what) => {
    if (!scenes.length) { setMsg(`${what} has nothing drawn yet — draw it in MangaZ first.`); return; }
    setEp((e) => ({ ...e, scenes: [...e.scenes, ...scenes] }));
    setMsg(`Added ${scenes.length} scene${scenes.length === 1 ? "" : "s"} from ${what}.`);
  };
  // From Anime ConnectZ ("Open in AnimeZ") and MangaZ ("Make it anime").
  useEffect(() => onHandoff("animez", (p) => {
    if (p?.video?.url) add([sceneFromVideo(p.video)], p.video.name || "the video");
    if (p?.page) add(scenesFromPage(p.page), `"${p.page.title}"`);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (i, patch) => setEp((e) => ({ ...e, scenes: cleanScenes(e.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s))) }));
  const total = totalSeconds(ep.scenes);
  const over = ep.scenes.length > MAX_SCENES;
  const make = () => {
    handOff("videoz", "", { items: toVideoItems(ep.scenes) });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="re-card space-y-1">
        <h2 className="flex items-center gap-3 font-display text-xl font-extrabold">
          <IconImg icon="animez.png" alt="" className="h-11 w-11 rounded-xl" /> AnimeZ
        </h2>
        <p className="text-sm text-white/60">
          Put an episode together from your manga pages and anime pieces — subtitles, camera moves and order — then cut it in VideoZ.
          <span className="text-emerald-300"> Free</span>, on your device.
        </p>
        {!stored && <p className="text-[11px] text-mcz-gold">This browser isn't keeping it (private window or blocked site data) — it lasts until the tab closes.</p>}
        <WorkSaveBar work={work} what="episode" />
      </div>

      <div className="re-card space-y-2" data-tour="animez-add">
        <p className="re-label">Add scenes</p>
        <div className="space-y-1 text-sm">
          <p className="text-[11px] text-white/60">From MangaZ — every drawn panel, one subtitled beat per line:</p>
          {pages === null ? <p className="text-[11px] text-white/55">Loading…</p> : pages.length ? (
            <div className="flex flex-wrap gap-1.5">
              {pages.map((pg) => (
                <button key={pg.id} className="pill text-[12px]" onClick={() => add(scenesFromPage(pg), `"${pg.title}"`)}>📚 {pg.title}</button>
              ))}
            </div>
          ) : <button className="re-link text-[12px]" onClick={() => goToSpot("mangaz", "mangaz-new")}>Make a manga page first</button>}
          <p className="pt-1 text-[11px] text-white/60">From Anime ConnectZ — your finished pieces:</p>
          {pieces === null ? <p className="text-[11px] text-white/55">Loading…</p> : pieces.length ? (
            <div className="flex flex-wrap gap-1.5">
              {pieces.map((w) => (
                <button key={w.id} className="pill text-[12px]" onClick={() => add([sceneFromVideo({ url: w.video_url, name: w.title, seconds: w.seconds })], `"${w.title}"`)}>
                  🌸 {w.title} · {mmss(w.seconds)}
                </button>
              ))}
            </div>
          ) : <button className="re-link text-[12px]" onClick={() => goToSpot("animeconnectz", "animez-new")}>Make one in Anime ConnectZ</button>}
        </div>
        {msg && <p role="status" className="text-xs text-emerald-300">{msg}</p>}
      </div>

      <div className="re-card space-y-2" data-tour="animez-episode">
        <div className="flex flex-wrap items-center gap-2">
          <input className="neon-input !w-auto flex-1 !py-1.5 font-semibold" value={ep.title} maxLength={120} aria-label="Episode title"
                 onChange={(e) => setEp({ ...ep, title: e.target.value })} />
          <span className="text-[11px] text-white/50">{ep.scenes.length} scenes · {mmss(total)}</span>
        </div>
        {ep.scenes.length === 0 && <p className="text-sm text-white/60">No scenes yet — add a manga page or an anime piece above.</p>}
        {ep.scenes.map((s, i) => (
          <div key={s.id} className="flex gap-2 rounded-lg bg-white/5 p-2">
            {s.kind === "image"
              ? <img src={s.url} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              : <video src={s.url} className="h-16 w-16 shrink-0 rounded object-cover" muted />}
            <div className="min-w-0 flex-1 space-y-1 text-[11px]">
              <p className="truncate text-white/70">{i + 1}. {s.name} {s.kind === "video" && <span className="text-white/55">· video · {mmss(s.seconds)}</span>}</p>
              <input className="neon-input !py-1 text-xs" value={s.caption} maxLength={80} placeholder="Subtitle (optional)" aria-label={`Scene ${i + 1} subtitle`}
                     onChange={(e) => set(i, { caption: e.target.value })} />
              {s.kind === "image" && (
                <div className="flex flex-wrap items-center gap-2 text-white/60">
                  <label className="flex items-center gap-1">Seconds
                    <input type="number" className="neon-input !w-16 !py-0.5 text-xs" min={SECONDS.min} max={SECONDS.max} step={0.5} value={s.seconds}
                           onChange={(e) => set(i, { seconds: Number(e.target.value) })} aria-label={`Scene ${i + 1} seconds`} />
                  </label>
                  <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" value={s.motion} aria-label={`Scene ${i + 1} camera`}
                          onChange={(e) => set(i, { motion: e.target.value })}>
                    <option value="in">Slow zoom in</option><option value="out">Slow zoom out</option><option value="none">Still</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button aria-label="Move up" className="text-white/50 hover:text-white" onClick={() => setEp({ ...ep, scenes: moveScene(ep.scenes, i, -1) })}><ArrowUp size={13} /></button>
              <button aria-label="Move down" className="text-white/50 hover:text-white" onClick={() => setEp({ ...ep, scenes: moveScene(ep.scenes, i, 1) })}><ArrowDown size={13} /></button>
              <button aria-label="Remove" className="text-white/55 hover:text-mcz-ember" onClick={() => setEp({ ...ep, scenes: ep.scenes.filter((_, k) => k !== i) })}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {ep.scenes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button className="neon-btn-primary !w-auto px-5" onClick={make} data-tour="animez-make">
              <Film size={14} /> Make the episode in VideoZ
            </button>
            <span className="text-[11px] text-white/50"><span className="text-emerald-300">Free</span> · it opens in VideoZ to preview, trim and export, then post it to DirectZ as a ReelZ, EpisodeZ or MovieZ.</span>
            {over && <span className="text-[11px] text-mcz-gold">VideoZ takes {MAX_SCENES} scenes at a time — the first {MAX_SCENES} go; make the rest as a second part.</span>}
            <button className="re-link ml-auto text-[11px]" onClick={() => { if (window.confirm("Clear every scene from this episode?")) setEp({ title: ep.title, scenes: [] }); }}>Clear</button>
          </div>
        )}
      </div>
    </div>
  );
}
