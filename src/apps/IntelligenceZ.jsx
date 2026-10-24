import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot, goToTab } from "../goto.js";
import { IconImg } from "../App.jsx";
import { IN_SHELL } from "../standalone.js";
import { MONEY, PROMPTZ } from "../resources.js";

// IntelligenceZ — the front door of every IntelligenceZ app.
//
// It decides nothing and charges nothing. What each app is, whether it is
// switched on, what a run costs and how many pieces the member has made all come
// from GET /api/economy/intelligencez/, which reads each price from the same
// function the app's own screen reads it from — so this screen cannot quote a
// number the app then contradicts, and no number is typed in here.
//
// It is mounted twice: as a tab on the main site (every app, including the ones
// that need Music ConnectZ), and as the Home of the standalone IntelligenceZ app
// (standalone/intelligencez/), where it lists only what that app contains. In the
// shell there is nothing to buy, so no price here is an offer — it is what a run
// would cost out of a balance the member already holds.

// Used ONLY when the server cannot be reached: keys, labels and art, never a
// price, a count or a description. An invented number on the screen whose whole
// job is to state one would be the failure it exists to prevent.
const FALLBACK = [
  { key: "sentenceconnectz", label: "Sentence ConnectZ", icon: "sentencez.png", built: true, in_app: true },
  { key: "occ", label: "OCC", icon: "occ.png", built: true, in_app: true },
  { key: "instrumentalconnectz", label: "Instrumental ConnectZ", icon: "instrumentalconnectz.png", built: true, in_app: true },
  { key: "mixconnectz", label: "Mix ConnectZ", icon: "mixconnectz.png", built: true, in_app: true },
  { key: "videoconnectz", label: "Video ConnectZ", icon: "videoconnectz.png", built: true, in_app: false },
  { key: "facez", label: "FaceZ", icon: "facez.png", built: true, in_app: false },
  { key: "imageconnectz", label: "Image ConnectZ", icon: "imageconnectz.png", built: false, in_app: false },
];

// What "your piece count" counts, per app — said in the app's own word.
const NOUN = {
  sentenceconnectz: ["piece", "pieces"],
  occ: ["kept reply", "kept replies"],
  instrumentalconnectz: ["loop", "loops"],
  mixconnectz: ["saved master", "saved masters"],
  videoconnectz: ["video", "videos"],
  facez: ["photo", "photos"],
};
const noun = (key, n) => (NOUN[key] || ["piece", "pieces"])[n === 1 ? 0 : 1];

const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// The price, in the house format and before the control that spends it: red for
// what leaves, green for what is free, always the resource emoji.
function Price({ price, daily }) {
  if (!price) return null;
  if (price.kind === "device") {
    return <span className="text-emerald-300">Free — runs on your device</span>;
  }
  if (price.kind === "free") {
    return <span className="text-emerald-300">Free</span>;
  }
  if (price.kind === "fixed") {
    return (
      <span className="text-mcz-ember">
        −${(Number(price.cost_cents || 0) / 100).toFixed(2)} {MONEY}{" "}
        <span className="text-white/45">a video — there is no free tier</span>
      </span>
    );
  }
  if (price.kind === "prompt") {
    const left = price.daily_remaining ?? daily?.remaining ?? 0;
    const engine = price.engine ? <span className="text-white/45"> on {price.engine}</span> : null;
    if (price.free_today) {
      return (
        <span className="text-emerald-300">
          Free today <span className="text-white/45">— uses 1 of your {left} free {left === 1 ? "prompt" : "prompts"}</span>
          {engine}
        </span>
      );
    }
    return (
      <span className="text-mcz-ember">
        −{price.cost_cents} {PROMPTZ}
        <span className="text-white/45">
          {left > 0
            ? " a run — this costs more than a free prompt covers"
            : IN_SHELL
              ? " a run from PromptZ you already hold — today's free prompts are used and renew tomorrow"
              : " a run — today's free prompts are used"}
        </span>
        {engine}
      </span>
    );
  }
  return null;
}

function Status({ app }) {
  if (!app.built) return <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/55">Not built yet</span>;
  if (app.configured === false) return <span className="rounded-full border border-mcz-gold/40 px-2 py-0.5 text-[11px] text-mcz-gold">Not switched on yet</span>;
  return <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 text-[11px] text-emerald-300">Ready</span>;
}

