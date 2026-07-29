import { useEffect, useState } from "react";
import { Gift, Copy, Check, User, Star, Send, ArrowRight, PartyPopper, Cake, Info } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

// Guided first session. Steps derive "done" from real account state where
// possible (personas / nationalities / referral count); action-only steps track
// completion locally.
const OB_KEY = "mcz_onboard_v1";
const loadDone = () => { try { return JSON.parse(localStorage.getItem(OB_KEY)) || {}; } catch { return {}; } };
const goTo = (k) => window.dispatchEvent(new CustomEvent("mcz-goto-tab", { detail: k }));

function Detail({ label, children }) {
  return (
    <p className="text-[12px] leading-relaxed text-white/60">
      <span className="mr-1.5 font-bold uppercase tracking-wider text-mcz-ember">{label}</span>
      {children}
    </p>
  );
}

export default function OnboardZ() {
  const [me, setMe] = useState(null);
  const [ref, setRef] = useState(null);
  const [done, setDone] = useState(loadDone);
  const [copied, setCopied] = useState(false);
  const [claim, setClaim] = useState(null); // OnboardZ completion reward result
  const [bday, setBday] = useState("");
  const [savingBday, setSavingBday] = useState(false);
  // Per-step override for the what/why/how block. Unset means "use the
  // default": a step you have not finished explains itself, a finished one
  // folds away. Toggling one step must not touch any other.
  const [detailOpen, setDetailOpen] = useState({});
  const isOpen = (s) => detailOpen[s.key] ?? !s.done;

  useEffect(() => {
    api("/api/auth/me/").then((d) => { setMe(d); setBday(d?.birthday || ""); }).catch(() => setMe({}));
    api("/api/auth/referrals/").then(setRef).catch(() => {});
  }, []);

  async function saveBday() {
    if (!bday) return;
    setSavingBday(true);
    try {
      const d = await api("/api/auth/me/", { method: "PATCH", body: { birthday: bday } });
      setMe(d);
    } catch { /* ignore — the field stays for a retry */ }
    setSavingBday(false);
  }

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
      what: "Every PersonaZ you actually play — Producer, GhostWriter, Mix Engineer, A&R Scout, Director, all of them.",
      why: "PersonaZ is how the right people find you. Somebody hunting a mix engineer filters for one — if you never claimed it, you don't exist to them. Claim every hat you wear. Nobody on here is only one thing, and pretending you are just costs you work.",
      how: "Open ProfileZ, tap every PersonaZ that fits, tap again to drop one. Premium members can swap the artwork too — the PersonaZ itself is free either way.",
      done: (me?.personas?.length || 0) > 0, cta: "Open ProfileZ", act: () => goTo("profilez") },

    { key: "birthday", icon: <Cake size={18} />, title: "Add your birthday", bday: true,
      desc: "Sets your ZodiacZ and keeps ads age-appropriate. You must be 13+ to use Music ConnectZ.",
      what: "Your date of birth, entered once.",
      why: "Two jobs. It sets your ZodiacZ, which is a real filter on Social ConnectZ — people do search by sign. And it keeps AdZ honest: 13+ to be here at all, 18+ before any ad gets personalized. Only your sign is public. The date itself stays yours.",
      how: "Pick the date below and hit Save. Your ZodiacZ shows up the second it lands.",
      done: !!me?.birthday },

    { key: "heritage", icon: <IconImg icon="nationalitiez.png" alt="" className="h-5 w-5 rounded" />,
      title: "Add your NationalitieZ",
      desc: "Represent your ancestry — it makes you findable on Social ConnectZ.",
      what: "The heritage you represent. As many as are genuinely yours — mixed is normal here.",
      why: "It's a filter on Social ConnectZ, which makes it a way to find your people. Diaspora finds diaspora, and collabs come out of that. This is about representation, not gatekeeping — nobody is checking your paperwork.",
      how: "ProfileZ, scroll to NationalitieZ, tap every flag that's yours.",
      done: (me?.nationalities?.length || 0) > 0, cta: "Open ProfileZ", act: () => goTo("profilez") },

    { key: "post", icon: <Send size={18} />, title: "Drop your first PostZ",
      desc: "Share a track, bars or cover — the community rates it after 30s.",
      what: "Your first piece of work on the platform. A track, bars, cover art, a collab call — whatever you've got.",
      why: "PostZ is the front door. Everything else on here hangs off your posts. Rating opens 30 seconds after you post and comments at 60 — that delay exists so nobody can dogpile something they haven't listened to yet. And you can't rate your own, so the number means something.",
      how: "PostZ tab, drop it in the box, pick a genre, hit Post. Your char limit goes up with your tier.",
      done: !!done.post, cta: "Go to PostZ", act: () => { mark("post"); goTo("postz"); } },

    { key: "rate", icon: <Star size={18} />, title: "Rate 3 tracks",
      desc: "Every rating you give earns +1 Energy.",
      what: "Score three other people's PostZ, 1 to 10.",
      why: "+1 Energy each, and Energy is what runs the AI tools. But that's the small reason. The real one: ratings are only worth anything if people actually give them. A feed where everybody posts and nobody scores is just noise. Rate honestly and you get rated honestly.",
      how: "PostZ tab, find any post that isn't yours and is at least 30 seconds old, tap the score.",
      done: !!done.rate, cta: "Rate now", act: () => { mark("rate"); goTo("postz"); } },

    { key: "refer", icon: <Gift size={18} />, title: "Refer a friend", refer: true,
      desc: `Earn ${ref?.reward_per_join ?? 300} SpinaZ for every legit join.`,
      what: "Your personal invite link. Your username is the code.",
      why: `${ref?.reward_per_join ?? 300} SpinaZ every time someone joins on it, and they land with a welcome drop too — both sides come out ahead. A platform this size is worth exactly as much as the people on it, so bringing one real person is worth more than any grind.`,
      how: "Copy the link below and send it. The SpinaZ credit when they finish signing up — legit joins only, so don't bother with burner accounts.",
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

                {/* The point of OnboardZ: say what it is, why it's worth doing,
                    and exactly how — not just a checkbox to clear. */}
                {isOpen(s) ? (
                  <div className="mt-2 space-y-1.5 border-l-2 border-mcz-ember/30 pl-3">
                    <Detail label="What">{s.what}</Detail>
                    <Detail label="Why">{s.why}</Detail>
                    <Detail label="How">{s.how}</Detail>
                    <button className="text-[11px] text-white/35 hover:text-white/60"
                            onClick={() => setDetailOpen((d) => ({ ...d, [s.key]: false }))}>
                      Hide the detail
                    </button>
                  </div>
                ) : (
                  <button className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/40 hover:text-mcz-ember"
                          onClick={() => setDetailOpen((d) => ({ ...d, [s.key]: true }))}>
                    <Info size={11} /> What is this, and why?
                  </button>
                )}

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

                {/* Birthday step: inline date picker + save */}
                {s.bday && !s.done && (
                  <div className="mt-2 flex items-center gap-2">
                    <input type="date" value={bday} max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setBday(e.target.value)}
                      className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white/80 outline-none" />
                    <button className="re-btn !w-auto px-3" onClick={saveBday} disabled={!bday || savingBday}>
                      {savingBday ? "…" : "Save"}
                    </button>
                  </div>
                )}
                {s.bday && s.done && me?.zodiac && (
                  <p className="mt-1 text-[11px] text-mcz-ember">Your ZodiacZ: {me.zodiac}</p>
                )}

                {/* Action steps */}
                {!s.refer && !s.bday && !s.done && (
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
