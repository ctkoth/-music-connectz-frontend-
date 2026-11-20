// ImageZ's score: the whole picture, scored on its craft — each dimension with WHY and HOW, drawn with the house
// rating component. It never rates anybody's looks (`caveat`, the server's, says so on screen). The price is the
// server's, beside the button before it is pressed; an unreadable picture is not charged.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { PROMPTZ, ENERGY } from "../resources.js";
import { RatingRow } from "./Rating.jsx";
import { handOff } from "../handoff.js";
import LooksDoor from "./LooksDoor.jsx";

export default function ImageScore({ getImage, busy }) {
  const [info, setInfo] = useState(null);
  const [res, setRes] = useState(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/economy/imagez/rate/").then(setInfo).catch(() => setInfo(null)); }, []);
  if (!info) return null;
  const p = info.price || {};
  const [mode, setMode] = useState("");        // "" = the picture; "profile" = a profile photo, judged as a photo
  const run = async (purpose = "") => {
    setErr(""); setRes(null); setWorking(true); setMode(purpose);
    try { setRes(await api("/api/economy/imagez/rate/", { method: "POST", body: { image: getImage(), ...(purpose ? { purpose } : {}) }, timeoutMs: 120_000 })); }
    catch (e) { setErr(e.message || "Couldn't score it. Nothing was charged."); } finally { setWorking(false); }
  };
  return (
    <div className="space-y-1 rounded-lg border border-white/10 p-2" data-tour="imagez-score">
      <p className="font-semibold">Score this picture</p>
      <p className="text-white/55">Composition, light, colour, sharpness, editing and impact — each 1-10 with why and how to raise it.</p>
      <button className="re-btn" disabled={busy || working || !info.configured || p.can_run === false} onClick={() => run("")}>
        {working && mode === "" ? "Scoring…" : "Score it"}{" "}
        {p.free_today ? <span className="text-emerald-300">free today (a daily prompt)</span> : <span className="text-mcz-ember">−{p.cost_cents} {PROMPTZ}</span>}
        {p.energy ? <span className="text-mcz-ember"> −{p.energy} {ENERGY}</span> : null}
      </button>
      {info.profile && (
        <>
          <button className="re-btn" disabled={busy || working || !info.configured || p.can_run === false} onClick={() => run("profile")} data-tour="imagez-profile-photo">
            {working && mode === "profile" ? "Checking…" : "Check my profile photo"}{" "}
            {p.free_today ? <span className="text-emerald-300">free today (a daily prompt)</span> : <span className="text-mcz-ember">−{p.cost_cents} {PROMPTZ}</span>}
            {p.energy ? <span className="text-mcz-ember"> −{p.energy} {ENERGY}</span> : null}
          </button>
          <p className="text-white/55">Framing, light, background, focus and colour — advice on the photo, never on you, and no overall score. Any age.</p>
        </>
      )}
      <p className="text-white/55">Not charged if it can't be read. {info.caveat}</p>
      {!info.configured && <p className="text-white/50">The AI isn&apos;t switched on yet.</p>}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      {res && (
        <div className="space-y-1.5 pt-1">
          {res.overall != null
            ? <RatingRow value={res.overall} label="Overall" detail={res.verdict} />
            : res.verdict && <p className="text-white/80">{res.verdict}</p>}
          {Object.entries(res.scores).map(([k, d]) => (
            <RatingRow key={k} value={d.score} label={d.label} size="sm"
                       detail={<>{d.why}{d.how && <span className="block text-emerald-300">How: {d.how}</span>}</>} />
          ))}
          {res.next && <p className="text-white/70"><span className="font-semibold text-white">Next:</span> {res.next}</p>}
          {/* The full coach notes open in DesignZ: the same numbers with room to read each why and how, beside the
              designs other members have put up. Free — it was paid for when it was scored. */}
          <button type="button" className="re-btn" data-tour="imagez-notes-door"
                  onClick={() => { let img = ""; try { const g = getImage(); if (typeof g === "string" && g.length < 1_500_000) img = g; } catch { /* no preview */ } handOff("designz", "designz-notes", { notes: res, image: img }); }}>
            Read the full coach notes in DesignZ <span className="text-emerald-300">· free</span>
          </button>
          {res.caveat && res.purpose === "profile" && <p className="text-white/55">{res.caveat}</p>}
          {res.purpose !== "profile" && <LooksDoor />}
          <p className="text-white/55">{res.charged_cents ? `Charged −${res.charged_cents} ${PROMPTZ}.` : "Covered by a free prompt."}</p>
        </div>
      )}
    </div>
  );
}
