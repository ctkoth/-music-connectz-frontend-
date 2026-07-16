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
      <header className="flex items-center gap-4">
        <IconImg icon="social_connectz.png" alt="Social ConnectZ" className="h-14 w-14 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-2xl font-extrabold text-mcz-pink">Social ConnectZ 💓</h2>
          <p className="text-sm text-white/55">Discover creators — filter by NationalitieZ heritage.</p>
        </div>
      </header>

      {/* Filters */}
      <div className="neon-frame space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-white/40" />
          <input className="neon-input py-2" placeholder="Search name, persona, city…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <IconImg icon="nationalitiez.png" alt="" className="h-6 w-6 rounded" />
          <select className="neon-input py-2" value={nat} onChange={(e) => setNat(e.target.value)}>
            <option value="">🌐 All NationalitieZ</option>
            {NATIONALITIES.map(([flag, name]) => (
              <option key={name} value={name}>{flag} {name}</option>
            ))}
          </select>
          {nat && (
            <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={() => setNat("")}>Clear</button>
          )}
        </div>
        <p className="text-[11px] text-white/40">{filtered.length} creator{filtered.length !== 1 ? "s" : ""} match</p>
      </div>

      {/* Results */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((m) => (
          <div key={m.user} className={`neon-frame p-4 ${m.self ? "!border-mcz-gold/50" : ""}`}>
            <div className="mb-2 flex items-center gap-3">
              <IconImg icon={m.icon || "personaz.png"} alt="" className="h-11 w-11 rounded-full object-cover" />
              <div className="flex-1">
                <div className="text-sm font-bold text-white">
                  {m.user}{m.self && <span className="ml-2 text-[10px] text-mcz-gold">you</span>}
                </div>
                <div className="text-[11px] text-white/50">{m.persona}</div>
              </div>
              {m.looking === "romance"
                ? <span className="pill !border-mcz-pink/40 !text-mcz-pink"><Heart size={10} className="inline" /> Romance</span>
                : <span className="pill !border-mcz-cyan/40 !text-mcz-cyan">Collab</span>}
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
