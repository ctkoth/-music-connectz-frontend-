import { useEffect, useState } from "react";
import { Loader2, Save, Star, Zap, Gift, Copy, Check, Users } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { loadSocial, saveSocial, NATIONALITIES } from "./socialData.js";

const PERSONAS = [
  ["arscout", "A&R Scout", "personaz_arscout.png"],
  ["designer", "Designer", "personaz_designer.png"],
  ["developer", "Developer", "personaz_developer.png"],
  ["director", "Director", "personaz_director.webp"],
  ["ghostwriter", "GhostWriter", "personaz_ghostwriter.png"],
  ["indieartist", "Indie Artist", "personaz_indieartist.png"],
  ["manager", "Manager", "personaz_manager.png"],
  ["mime", "Mime", "personaz_mime.png"],
  ["mixengineer", "Mix Engineer", "personaz_mixengineer.png"],
  ["producer", "Producer", "personaz_producer.png"],
  ["videographer", "Videographer", "personaz_videographer.png"],
];
const ZODIAC_EMOJI = { Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",
  Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓" };

// Premium ICONS (cosmetic art), independent of whether the PersonaZ is premium.
const PREMIUM_ICONS = new Set(["personaz_designer.png"]);

export default function ProfileZ() {
  const [me, setMe] = useState(null);
  const [sel, setSel] = useState([]);
  const [birthday, setBirthday] = useState("");
  const [nats, setNats] = useState(() => loadSocial().profile?.nationalities || []);
  const [ref, setRef] = useState(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/auth/me/").then((d) => {
      setMe(d); setSel(d.personas || []); setBirthday(d.birthday || "");
      if (Array.isArray(d.nationalities) && d.nationalities.length) setNats(d.nationalities);
    }).catch((e) => setMsg(e.message));
    api("/api/auth/referrals/").then(setRef).catch(() => {});
  }, []);

  const refLink = ref ? `${window.location.origin}/register?ref=${encodeURIComponent(ref.code)}` : "";
  function copyRef() {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  function toggle(key) {
    setSel((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  function toggleNat(name) {
    setNats((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }

  async function save() {
    setBusy(true); setMsg("");
    // Mirror the public profile into the shared social store so Social ConnectZ
    // can surface & heritage-filter this user immediately.
    saveSocial({
      ...loadSocial(),
      profile: {
        user: me?.username, persona: sel[0] || "Creator",
        icon: "personaz.png", nationalities: nats, looking: "collab",
      },
    });
    try {
      const d = await api("/api/auth/me/", {
        method: "PATCH",
        body: { personas: sel, birthday: birthday || null, nationalities: nats },
      });
      setMe(d); setMsg("Saved! PersonaZ, ZodiacZ & NationalitieZ are set.");
    } catch (e) {
      // Backend may not persist nationalities yet — local heritage still saved.
      setMsg("Saved locally. NationalitieZ now filterable on Social ConnectZ.");
    } finally { setBusy(false); }
  }

  if (!me) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="personaz.png" alt="ProfileZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#ffcf3f" }}>{me.username}</h2>
          <p className="flex flex-wrap gap-2 pt-1 text-sm">
            <span className="pill uppercase !text-mcz-cyan">{me.tier} tier</span>
            {me.zodiac && <span className="pill">{ZODIAC_EMOJI[me.zodiac]} {me.zodiac}</span>}
            <span className="pill !text-mcz-gold"><Zap size={11} className="inline" /> {me.energy} Energy</span>
            <span className="pill !text-mcz-pink"><Star size={11} className="inline" /> {me.spinaz} SpinaZ</span>
          </p>
        </div>
      </header>

      {/* ReferZ — invite links + referred members */}
      <div className="neon-frame space-y-3 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Gift size={13} className="text-mcz-ember" /> ReferZ
          <span className="ml-auto flex items-center gap-1 text-mcz-pink">
            <IconImg icon="spinaz.png" alt="" className="h-4 w-4 rounded-full" />
            +{ref?.reward_per_join ?? 300} SpinaZ / legit join
          </span>
        </p>
        <p className="text-[11px] text-white/40">Share your link. You earn SpinaZ every time someone new joins with it.</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={refLink || "Loading your link…"}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white/80 outline-none"
          />
          <button className="re-btn !w-auto px-3" onClick={copyRef} disabled={!refLink}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="pill"><Users size={11} className="inline" /> {ref?.count ?? 0} referred</span>
          <span className="pill !text-mcz-pink"><Star size={11} className="inline" /> {ref?.spinaz_earned ?? 0} SpinaZ earned</span>
        </div>
        {ref?.members?.length > 0 && (
          <div className="space-y-1 border-t border-white/[0.06] pt-2">
            {ref.members.map((m) => (
              <div key={m.username} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{m.username}</span>
                <span className="text-[11px] text-white/40">
                  {new Date(m.joined).toLocaleDateString()} · +{m.reward} SpinaZ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="neon-frame space-y-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">ZodiacZ — birthday</p>
        <input type="date" className="neon-input !w-auto" value={birthday || ""} onChange={(e) => setBirthday(e.target.value)} />
        <p className="text-xs text-white/40">Your sign auto-detects from your birthday. Only the sign shows publicly.</p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          Your PersonaZ — pick every role you play ({sel.length} selected)
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {PERSONAS.map(([key, label, icon]) => (
            <button key={key} onClick={() => toggle(key)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                sel.includes(key)
                  ? "border-mcz-gold/70 bg-mcz-gold/10 shadow-neon"
                  : "border-white/10 bg-black/30 hover:bg-white/5"
              }`}>
              <span className="relative">
                <IconImg icon={icon} alt={label} className="h-14 w-14 rounded-full object-cover" />
                {PREMIUM_ICONS.has(icon) && (
                  <span className="absolute -bottom-1 -right-1 rounded-md bg-mcz-ember px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white shadow-neon">
                    Premium
                  </span>
                )}
              </span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <IconImg icon="nationalitiez.png" alt="" className="h-5 w-5 rounded" />
          NationalitieZ — your heritage ({nats.length} selected)
        </p>
        <p className="mb-2 text-[11px] text-white/40">
          Represent your ancestry. Selections become a filterable metric on Social ConnectZ.
        </p>
        <div className="flex flex-wrap gap-2">
          {NATIONALITIES.map(([flag, name]) => (
            <button
              key={name}
              onClick={() => toggleNat(name)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                nats.includes(name)
                  ? "border-mcz-pink/70 bg-mcz-pink/15 text-white shadow-neon"
                  : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"
              }`}
            >
              {flag} {name}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}
      <button className="neon-btn-primary !w-auto px-6" disabled={busy} onClick={save}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save ProfileZ
      </button>
    </div>
  );
}
