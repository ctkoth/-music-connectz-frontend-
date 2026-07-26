import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, Heart } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { loadSocial, NATIONALITIES } from "./socialData.js";

const FLAG = Object.fromEntries(NATIONALITIES.map(([f, n]) => [n, f]));

// Seed directory — each member carries NationalitieZ so heritage filtering is
// demoable. Real members merge in from the shared store as profiles are saved.
const SEED = [
  { user: "NovaBeatz", icon: "personaz_producer.png", persona: "Producer", location: "Atlanta, GA", nationalities: ["African American", "Jamaican"], looking: "collab" },
  { user: "SopranoSol", icon: "personaz_indieartist.png", persona: "Indie Artist", location: "Los Angeles, CA", nationalities: ["Mexican", "Filipino"], looking: "collab" },
  { user: "KxngDrill", icon: "personaz_ghostwriter.png", persona: "Ghostwriter", location: "Chicago, IL", nationalities: ["Nigerian"], looking: "romance" },
  { user: "MiaMix", icon: "personaz_mixengineer.png", persona: "Mix Engineer", location: "London, UK", nationalities: ["British", "Irish"], looking: "collab" },
  { user: "DreVision", icon: "personaz_videographer.png", persona: "Videographer", location: "Toronto, CA", nationalities: ["Haitian", "Canadian"], looking: "romance" },
  { user: "SeoulKeys", icon: "personaz_producer.png", persona: "Producer", location: "Seoul, KR", nationalities: ["Korean"], looking: "collab" },
];

export default function SocialConnectZ() {
  const [me, setMe] = useState(null);
  const [nat, setNat] = useState("");
  const [q, setQ] = useState("");
  const [dir, setDir] = useState(SEED);

  useEffect(() => {
    api("/api/auth/me/").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    const rebuild = () => {
      const s = loadSocial();
      const mine = s.profile;
      if (mine?.user && (mine.nationalities?.length || mine.persona)) {
        setDir([{ ...mine, self: true }, ...SEED.filter((m) => m.user !== mine.user)]);
      } else {
        setDir(SEED);
      }
    };
    rebuild();
    window.addEventListener("mcz-social", rebuild);
    return () => window.removeEventListener("mcz-social", rebuild);
  }, []);

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

      {/* Filters */}
      <div className="re-card space-y-3">
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

      {/* Results */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((m) => (
          <div key={m.user} className={`re-card ${m.self ? "!border-mcz-ember/40" : ""}`}>
            <div className="mb-2 flex items-center gap-3">
              <IconImg icon={m.icon || "personaz.png"} alt="" className="h-11 w-11 rounded-full object-cover" />
              <div className="flex-1">
                <div className="text-sm font-bold text-white">
                  {m.user}{m.self && <span className="ml-2 text-[10px] text-mcz-ember">you</span>}
                </div>
                <div className="text-[11px] text-white/50">{m.persona}</div>
              </div>
              {m.looking === "romance"
                ? <span className="pill !border-mcz-pink/40 !text-mcz-pink"><Heart size={10} className="inline" /> Romance</span>
                : <span className="pill !border-mcz-ember/40 !text-mcz-ember">Collab</span>}
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
                  onClick={() => setNat(n)}
                  className="pill hover:!text-white"
                  title={`Filter by ${n}`}
                >
                  {FLAG[n] || "🌐"} {n}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-white/45">No creators match that heritage yet.</p>
        )}
      </div>
    </div>
  );
}
