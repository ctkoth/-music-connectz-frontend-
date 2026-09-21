// DawZ — seven DAW knockoffs, none built yet. Clicking one is a vote for
// which gets built next.
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
import { Loader2, Vote } from "lucide-react";
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
          Seven DAWs, none of them built yet. Tap one to vote for which gets
          built next — a click is the whole action, and it earns nothing
          because it costs nothing.
        </p>
      </div>

      <div className="space-y-3">
        {state.daws.map((d) => (
          <div key={d.id} className="neon-frame flex items-start gap-3 p-4">
            <IconImg
              icon={d.icon}
              alt={d.name}
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
              fallback={<span className="text-4xl">{d.emoji}</span>}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-white">
                  {d.emoji} {d.name}
                </h2>
                <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-300">
                  not built yet
                </span>
                <span className="text-[10px] text-white/35">our knockoff of {d.knockoff}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-white/65">{d.desc}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
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
                </button>
                <span className="text-[11px] text-white/45">
                  {d.votes} vote{d.votes === 1 ? "" : "s"} so far
                </span>
              </div>
            </div>
          </div>
        ))}
        {!state.daws.length && (
          <p className="p-6 text-center text-sm text-white/40">Couldn't load DawZ right now.</p>
        )}
      </div>
    </div>
  );
}
