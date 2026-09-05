// GameZ — the games you built in OCC, and the ones you can actually play.
//
// The backend for this has been finished for a while: ten endpoints, a build
// that runs in the sandbox, a bundle served in a sandboxed frame, assets that
// count against the storage quota a member already pays for. There was no
// screen, so it was 650 lines nobody could reach — the same shape as RoyaltieZ
// before it got one.
//
// Two things this screen has to get right, and both come from the server
// rather than being decided here:
//
//   * WHAT A BUILD COSTS. It is Energy per second of build time, so the price
//     is not a fixed number and cannot be printed as one — the endpoint says
//     the rate and what you hold, and this states both before the button. A
//     build that never starts costs nothing, and it says that too.
//   * WHETHER THERE IS ANYTHING TO PLAY. `playable` is computed from the
//     bundle, never from the status field, because a Play button offered on a
//     status with no file behind it is a button that lies.
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Hammer, Upload, AlertTriangle, ArrowRight, X } from "lucide-react";

import { api } from "../api.js";
import { asList } from "../shape.js";
import { ENERGY } from "../resources.js";
import { goToTab } from "../goto.js";
import { playSound } from "../sound.js";

const STATUS_TONE = {
  playable: "text-emerald-300",
  building: "text-mcz-cyan",
  failed: "text-mcz-ember",
  draft: "text-white/45",
};

