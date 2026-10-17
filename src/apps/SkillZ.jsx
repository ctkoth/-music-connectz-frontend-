import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot, goToTab } from "../goto.js";
import { IconImg } from "../App.jsx";
import { IN_SHELL } from "../standalone.js";
import { PROMPTZ, XP } from "../resources.js";

// SkillZ — the front door of the instrument coaches.
//
// It decides nothing and charges nothing. What each coach is, whether it is
// switched on, what a take costs, what it scores a take on, how many takes the
// member has made and where their skill tree stands all come from
// GET /api/economy/skillz/, which reads the price from the same function the
// coach's own screen reads it from — so this screen cannot quote a number the coach
// then contradicts, and no number is typed in here.
//
// It is mounted as the Home of the standalone SkillZ app (standalone/skillz/) and
// is also reachable as the `skillz` tab on the main site. In the shell there is
// nothing to buy, so no price here is an offer: it is what a take would cost out of
// the free prompts the member gets each day, or a balance they already hold.

// Used ONLY when the server cannot be reached: keys, labels and art, never a price, a
// count or a description. An invented number on the screen whose whole job is to state
// one would be the failure it exists to prevent.
const FALLBACK = [
  { key: "singz", label: "SingZ", icon: "singz.png" },
  { key: "rapz", label: "RapZ", icon: "rapz.png" },
  { key: "guitarz", label: "GuitarZ", icon: "guitarz.png" },
  { key: "bassz", label: "BassZ", icon: "bassz.png" },
  { key: "keyz", label: "KeyZ", icon: "keyz.png" },
  { key: "violinz", label: "ViolinZ", icon: "violinz.png" },
  { key: "flutez", label: "FluteZ", icon: "flutez.png" },
  { key: "saxz", label: "SaxZ", icon: "saxz.png" },
  { key: "clarinetz", label: "ClarinetZ", icon: "clarinetz.png" },
  { key: "trumpetz", label: "TrumpetZ", icon: "trumpetz.png" },
  { key: "drumz", label: "DrumZ", icon: "drumz.png" },
].map((a) => ({ ...a, built: true, in_app: true }));

const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// The price of a take, in the house format and before the control that opens the
// coach: green for what a free prompt covers, red for what leaves, always the
// resource emoji. A take the coach cannot read is not charged, and that is said here
// because it is the first thing anybody sending a recording wants to know.
function Price({ price, daily }) {
  if (!price || price.kind !== "prompt") return null;
  const left = price.daily_remaining ?? daily?.remaining ?? 0;
  if (price.free_today) {
    return (
      <span className="text-emerald-300">
        Free today <span className="text-white/45">— a take uses 1 of your {left} free {left === 1 ? "prompt" : "prompts"}</span>
      </span>
    );
  }
  return (
    <span className="text-mcz-ember">
      −{price.cost_cents} {PROMPTZ}
      <span className="text-white/45">
        {left > 0
          ? " a take — this costs more than a free prompt covers"
          : IN_SHELL
            ? " a take from PromptZ you already hold — today's free prompts are used and renew tomorrow"
            : " a take — today's free prompts are used"}
      </span>
    </span>
  );
}

function Status({ app }) {
  if (!app.built) return <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/55">Not built yet</span>;
  if (app.configured === false) return <span className="rounded-full border border-mcz-gold/40 px-2 py-0.5 text-[11px] text-mcz-gold">Not switched on yet</span>;
  return <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 text-[11px] text-emerald-300">Ready</span>;
}

