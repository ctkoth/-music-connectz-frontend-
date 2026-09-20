// Social ConnectZ — who's actually here, filterable by NationalitieZ heritage.
//
// This screen used to render six invented people (NovaBeatz, SopranoSol,
// KxngDrill, MiaMix, DreVision, SeoulKeys) from a hardcoded SEED array, with
// only the CURRENT member's own localStorage-cached profile merged in on top
// — never another real member, because the real member search
// (`GET /api/economy/members/`) had no caller here at all. VybeZ already
// wired that same endpoint for its filter-heavy search; Social ConnectZ is
// the ROOM (who is here) rather than VybeZ's LOOKING (who matches what),
// but "who is here" was fake for the entire life of this screen — a member
// searching their own heritage would find five strangers who do not exist
// and never themselves unless they had already saved a profile.
//
// Real members now, real avatars (a member's own uploaded custom icon, via
// `_avatar_url` server-side — never a generic persona placeholder standing
// in for a person), and a persona chip is only shown when the member has
// actually claimed one.
import { useCallback, useEffect, useState } from "react";
import { MapPin, Search, UserRound } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import { NATIONALITIES } from "./socialData.js";

const FLAG = Object.fromEntries(NATIONALITIES.map(([f, n]) => [n, f]));

export default function SocialConnectZ() {
  const [rows, setRows] = useState([]);
  const [nat, setNat] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api("/api/economy/members/")
      .then((d) => setRows(d.members || []))
      // The real error. A directory that quietly shows nobody on a 500 reads
      // as "no members" rather than "the request failed" — the exact
      // distinction the funnel's own `pct: null` rule exists to keep clear.
      .catch((e) => setError(e.message || "Couldn't load Social ConnectZ."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((m) => {
    const natMatch = !nat || (m.nationalities || []).includes(nat);
    const personaNames = (m.personas || []).map((p) => p.name).join(" ");
    const text = `${m.username} ${m.display_name || ""} ${personaNames} ${(m.regions || []).join(" ")}`.toLowerCase();
    const qMatch = !q || text.includes(q.toLowerCase());
    return natMatch && qMatch;
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="social_connectz.png" alt="Social ConnectZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">Social ConnectZ</h2>
          <p className="text-xs text-white/45">Who's here — filter by NationalitieZ heritage.</p>
        </div>
      </header>

      {/* Filters.
          `social-feed` is another anchor EarnZ has linked to since it shipped
          without it ever existing — "Share another member's post" landed at the
          top of the tab. QuestZ's reach milestone points here too, because
          reach is measured from verified social sources. */}
      <div className="re-card space-y-3" data-tour="social-feed">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/40 px-3">
          <Search size={16} className="text-white/40" />
          <input className="w-full bg-transparent py-2 text-sm text-white placeholder-white/30 outline-none" placeholder="Search name, persona, region…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <IconImg icon="nationalitiez.png" alt="" className="h-6 w-6 rounded" />
          <select className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60" value={nat} onChange={(e) => setNat(e.target.value)}>
            <option value="">🌐 All NationalitieZ</option>
            {NATIONALITIES.map(([flag, name]) => (
              <option key={name} value={name}>{flag} {name}</option>
            ))}
          </select>
          {nat && (
            <button className="re-link shrink-0 px-2 text-xs" onClick={() => setNat("")}>Clear</button>
          )}
        </div>
        <p className="re-label">
          {loading ? "Loading…" : `${filtered.length} creator${filtered.length !== 1 ? "s" : ""} match`}
        </p>
      </div>

      {error && (
        <p className="re-card text-sm text-mcz-pink">{error}</p>
      )}

      {/* Results */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((m) => (
          <div key={m.username} className="re-card">
            <div className="mb-2 flex items-center gap-3">
              {m.avatar
                ? <img src={m.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
                    <UserRound size={18} className="text-white/40" />
                  </div>}
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{m.display_name || m.username}</div>
                {m.personas?.[0]?.name && (
                  <div className="text-[11px] text-white/50">{m.personas[0].name}</div>
                )}
              </div>
            </div>
            {(m.regions || []).length > 0 && (
              <div className="mb-2 flex items-center gap-1 text-[11px] text-white/45">
                <MapPin size={11} /> {m.regions.join(", ")}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(m.nationalities || []).map((n) => (
                <button
                  key={n}
                  onClick={() => setNat(n)}
                  className="pill hover:!text-white"
                  title={`Filter by ${n}`}
                >
                  {FLAG[n] || "🌐"} {n}
                </button>
              ))}
            </div>
            {/* Nothing is a dead end — the same handoff every other member
                list on this platform uses, not a second implementation. */}
            <div className="pt-2">
              <MemberName username={m.username} />
            </div>
          </div>
        ))}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-white/45">
            {rows.length === 0 ? "No members yet." : "No creators match that heritage yet."}
          </p>
        )}
      </div>
    </div>
  );
}
