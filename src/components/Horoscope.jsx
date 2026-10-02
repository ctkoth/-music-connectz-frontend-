import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "../api.js";
import { goToTab } from "../goto.js";
import { StatzSample } from "./StatzSample.jsx";

// Today's detailed horoscope for a sign. Written once a day per sign by the
// server (apps/economy/metricz.py) and free — the "free" is stated, because a
// member pressing something should know whether it costs them.
//
// Anything that shows a sign can open it: `openHoroscope("Leo")` from
// anywhere, or wrap the sign in <SignLink>. The panel is mounted once in App.

export function openHoroscope(sign, level = "basic") {
  if (sign) window.dispatchEvent(new CustomEvent("mcz-horoscope", { detail: { sign, level } }));
}

/** A member's sign as a button that opens today's reading for it. */
export function SignLink({ sign, emoji, className = "pill" }) {
  if (!sign) return null;
  return (
    <button type="button" className={`${className} hover:border-mcz-gold/60 hover:text-mcz-gold`}
      title={`Today's ${sign} horoscope`}
      onClick={(e) => { e.stopPropagation(); openHoroscope(sign); }}>
      {emoji ? `${emoji} ` : ""}{sign}
    </button>
  );
}

const SECTIONS = [
  ["overview", "Today", "✨"], ["love", "Love", "💞"], ["music", "Music & work", "🎵"],
  ["money", "Money", "💵"], ["wellbeing", "Wellbeing", "🌿"],
];

