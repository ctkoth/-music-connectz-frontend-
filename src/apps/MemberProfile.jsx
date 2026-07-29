// A member's public profile, shown as a modal.
//
// Opened by tapping someone in the online list on the CommunityBar. Reads the
// same payload Social ConnectZ uses, so whatever a member fills in on ProfileZ
// shows up here.
import { useEffect, useState } from "react";
import { Loader2, MapPin, Star, Users, X } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

function Pill({ children, className = "" }) {
  return <span className={`pill ${className}`}>{children}</span>;
}

export default function MemberProfile({ username, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let on = true;
    setData(null);
    setError("");
    api(`/api/economy/members/${encodeURIComponent(username)}/`)
      .then((d) => on && setData(d))
      .catch((e) => on && setError(e.message));
    return () => { on = false; };
  }, [username]);

  // Escape closes, matching every other modal in the app.
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="neon-frame max-h-[85vh] w-full max-w-md overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {data?.avatar ? (
              <img src={data.avatar} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-neon" />
            ) : (
              <IconImg icon="personaz.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl shadow-neon" />
            )}
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-extrabold">
                {data?.display_name || username}
              </h3>
              <p className="truncate text-xs text-white/45">@{username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {!data && !error && (
          <p className="flex items-center gap-2 py-6 text-white/50">
            <Loader2 className="animate-spin" size={16} /> Loading profile…
          </p>
        )}
        {error && <p className="py-4 text-sm text-mcz-pink">{error}</p>}

        {data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {data.tier && <Pill className="uppercase !text-mcz-cyan">{data.tier}</Pill>}
              {data.sign && <Pill>{data.sign}</Pill>}
              {data.age != null && <Pill>{data.age}</Pill>}
              {data.gender && <Pill>{data.gender}</Pill>}
              {data.founding && <Pill className="!text-mcz-gold">Founding</Pill>}
              {data.verified_18plus && <Pill className="!text-emerald-300">18+ verified</Pill>}
            </div>

            {data.location && (
              <p className="flex items-center gap-1.5 text-sm text-white/60">
                <MapPin size={14} className="text-mcz-cyan" /> {data.location}
              </p>
            )}

            {data.bio && <p className="text-sm leading-relaxed text-white/75">{data.bio}</p>}

            <div className="flex flex-wrap gap-2 text-xs">
              <Pill><Users size={11} className="inline" /> {data.followers ?? 0} followers</Pill>
              <Pill>{data.following ?? 0} following</Pill>
              {data.overall != null && (
                <Pill className="!text-mcz-gold"><Star size={11} className="inline" /> {data.overall} overall</Pill>
              )}
            </div>

            {data.personas?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">PersonaZ</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.personas.map((p) => <Pill key={p}>{p}</Pill>)}
                </div>
              </div>
            )}

            {data.nationalities?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">NationalitieZ</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.nationalities.map((n) => <Pill key={n}>{n}</Pill>)}
                </div>
              </div>
            )}

            {data.links?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">Links</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                       className="pill hover:!text-mcz-cyan">
                      {l.label || l.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {data.mine && (
              <p className="text-[11px] text-white/35">This is you — edit any of it in ProfileZ.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
