import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "../api.js";
import { goToTab } from "../goto.js";

// Today's detailed horoscope for a sign. Written once a day per sign by the
// server (apps/economy/metricz.py) and free — the "free" is stated, because a
// member pressing something should know whether it costs them.
//
// Anything that shows a sign can open it: `openHoroscope("Leo")` from
// anywhere, or wrap the sign in <SignLink>. The panel is mounted once in App.

export function openHoroscope(sign) {
  if (sign) window.dispatchEvent(new CustomEvent("mcz-horoscope", { detail: sign }));
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
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const h = (e) => setSign(e.detail);
    window.addEventListener("mcz-horoscope", h);
    return () => window.removeEventListener("mcz-horoscope", h);
  }, []);

  useEffect(() => {
    if (!sign) return;
    setD(null); setErr("");
    api(`/api/economy/horoscope/${encodeURIComponent(sign)}/`)
      .then(setD).catch((e) => setErr(e.message || "Today's reading isn't ready — try again in a minute."));
  }, [sign]);

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
            <p className="text-xs text-white/50">{d?.dates}{d?.day ? ` · ${new Date(d.day + "T12:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}` : ""}</p>
          </div>
          <button className="rounded-lg p-1 text-white/50 hover:text-white" onClick={() => setSign(null)} aria-label="Close"><X size={18} /></button>
        </div>

        {!d && !err && <p className="mt-4 flex items-center gap-2 text-sm text-white/60"><Loader2 className="animate-spin" size={14} /> Reading the stars…</p>}
        {err && <p className="mt-4 text-sm text-mcz-ember">{err}</p>}

        {r && (
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
          <span><span className="text-emerald-300">Free</span> · {d?.note || "A reading for today, not a forecast."}</span>
          <button className="re-link" onClick={() => { setSign(null); try { sessionStorage.setItem("mcz_zodiacz_sign", sign); } catch { /* still opens ZodiacZ */ } goToTab("zodiacz"); }}>
            {sign} members →
          </button>
        </div>
      </div>
    </div>
  );
}
