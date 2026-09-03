import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { PERSONAS } from "../personaIcons.js";
import { NATIONALITIES, FLAG_FOR } from "./socialData.js";
import { openMember } from "../goto.js";

// A persona is stored as {key, name, skills} (or, from before the skill
// picker, a bare key string). The default label + icon for that key comes
// from the one PERSONAS table ProfileZ's picker uses, so "producer" means
// the same thing everywhere.
function personaOf(personas) {
  const first = (personas || [])[0];
  if (!first) return null;
  const key = typeof first === "object" ? first.key : first;
  const label = (typeof first === "object" ? first.name : first) || key;
  const found = PERSONAS.find(([k]) => k === key);
  return { label: found?.[1] || label, icon: found?.[2] || "personaz.png" };
}

// GET /api/economy/members/(<username>/)? card -> what this screen renders.
function toCard(p, self = false) {
  const persona = personaOf(p.personas);
  return {
    user: p.username,
    avatar: p.avatar || null,
    icon: persona?.icon || "personaz.png",
    persona: persona?.label || "",
    location: p.location || "",
    nationalities: p.nationalities || [],
    tier: p.tier || "",
    self,
  };
}

export default function SocialConnectZ() {
  const [me, setMe] = useState(null);
  const [nat, setNat] = useState("");
  const [q, setQ] = useState("");
  const [dir, setDir] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/auth/me/").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    let on = true;
    const rebuild = async () => {
      setLoading(true);
      setErr("");
      try {
        const [mine, listRes] = await Promise.all([
          me?.username
            ? api(`/api/economy/members/${encodeURIComponent(me.username)}/`).catch(() => null)
            : Promise.resolve(null),
          api("/api/economy/members/"),
        ]);
        const others = (listRes?.members || []).map((p) => toCard(p));
        // Only show a "you" card once there's something real to show — a
        // blank profile isn't a creator to discover yet.
        const selfCard = mine && ((mine.nationalities?.length || 0) > 0 || (mine.personas?.length || 0) > 0)
          ? [toCard(mine, true)]
          : [];
        if (on) setDir([...selfCard, ...others]);
      } catch (e) {
        if (on) setErr(e.message || "Couldn't load members.");
      } finally {
        if (on) setLoading(false);
      }
    };
    rebuild();
    // ProfileZ fires this on every save, so a NationalitieZ or PersonaZ
    // change shows up here without leaving the tab.
    window.addEventListener("mcz-social", rebuild);
    return () => { on = false; window.removeEventListener("mcz-social", rebuild); };
  }, [me?.username]);

  const filtered = useMemo(() => {
    return dir.filter((m) => {
      const natMatch = !nat || (m.nationalities || []).includes(nat);
      const text = `${m.user} ${m.persona} ${m.location}`.toLowerCase();
      const qMatch = !q || text.includes(q.toLowerCase());
      return natMatch && qMatch;
    });
  }, [dir, nat, q]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="social_connectz.png" alt="Social ConnectZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">Social ConnectZ</h2>
          <p className="text-xs text-white/45">Discover creators — filter by NationalitieZ heritage.</p>
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
          <input className="w-full bg-transparent py-2 text-sm text-white placeholder-white/30 outline-none" placeholder="Search name, persona, city…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        <p className="re-label">{filtered.length} creator{filtered.length !== 1 ? "s" : ""} match</p>
      </div>

      {/* Results — real members from GET /api/economy/members/, tap a card to
          open their full profile (MemberProfile) instead of dead-ending here. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((m) => (
          <div
            key={m.user}
            onClick={() => openMember(m.user)}
            className={`re-card cursor-pointer transition hover:!border-white/20 ${m.self ? "!border-mcz-ember/40" : ""}`}
          >
            <div className="mb-2 flex items-center gap-3">
              {m.avatar ? (
                <img src={m.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <IconImg icon={m.icon} alt="" className="h-11 w-11 rounded-full object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">
                  {m.user}{m.self && <span className="ml-2 text-[10px] text-mcz-ember">you</span>}
                </div>
                {m.persona && <div className="text-[11px] text-white/50">{m.persona}</div>}
              </div>
              {m.tier && m.tier !== "free" && (
                <span className="pill shrink-0 uppercase !text-mcz-cyan">{m.tier}</span>
              )}
            </div>
            {m.location && (
              <div className="mb-2 flex items-center gap-1 text-[11px] text-white/45">
                <MapPin size={11} /> {m.location}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(m.nationalities || []).map((n) => (
                <button
                  key={n}
                  onClick={(e) => { e.stopPropagation(); setNat(n); }}
                  className="pill hover:!text-white"
                  title={`Filter by ${n}`}
                >
                  {FLAG_FOR[n] || "🌐"} {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <p className="flex items-center gap-2 text-sm text-white/45">
          <Loader2 className="animate-spin" size={14} /> Loading creators…
        </p>
      )}
      {err && <p className="text-sm text-mcz-pink">{err}</p>}
      {!loading && !err && filtered.length === 0 && (
        <p className="text-sm text-white/45">No creators match that heritage yet.</p>
      )}
    </div>
  );
}