export function HoroscopeLayer() {
  const [sign, setSign] = useState(null);
  const [level, setLevel] = useState("basic");
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [locked, setLocked] = useState(false);
  const [withSign, setWithSign] = useState("");

  useEffect(() => {
    const h = (e) => {
      const v = typeof e.detail === "string" ? { sign: e.detail } : e.detail;
      setSign(v.sign); setLevel(v.level || "basic");
    };
    window.addEventListener("mcz-horoscope", h);
    return () => window.removeEventListener("mcz-horoscope", h);
  }, []);

  useEffect(() => {
    if (!sign) return;
    setD(null); setErr(""); setLocked(false);
    const q = new URLSearchParams();
    if (level === "advanced") q.set("level", "advanced");
    if (withSign) q.set("with", withSign);
    api(`/api/economy/horoscope/${encodeURIComponent(sign)}/${q.toString() ? `?${q}` : ""}`)
      .then(setD)
      .catch((e) => {
        if (e.status === 403) setLocked(e.message || true);
        else setErr(e.message || "Today's reading isn't ready — try again in a minute.");
      });
  }, [sign, level, withSign]);

  if (!sign) return null;
  const r = d?.reading;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => setSign(null)}>
      <div className="mcz-reveal max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-mcz-gold/30 bg-[#0b0712] p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-extrabold text-mcz-gold">{d?.emoji} {sign}</h3>
            <p className="text-xs text-white/50">{d?.dates}{d?.element ? ` · ${d.element}` : ""}{d?.day ? ` · ${new Date(d.day + "T12:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}` : ""}</p>
          </div>
          <button className="rounded-lg p-1 text-white/50 hover:text-white" onClick={() => setSign(null)} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Reading">
          {[["basic", "Daily"], ["advanced", "Advanced · StatZ"]].map(([k, l]) => (
            <button key={k} role="radio" aria-checked={level === k} onClick={() => setLevel(k)}
              className={`rounded-full border px-3 py-1 text-xs ${level === k ? "border-mcz-gold bg-mcz-gold/15 text-mcz-gold" : "border-white/15 text-white/60"}`}>
              {l}
            </button>
          ))}
        </div>

        {locked && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-white/70">{typeof locked === "string" ? locked : "The advanced reading is a StatZ feature."}</p>
            <StatzSample what="The advanced horoscope" />
          </div>
        )}
        {d?.about && <p className="mt-3 text-sm italic leading-relaxed text-white/75">{d.about}</p>}

        {/* Compatibility — v2.2's element read on two SIGNS. It is never shown
            on a person or used to rank anybody; it is a horoscope answer. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/50">How {sign} gets on with</span>
          <select className="neon-input !w-auto !py-1 text-xs" value={withSign} onChange={(e) => setWithSign(e.target.value)}>
            <option value="">— pick a sign —</option>
            {["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        {d?.compatibility && (
          <div className="mt-2 rounded-lg border border-white/10 bg-black/30 p-2 text-xs">
            <p className="font-semibold text-mcz-gold">{d.compatibility.a} ({d.compatibility.element_a}) + {d.compatibility.b} ({d.compatibility.element_b}) · {d.compatibility.score}/{d.compatibility.out_of}</p>
            <p className="mt-0.5 text-white/70">{d.compatibility.note}</p>
          </div>
        )}

        {!d && !err && !locked && <p className="mt-4 flex items-center gap-2 text-sm text-white/60"><Loader2 className="animate-spin" size={14} /> Reading the stars…</p>}
        {err && <p className="mt-4 text-sm text-mcz-ember">{err}</p>}

        {r && level === "advanced" && r.week && (
          <div className="mt-4 space-y-3">
            {[["love_single", "Love · single", "💘"], ["love_partnered", "Love · taken", "💞"],
              ["money_earning", "Money · earning", "💵"], ["money_spending", "Money · spending", "🧾"],
              ["career", "Your music career", "🎵"]].map(([k, label, icon]) => (
              <div key={k}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">{icon} {label}</p>
                <p className="text-sm leading-relaxed text-white/85">{r[k]}</p>
              </div>
            ))}
            {r.collab_signs?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">🤝 Create with today</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {r.collab_signs.map((x) => (
                    <button key={x} className="pill hover:text-mcz-gold" onClick={() => { setSign(null); try { sessionStorage.setItem("mcz_zodiacz_sign", x); } catch { /* opens ZodiacZ anyway */ } goToTab("zodiacz"); }}>
                      {x} members →
                    </button>
                  ))}
                </div>
                {r.collab_why && <p className="mt-1 text-xs text-white/60">{r.collab_why}</p>}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {r.power_hours && <span className="pill">⏰ Create {r.power_hours}</span>}
              {r.friction_sign && <span className="pill">🌀 Go gently with {r.friction_sign}</span>}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">📅 The week ahead</p>
              <ol className="mt-1 space-y-1 text-sm text-white/80">
                {r.week.map((line, i) => {
                  const day = new Date((d.day || "") + "T12:00"); day.setDate(day.getDate() + i);
                  return <li key={i}><span className="mr-2 text-white/45">{day.toLocaleDateString([], { weekday: "short" })}</span>{line}</li>;
                })}
              </ol>
            </div>
            <p className="text-sm text-white/85"><span className="text-white/45">🎯 Challenge · </span>{r.challenge}</p>
            <p className="text-sm italic text-mcz-gold">“{r.affirmation}”</p>
          </div>
        )}

        {r && level === "basic" && (
          <div className="mt-4 space-y-3">
            {SECTIONS.map(([k, label, icon]) => r[k] && (
              <div key={k}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">{icon} {label}</p>
                <p className="text-sm leading-relaxed text-white/85">{r[k]}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              {r.mood && <span className="pill">Mood · {r.mood}</span>}
              {r.lucky_color && <span className="pill">Colour · {r.lucky_color}</span>}
              {r.lucky_number && <span className="pill">Number · {r.lucky_number}</span>}
              {r.best_match && (
                <button className="pill hover:text-mcz-gold" onClick={() => setSign(r.best_match)}>Best match · {r.best_match}</button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-white/45">
          <span>{level === "basic" ? <span className="text-emerald-300">Free</span> : <span className="text-mcz-gold">StatZ</span>}
            {d?.reading?.source === "house" ? " · Corey's house reading for today" : ""} · {d?.note || "A reading for today, not a forecast."}</span>
          <button className="re-link" onClick={() => { setSign(null); try { sessionStorage.setItem("mcz_zodiacz_sign", sign); } catch { /* still opens ZodiacZ */ } goToTab("zodiacz"); }}>
            {sign} members →
          </button>
        </div>
      </div>
    </div>
  );
}