function CoachCard({ app, daily, priced }) {
  const can = app.built && app.configured !== false;
  const count = Number(app.count);
  const scores = Array.isArray(app.scores) ? app.scores.filter(Boolean) : [];
  return (
    <article className="neon-frame flex flex-col gap-3 p-4" aria-labelledby={`sz-${app.key}`} data-tour={`sz-app-${app.key}`}>
      <div className="flex items-start gap-3">
        <IconImg icon={app.icon} alt="" className="h-14 w-14 shrink-0 rounded-xl shadow-neon" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`sz-${app.key}`} className="font-display text-lg font-bold text-mcz-cyan">{app.label}</h3>
            <Status app={app} />
          </div>
          {app.desc && <p className="mt-1 text-sm text-white/65">{app.desc}</p>}
        </div>
      </div>

      {/* What a take here is scored on — the server's own labels, so a dimension the
          coach adds appears here with its mark and nobody retypes it. */}
      {scores.length > 0 && (
        <p className="text-[12px] leading-relaxed text-white/55">
          <span className="text-white/70">Scored on</span> {scores.join(" · ")}
        </p>
      )}

      {Number.isFinite(count) && app.count != null && app.built && (
        <p className="text-xs text-white/50">
          {count.toLocaleString()} {count === 1 ? "take" : "takes"} scored
          {Number(app.xp) > 0 && Number.isFinite(Number(app.level)) && (
            <> · level {Number(app.level)} <span className="text-white/35">({Number(app.xp).toLocaleString()} {XP})</span></>
          )}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* The price sits BEFORE the button that opens the coach, and is absent
            rather than guessed when the server could not say. */}
        {priced && app.price && <p className="text-[12px]"><Price price={app.price} daily={daily} /></p>}
        {can && (
          <button className="neon-btn-primary !w-auto px-5" onClick={() => goToTab(app.tab || app.key)}>
            Open <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

// The honest account of where a recording goes. Only in the standalone app, because
// that is where a reviewer and a new member both look for it first; every line is
// checked against the code in the backend (apps/economy/vocalcoach.py,
// coach_think.py, takescorez.py, models.mint_score_share) — see
// play/skillz/README.md for the claim-by-claim table.
function WhatLeaves() {
  return (
    <section className="neon-frame space-y-3 p-4 text-sm" aria-labelledby="sz-leaves" data-tour="sz-what-leaves">
      <h3 id="sz-leaves" className="font-display text-lg font-bold text-mcz-cyan">What leaves your device</h3>
      <ul className="list-disc space-y-2 pl-5 text-white/75">
        <li>
          <span className="font-semibold text-white">Recording.</span> Nothing is recorded until
          you press <span className="font-semibold text-white">Record a take</span>; your browser
          asks for the microphone then, and for the camera only if you choose{" "}
          <span className="font-semibold text-white">Record on camera</span>. You can attach an audio
          or video file instead and never allow either.
        </li>
        <li>
          <span className="font-semibold text-white">Sending a take.</span> The audio (and the video,
          if it is one) is uploaded to our server and passed to Google's Gemini, which listens and
          scores it. We send it with our own instructions and the genre, difficulty and range you
          picked — not your name, username or email. Anything you say or sing in it goes with it.
        </li>
        <li>
          <span className="font-semibold text-white">The advice.</span> What Gemini reported about the
          take — its scores and notes, as text, not the recording — goes to Anthropic's Claude,
          which checks the advice against it. With it go the genre, difficulty and style you picked
          and a short summary of your earlier scores: which one has been weakest lately, how one has
          moved, and whether recent takes read as strain. Claude never hears the take. Each is
          processed under its own terms.
        </li>
        <li>
          <span className="font-semibold text-white">What we keep.</span> Your recording is read once and
          not stored. We keep the scores, what the coach heard, its verdict and advice, the genre,
          difficulty and date, on your account, so your progress is there next time. Each scored
          take also gets a score page with the score, verdict, genre and your username on it. This
          app doesn't show or share it, but it opens for anyone who has its link.
        </li>
      </ul>
      <p className="text-xs text-white/55">
        What the coach says can be wrong. It listens to one take and can't see your history, your
        health or your teacher. Use <span className="font-semibold">Report this output</span> under a
        score if it is harmful or plainly wrong.
      </p>
    </section>
  );
}

export default function SkillZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api("/api/economy/skillz/")
    .then((d) => { setData(d); setErr(""); })
    .catch((e) => setErr(e.message || "The SkillZ list couldn't be loaded."));
  useEffect(() => { load(); }, []);

  const served = Array.isArray(data?.apps) ? data.apps : null;
  // The standalone lists only what it contains. `in_app` is the server's answer; an
  // older API that does not send it falls back to the seven it was built around.
  const apps = (served || FALLBACK).filter((a) => !IN_SHELL || (a.in_app ?? true));
  const visible = new Set(apps.map((a) => a.key));
  const iconOf = (key) => apps.find((a) => a.key === key)?.icon || FALLBACK.find((a) => a.key === key)?.icon;
  const recent = (data?.recent || []).filter((r) => visible.has(r.app)).slice(0, 8);
  const coming = Array.isArray(data?.coming) ? data.coming.filter(Boolean) : [];
  const daily = data?.daily;

  return (
    <div className="space-y-5" data-tour="sz-hub">
      <header className="flex items-center gap-4">
        <IconImg icon="skillz.png" alt="SkillZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">SkillZ</h2>
          <p className="text-sm text-white/60">
            Record a take on your instrument, get it scored, and see what to fix — and what each
            coach costs, before you open it.
          </p>
        </div>
      </header>

      {!data && !err && <Loader2 className="mx-auto animate-spin" size={20} role="status" aria-label="Loading" />}

      {err && (
        <p role="alert" className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-ember">
          {err} What a take costs isn't shown until this loads — the coaches below still open, and
          each states its own price.{" "}
          <button className="re-link" onClick={load}>Try again</button>
        </p>
      )}

      {daily && daily.allowance > 0 && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/75" data-tour="sz-daily">
          <span className="font-semibold text-emerald-300">{daily.remaining} of {daily.allowance}</span> free
          prompts left today. A scored take uses one, and they renew every day. A take the coach
          can't read isn't charged.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((a) => <CoachCard key={a.key} app={a} daily={daily} priced={!!served} />)}
      </div>

      {recent.length > 0 && (
        <section className="space-y-2" aria-labelledby="sz-recent" data-tour="sz-recent">
          <h3 id="sz-recent" className="text-sm font-semibold text-white/70">Recent takes</h3>
          {recent.map((r) => (
            <button key={`${r.app}-${r.id}`} onClick={() => goToSpot(r.tab || r.app, r.target)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-white/30">
              <IconImg icon={iconOf(r.app)} alt="" className="h-8 w-8 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1 truncate text-white/85">{r.label}</span>
              <span className="shrink-0 text-[11px] text-white/45">{day(r.created_at)}</span>
              <ArrowRight size={14} className="shrink-0 text-white/40" />
            </button>
          ))}
        </section>
      )}

      {/* The artwork shows more people than there are coaches. Said plainly, with no
          control: nothing here opens, because nothing exists to open. */}
      {coming.length > 0 && (
        <p className="text-xs text-white/55" data-tour="sz-coming">
          <span className="font-semibold text-white/70">Not built yet:</span> {coming.join(", ")}.
          They're on the SkillZ icon and there is no coach, scored take or skill tree for any of
          them today.
        </p>
      )}

      {IN_SHELL && <WhatLeaves />}
    </div>
  );
}