export default function GameZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [playing, setPlaying] = useState(null);   // the game in the frame
  const [quote, setQuote] = useState({});          // id -> build cost
  const pollRef = useRef(null);

  const load = useCallback(() =>
    api("/api/economy/gamez/")
      .then((d) => { setData(d); setErr(""); return d; })
      .catch((e) => { setErr(e.message || "Couldn't load GameZ."); }), []);

  useEffect(() => { load(); }, [load]);

  // While anything is building, poll — a build is the one thing here that
  // finishes without the member doing something, so the screen has to notice.
  useEffect(() => {
    const building = asList(data?.games).some((g) => g.status === "building");
    clearInterval(pollRef.current);
    if (building) pollRef.current = setInterval(load, 4000);
    return () => clearInterval(pollRef.current);
  }, [data, load]);

  async function getQuote(game) {
    try {
      const q = await api(`/api/economy/gamez/${game.id}/build/`);
      setQuote((prev) => ({ ...prev, [game.id]: q }));
    } catch (e) {
      setMsg(e.message || "Couldn't read the build cost.");
    }
  }

  async function build(game) {
    setBusy(true); setMsg("");
    playSound("build_start");
    try {
      const r = await api(`/api/economy/gamez/${game.id}/build/`, { method: "POST", body: {} });
      const g = r.game || {};
      if (g.status === "playable") { playSound("build_done"); setMsg("Built — it's playable."); }
      else { playSound("build_fail"); setMsg(g.build_detail || "The build didn't produce a bundle."); }
      load();
    } catch (e) {
      playSound("build_fail");
      setMsg(e.message || "That build didn't run.");
    } finally {
      setBusy(false);
    }
  }

  async function attach(game, file) {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", `assets/${file.name}`);
      await api(`/api/economy/gamez/${game.id}/assets/`, { method: "POST", body: fd });
      playSound((file.type || "").startsWith("audio/") ? "upload_audio"
        : (file.type || "").startsWith("video/") ? "upload_video" : "upload_image");
      load();
    } catch (e) {
      playSound("error");
      setMsg(e.message || "Couldn't attach that.");
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return <p className="re-card flex items-start gap-2 text-sm text-mcz-ember">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
    </p>;
  }
  if (!data) {
    return <p className="flex items-center gap-2 text-sm text-white/50">
      <Loader2 className="animate-spin" size={15} /> Loading GameZ…
    </p>;
  }

  const games = asList(data.games);

  return (
    <div className="space-y-4">
      {playing && (
        <div className="re-card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-base font-extrabold">{playing.title}</p>
            <button className="re-btn re-btn-red !w-auto px-3 !py-2"
                    onClick={() => { playSound("game_over"); setPlaying(null); }}>
              <X size={14} /> Close
            </button>
          </div>
          {/* Sandboxed, and the sandbox is the server's (see gamez_build.py's
              CSP) — this attribute is the belt to that braces. allow-scripts
              without allow-same-origin means the game runs but cannot reach
              the member's session. */}
          <iframe
            title={playing.title}
            src={`/api/economy/gamez/${playing.id}/play/`}
            sandbox="allow-scripts allow-pointer-lock"
            className="h-[70vh] w-full rounded-lg border border-white/10 bg-black"
          />
        </div>
      )}

      <div className="re-card space-y-1">
        <p className="re-label">Storage</p>
        <p className="text-[13px] text-white/75">
          {data.storage_used_mb} / {data.storage_mb} MB used
        </p>
        <p className="text-[11px] text-white/40">
          Game assets count against the same storage your tier already gives
          you — there's no second quota to keep track of.
        </p>
      </div>

      {games.length === 0 ? (
        <div className="re-card space-y-2">
          <p className="font-display text-base font-extrabold">No games yet</p>
          <p className="text-[13px] text-white/60">
            A game is an OCC project that builds to web. Make the project in OCC,
            then it shows up here to build and play.
          </p>
          <button className="re-btn re-btn-cyan !w-auto px-4" onClick={() => goToTab("occ")}>
            Open OCC <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => {
            const q = quote[g.id];
            return (
              <li key={g.id} className="re-card space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-sm font-extrabold">{g.title}</span>
                  <span className={`text-[11px] ${STATUS_TONE[g.status] || "text-white/45"}`}>
                    {g.status}{g.plays ? ` · ${g.plays} plays` : ""}
                  </span>
                </div>
                {g.description && (
                  <p className="text-[12px] text-white/55">{g.description}</p>
                )}
                <p className="text-[11px] text-white/35">
                  {g.files} file{g.files === 1 ? "" : "s"}
                  {g.bundle_mb ? ` · ${g.bundle_mb} MB built` : ""}
                  {g.genre ? ` · ${g.genre}` : ""}
                </p>
                {g.build_detail && g.status === "failed" && (
                  <p className="break-words rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-mcz-ember">
                    {g.build_detail}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {/* Playable is computed from the bundle, so this button is
                      never offered with nothing behind it. */}
                  {g.playable && (
                    <button className="neon-btn-primary !w-auto px-4"
                            onClick={() => { playSound("game_start"); setPlaying(g); }}>
                      <Play size={15} /> Play
                    </button>
                  )}
                  {q ? (
                    <button className="re-btn re-btn-cyan !w-auto px-4"
                            disabled={busy || !q.allowed || g.status === "building"}
                            onClick={() => build(g)}>
                      <Hammer size={15} /> Build · −{q.cost?.per_second} {ENERGY}/sec
                    </button>
                  ) : (
                    <button className="re-btn !w-auto px-4" onClick={() => getQuote(g)}>
                      <Hammer size={15} /> What does a build cost?
                    </button>
                  )}
                  <label className="re-btn re-btn-emerald !w-auto cursor-pointer px-4">
                    <Upload size={15} /> Add asset
                    <input type="file" className="hidden" disabled={busy}
                           onChange={(e) => {
                             const f = e.target.files?.[0];
                             e.target.value = "";
                             attach(g, f);
                           }} />
                  </label>
                </div>

                {q && (
                  // The rate, the balance and the two caveats, before the
                  // button is pressed — the price here is per second, so a
                  // single number would have been a guess.
                  <p className="text-[11px] leading-relaxed text-white/45">
                    {q.cost?.per_second} {ENERGY} per second of build time. You have{" "}
                    <b className="text-white/70">{q.energy} {ENERGY}</b>. {q.billing_note}
                    {!q.allowed && q.reason ? ` — ${q.reason}` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {msg && <p className="re-card text-[13px] text-white/80">{msg}</p>}
    </div>
  );
}
