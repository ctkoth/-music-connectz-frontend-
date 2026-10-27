// FriendZ 🤝 — everyone you follow who follows you back.
//
// A screen of its own for what GroupZ files as one section among five. It stores
// nothing and decides nothing: `/api/groupz/` already answers who is mutual (the
// `friends` group, from the follow graph, so this list and a profile's friend count
// cannot disagree) and who has been earned as a PartnerZ (`partners`, with `almost`
// for the pairs part-way there). Adding or removing somebody is following or
// unfollowing, which stays where it always was — on their profile and in GroupZ.
//
// What a row offers, because a list of names is the dead end the cross-pollination
// rule exists to close: the profile and a prefilled message (MemberName), and the two
// things that turn a friend into a partner — a collab and a battle — each handing the
// destination the person rather than landing on an empty form.
//
// The PartnerZ target is read off the server's own numbers (`works` + `needs`), never
// typed here, and the rule is the server's `note` unreworded: what counts is the
// server's call, and a second copy of it here would drift from it.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Swords, Handshake } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { asList } from "../shape.js";
import { arrange } from "../friendz.js";
import { goToSpot } from "../goto.js";
import { handOff } from "../handoff.js";
import MemberName from "../MemberName.jsx";
import Empty from "../components/Empty.jsx";

const SEARCH_FROM = 8;

export default function FriendZ() {
  const [board, setBoard] = useState(null);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    api("/api/groupz/").then((d) => setBoard(asList(d))).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const friends = board?.find((g) => g.kind === "friends");
  const partners = board?.find((g) => g.kind === "partners");
  const rows = useMemo(
    () => arrange(friends?.members, partners?.members, partners?.almost),
    [friends, partners],
  );
  const shown = q.trim() ? rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())) : rows;
  const partnerCount = rows.filter((r) => r.partner).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="groupz_friendz.png" alt="FriendZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#4ade80" }}>FriendZ</h2>
          <p className="text-sm text-white/60">Members you follow who follow you back.</p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">{msg}</p>}

      {!board && !msg ? (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      ) : board && (
        <section className="neon-frame space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {rows.length} {rows.length === 1 ? "friend" : "friends"}
              {rows.length > 0 && (
                <span className="ml-2 text-xs font-normal text-white/50">
                  {partnerCount} PartnerZ
                </span>
              )}
            </p>
            {rows.length > SEARCH_FROM && (
              <input className="neon-input !py-1.5 w-44 text-sm" placeholder="Find a friend"
                     value={q} onChange={(e) => setQ(e.target.value)} />
            )}
          </div>

          {friends?.note && <p className="text-[11px] text-white/40">{friends.note}</p>}
          {partners?.note && <p className="text-[11px] text-white/40">{partners.note}</p>}

          {rows.length === 0 && (
            <Empty text="Nobody follows you back yet. Follow somebody who follows you and they land here."
                   action="Find people in VybeZ" onAction={() => goToSpot("vybez", "")} />
          )}
          {rows.length > 0 && shown.length === 0 && <Empty text="No friend matches that." />}

          <div className="space-y-1.5">
            {shown.map((r) => (
              <div key={r.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 text-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <MemberName username={r.name} />
                  {r.partner && (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">PartnerZ</span>
                  )}
                  {!r.partner && r.almost && (
                    <span className="text-[11px] text-white/50"
                          title="Finished work together — from the server's tally">
                      {r.almost.works} of {r.almost.works + r.almost.needs} works · {r.almost.needs} to go
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" className="neon-btn-ghost !w-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                          title={`Start a CollabZ deal with @${r.name}`}
                          onClick={() => handOff("collabz", "collabz-partner", { partner: r.name })}>
                    <Handshake size={12} /> Collab
                  </button>
                  <button type="button" className="neon-btn-ghost !w-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                          title={`Challenge @${r.name} to a battle`}
                          onClick={() => handOff("battlez", "battlez-opponent", { opponent: r.name })}>
                    <Swords size={12} /> Battle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
