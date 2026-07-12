import { useEffect, useState } from "react";
import { Loader2, Save, Star, Zap } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

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

export default function ProfileZ() {
  const [me, setMe] = useState(null);
  const [sel, setSel] = useState([]);
  const [birthday, setBirthday] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/auth/me/").then((d) => {
      setMe(d); setSel(d.personas || []); setBirthday(d.birthday || "");
    }).catch((e) => setMsg(e.message));
  }, []);

  function toggle(key) {
    setSel((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function save() {
    setBusy(true); setMsg("");
    try {
      const d = await api("/api/auth/me/", { method: "PATCH", body: { personas: sel, birthday: birthday || null } });
      setMe(d); setMsg("Saved! Your PersonaZ and ZodiacZ are set.");
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
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
              <IconImg icon={icon} alt={label} className="h-14 w-14 rounded-full object-cover" />
              <span className="text-xs">{label}</span>
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
