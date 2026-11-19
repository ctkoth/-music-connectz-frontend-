// DawZ — every DAW on the one shared engine (src/daw/). A built one opens; an
// unbuilt one takes a vote for which gets built next. Which is which is the
// server's `built` / `tab` — a card never claims a DAW exists on its own say-so.
//
// The catalog and its vote-to-build design already existed, written in
// Corey's own voice, in src/mcz2/dawz.js — the frontend's 2.2 reference app,
// which CLAUDE.md says outright is not mounted. So this exact screen was
// finished and reachable by nobody, the LogicZ failure ("a built thing
// nobody can find reads as unbuilt") one level further back: this one
// wasn't even built where anybody could reach it.
//
// The catalog now lives on the server (apps/economy/dawz.py) as the one
// source of truth — this screen renders it, never retypes a description or
// a vote count, the same rule every tier number and instrument profile in
// this codebase follows. Voting is free and pays nothing: the cost/gain
// rule has nothing to say about a click that moves no resource.
import { useEffect, useState } from "react";
import { Loader2, Play, Vote } from "lucide-react";
import { goToSpot } from "../goto.js";
import { pathFor } from "../App.jsx";
import { isStatZTier } from "../PickConnectZ.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

// How a DAW opens, the member's choice, kept on this device. Tab and Window are free; Split (the DAW beside
// the app you're in) is SplitZ, which is StatZ's — anyone can open it and sample it, and the pane says so.
const OPEN_KEY = "mcz_daw_open";
const OPEN_MODES = [
  { key: "tab", label: "Tab", hint: "here, in place of this screen" },
  { key: "split", label: "Split window", hint: "beside the app you're in" },
  { key: "window", label: "New window", hint: "its own browser window" },
];
function openDaw(tab, how) {
  if (how === "split") window.dispatchEvent(new CustomEvent("mcz-split", { detail: tab }));
  else if (how === "window") window.open(pathFor(tab), "_blank", "noopener");
  else goToSpot(tab);
}
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

export default function DawZ() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState("");

  const load = () => api("/api/economy/dawz/").then(setState).catch(() => setState({ daws: [] }));
  useEffect(() => { load(); }, []);

  const vote = async (id) => {
    setBusy(id);
    try {
      setState(await api("/api/economy/dawz/", { method: "POST", body: { daw_id: id } }));
    } finally {
      setBusy("");
    }
  };

  const { user } = useAuth();
  const [how, setHow] = useState(() => { try { return localStorage.getItem(OPEN_KEY) || "tab"; } catch { return "tab"; } });
  const choose = (k) => { setHow(k); try { localStorage.setItem(OPEN_KEY, k); } catch { /* this visit only */ } };
  const statz = isStatZTier(user?.tier);

  if (!state) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/50">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading DawZ…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="neon-frame p-4">
        <h1 className="text-lg font-bold text-white">DawZ</h1>
        <p className="mt-1 text-sm text-white/60">
          {state.daws.length} DAWs on one engine: a session made in one opens in
          another. Open the ones that are built; vote for which gets built next —
          a vote costs nothing and earns nothing.
        </p>
        {state.plugin_note && <p className="mt-2 text-xs text-white/60">🔌 {state.plugin_note}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" role="radiogroup" aria-label="Open a DAW as">
          <span className="text-white/60">Tap a DAW's icon to open it as</span>
          {OPEN_MODES.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={how === m.key} data-nomemo="true" title={m.hint} onClick={() => choose(m.key)}
                    className={`pill ${how === m.key ? "!border-mcz-cyan !text-white" : ""}`}>{m.label}</button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-white/55">
          {OPEN_MODES.find((m) => m.key === how)?.hint}.{" "}
          {how === "split" ? (statz ? <span className="text-emerald-300">Included in your StatZ.</span>
            : <span className="text-mcz-gold">Split is StatZ's — you can open it now and sample it; Tab and New window are free.</span>)
            : <span className="text-emerald-300">Free.</span>}
        </p>
      </div>

      <div className="space-y-3">
        {state.daws.map((d) => (
          <div key={d.id} className="neon-frame flex items-start gap-3 p-4">
            {d.built && d.tab ? (
              <button type="button" onClick={() => openDaw(d.tab, how)} aria-label={`Open ${d.name} (${OPEN_MODES.find((m) => m.key === how)?.label})`}
                      className="shrink-0 rounded-xl transition hover:scale-105 hover:shadow-neon">
                <IconImg icon={d.icon} alt={d.name} className="h-12 w-12 rounded-xl object-cover sm:h-16 sm:w-16"
                         fallback={<span className="text-4xl">{d.emoji}</span>} />
              </button>
            ) : (
              <IconImg icon={d.icon} alt={d.name} className="h-12 w-12 shrink-0 rounded-xl object-cover opacity-70 sm:h-16 sm:w-16"
                       fallback={<span className="text-4xl">{d.emoji}</span>} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-white">
                  {d.emoji} {d.name}
                </h2>
                {d.built ? (
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    built · free
                  </span>
                ) : (
                  <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">
                    not built yet
                  </span>
                )}
                <span className="text-[10px] text-white/50">our knockoff of {d.knockoff}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-white/65">{d.desc}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {d.built && d.tab && (
                  <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => openDaw(d.tab, how)}>
                    <Play size={14} className="mr-1 inline" /> Open {d.name}{how === "tab" ? "" : how === "split" ? " beside" : " in a window"}
                  </button>
                )}
                {!d.built && <button
                  className={`neon-btn-${d.my_vote ? "primary" : "ghost"} !w-auto px-4 py-2 text-xs`}
                  disabled={busy === d.id}
                  onClick={() => vote(d.id)}
                >
                  {busy === d.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Vote size={14} className="mr-1 inline" />
                  )}
                  {d.my_vote ? "You voted ✓ (tap to undo)" : "Vote to build this"}
                </button>}
                {!d.built && (
                  <span className="text-[11px] text-white/60">
                    {d.votes} vote{d.votes === 1 ? "" : "s"} so far
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {!state.daws.length && (
          <p className="p-6 text-center text-sm text-white/55">Couldn't load DawZ right now.</p>
        )}
      </div>
    </div>
  );
}