function AppCard({ app, daily, priced }) {
  const can = app.built && app.configured !== false;
  const count = Number(app.count);
  return (
    <article className="neon-frame flex flex-col gap-3 p-4" aria-labelledby={`iz-${app.key}`} data-tour={`iz-app-${app.key}`}>
      <div className="flex items-start gap-3">
        <IconImg icon={app.icon} alt="" className="h-14 w-14 shrink-0 rounded-xl shadow-neon" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={`iz-${app.key}`} className="font-display text-lg font-bold text-mcz-cyan">{app.label}</h3>
            <Status app={app} />
          </div>
          {app.desc && <p className="mt-1 text-sm text-white/65">{app.desc}</p>}
        </div>
      </div>

      {Number.isFinite(count) && app.count != null && app.built && (
        <p className="text-xs text-white/50">{count.toLocaleString()} {noun(app.key, count)} of yours</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* The price sits BEFORE the button that opens the app, and is absent
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

// The honest account of where the member's words and files go. Only in the
// standalone app, because that is where a reviewer and a new member both look
// for it first; every line is checked against the code in the backend
// (apps/economy/sentencez.py, instrumentalz.py, occ.py, mixz.py) — see
// play/intelligencez/README.md.
function WhatLeaves() {
  return (
    <section className="neon-frame space-y-3 p-4 text-sm" aria-labelledby="iz-leaves" data-tour="iz-what-leaves">
      <h3 id="iz-leaves" className="font-display text-lg font-bold text-mcz-cyan">What leaves your device</h3>
      <ul className="list-disc space-y-2 pl-5 text-white/75">
        <li>
          <span className="font-semibold text-white">Write and Compose:</span> what you type is sent
          to Google's Gemini to be answered. <span className="font-semibold text-white">Chat:</span> your
          message and the last few turns of the conversation on screen go to Anthropic's Claude.
          Each is processed under its own terms. We don't add your username or email to it, but
          anything you type — a name on a resume, say — goes with it.
        </li>
        <li>
          What Write and Compose make is saved to your account, with what you typed to ask for it.
          A Chat reply is saved only if you keep it — or report it, which keeps it so the owner can
          read all of it.
        </li>
        <li>
          <span className="font-semibold text-white">Master:</span> the song you pick is read and
          mastered on this device, with no AI model, and is never uploaded. Only if you press{" "}
          <span className="font-semibold text-white">Save</span> does the mastered file go to your
          account, with a record of the settings and measurements. Its link opens for anybody who
          has it, so download instead of saving anything you would not want opened.
        </li>
      </ul>
      <p className="text-xs text-white/55">
        What the AI writes can be wrong. Read it before you use it, and use{" "}
        <span className="font-semibold">Report this output</span> if it is harmful.
      </p>
    </section>
  );
}

export default function IntelligenceZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = () => api("/api/economy/intelligencez/")
    .then((d) => { setData(d); setErr(""); })
    .catch((e) => setErr(e.message || "The IntelligenceZ list couldn't be loaded."));
  useEffect(() => { load(); }, []);

  // The standalone app lists only what it contains. `in_app` is the server's
  // answer; an older API that does not send it falls back to the local four.
  const inShell = (a) => (a.in_app ?? FALLBACK.find((f) => f.key === a.key)?.in_app ?? false);
  const served = Array.isArray(data?.apps) ? data.apps : null;
  const apps = (served || FALLBACK).filter((a) => !IN_SHELL || inShell(a));
  const visible = new Set(apps.map((a) => a.key));
  const iconOf = (key) => apps.find((a) => a.key === key)?.icon || FALLBACK.find((a) => a.key === key)?.icon;
  const recent = (data?.recent || []).filter((r) => visible.has(r.app)).slice(0, 8);
  const daily = data?.daily;

  return (
    <div className="space-y-5" data-tour="iz-hub">
      <header className="flex items-center gap-4">
        <IconImg icon="intelligencez.png" alt="IntelligenceZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">IntelligenceZ</h2>
          <p className="text-sm text-white/60">
            {IN_SHELL
              ? "Write, chat, compose and master — and what each one costs, before you open it."
              : "Every IntelligenceZ app in one place, and what each one costs, before you open it."}
          </p>
        </div>
      </header>

      {!data && !err && <Loader2 className="mx-auto animate-spin" size={20} role="status" aria-label="Loading" />}

      {err && (
        <p role="alert" className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-ember">
          {err} What each app costs isn't shown until this loads — the apps below still open, and each states its own price.{" "}
          <button className="re-link" onClick={load}>Try again</button>
        </p>
      )}

      {daily && daily.allowance > 0 && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/75" data-tour="iz-daily">
          <span className="font-semibold text-emerald-300">{daily.remaining} of {daily.allowance}</span> free prompts left today.
          They are shared by every AI screen here and renew every day. A run that fails or comes back empty isn't charged.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((a) => <AppCard key={a.key} app={a} daily={daily} priced={!!served} />)}
      </div>

      {recent.length > 0 && (
        <section className="space-y-2" aria-labelledby="iz-recent" data-tour="iz-recent">
          <h3 id="iz-recent" className="text-sm font-semibold text-white/70">Recent pieces</h3>
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

      {IN_SHELL && <WhatLeaves />}
    </div>
  );
}
