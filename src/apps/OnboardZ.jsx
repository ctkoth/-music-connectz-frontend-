import { useEffect, useState } from "react";
import { Gift, Copy, Check, User, Star, Send, ArrowRight, PartyPopper } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

// Guided first session. Steps derive "done" from real account state where
// possible (personas / nationalities / referral count); action-only steps track
// completion locally.
const OB_KEY = "mcz_onboard_v1";
const loadDone = () => { try { return JSON.parse(localStorage.getItem(OB_KEY)) || {}; } catch { return {}; } };
const goTo = (k) => window.dispatchEvent(new CustomEvent("mcz-goto-tab", { detail: k }));

export default function OnboardZ() {
  const [me, setMe] = useState(null);
  const [ref, setRef] = useState(null);
  const [done, setDone] = useState(loadDone);
  const [copied, setCopied] = useState(false);
  const [claim, setClaim] = useState(null); // OnboardZ completion reward result

  useEffect(() => {
    api("/api/auth/me/").then(setMe).catch(() => setMe({}));
    api("/api/auth/referrals/").then(setRef).catch(() => {});
  }, []);

  function mark(k) {
    const d = { ...loadDone(), [k]: true };
    localStorage.setItem(OB_KEY, JSON.stringify(d));
    setDone(d);
  }

  const refLink = ref ? `${window.location.origin}/register?ref=${encodeURIComponent(ref.code)}` : "";
  function copyRef() {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink).then(() => {
      mark("refer"); setCopied(true); setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  const steps = [
    { key: "profile", icon: <User size={18} />, title: "Set up your ProfileZ",
      desc: "Pick every PersonaZ you play and set your ZodiacZ.",
      done: (me?.personas?.length || 0) > 0, cta: "Open ProfileZ", act: () => goTo("profilez") },
    { key: "heritage", icon: <IconImg icon="nationalitiez.png" alt="" className="h-5 w-5 rounded" />,
      title: "Add your NationalitieZ",
      desc: "Represent your ancestry — it makes you findable on Social ConnectZ.",
      done: (me?.nationalities?.length || 0) > 0, cta: "Open ProfileZ", act: () => goTo("profilez") },
    { key: "post", icon: <Send size={18} />, title: "Drop your first PostZ",
      desc: "Share a track, bars or cover — the community rates it after 30s.",
      done: !!done.post, cta: "Go to PostZ", act: () => { mark("post"); goTo("postz"); } },
    { key: "rate", icon: <Star size={18} />, title: "Rate 3 tracks",
      desc: "Every rating you give earns +1 Energy.",
      done: !!done.rate, cta: "Rate now", act: () => { mark("rate"); goTo("postz"); } },
    { key: "refer", icon: <Gift size={18} />, title: "Refer a friend", refer: true,
      desc: `Earn ${ref?.reward_per_join ?? 300} SpinaZ for every legit join.`,
      done: (ref?.count || 0) > 0 || !!done.refer },
  ];
  const complete = steps.filter((s) => s.done).length;
  const allDone = complete === steps.length;

  // Claim the one-time completion reward the moment every step is done.
  useEffect(() => {
    if (allDone && me && !me.onboarded && !claim) {
      api("/api/auth/onboard/complete/", { method: "POST" })
        .then(setClaim).catch(() => {});
    }
  }, [allDone, me, claim]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="onboardz.png" alt="OnboardZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">OnboardZ</h2>
          <p className="text-xs text-white/45">Your guided first session — {complete}/{steps.length} done.</p>
        </div>
      </header>

      {/* Progress */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-mcz-ember transition-all"
             style={{ width: `${(complete / steps.length) * 100}%` }} />
      </div>

      {allDone && (
        <div className="flex items-center gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-4 py-2 text-sm text-mcz-ember">
          <PartyPopper size={16} />
          {claim?.granted
            ? <span>You're all set — <span className="font-semibold">+{claim.reward_spinaz} SpinaZ · +{claim.reward_energy} Energy</span> claimed!</span>
            : <span>You're all set — welcome to Music ConnectZ.</span>}
        </div>
      )}

      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.key} className={`re-card ${s.done ? "opacity-70" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                s.done ? "bg-mcz-ember/20 text-mcz-ember" : "bg-white/[0.06] text-white/70"}`}>
                {s.done ? <Check size={18} /> : s.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  {s.title}
                  {s.refer && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-mcz-pink">
                      <IconImg icon="spinaz.png" alt="" className="h-3.5 w-3.5 rounded-full" />
                      +{ref?.reward_per_join ?? 300}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-white/50">{s.desc}</p>

                {/* Refer step: inline invite link + stats */}
                {s.refer && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input readOnly value={refLink || "Loading your link…"}
                        onFocus={(e) => e.target.select()}
                        className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white/80 outline-none" />
                      <button className="re-btn !w-auto px-3" onClick={copyRef} disabled={!refLink}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="text-[11px] text-white/45">
                      {ref?.count ?? 0} joined · {ref?.spinaz_earned ?? 0} SpinaZ earned
                    </div>
                  </div>
                )}

                {/* Action steps */}
                {!s.refer && !s.done && (
                  <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-mcz-ember hover:brightness-125"
                          onClick={s.act}>
                    {s.cta} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
