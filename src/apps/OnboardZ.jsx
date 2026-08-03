import { useEffect, useState } from "react";
import { Gift, Copy, Check, User, Star, Send, ArrowRight, PartyPopper, Cake, Info, Swords, ChevronDown, Compass } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { startTour } from "../Tour.jsx";
import { goToSpot } from "../goto.js";

// Guided first session. Steps derive "done" from real account state where
// possible (personas / nationalities / referral count); action-only steps track
// completion locally.
//
// Every step carries `tab` + `target`: the app it's done in and the data-tour
// anchor on the exact control. Its link opens that app and lands on the field,
// so "add your NationalitieZ" ends on the NationalitieZ search box rather than
// at the top of ProfileZ with the member left to find it.
const OB_KEY = "mcz_onboard_v1";
const loadDone = () => { try { return JSON.parse(localStorage.getItem(OB_KEY)) || {}; } catch { return {}; } };

// The framing. Music ConnectZ is not RPG-themed — it is built on RPG
// mechanics, and every line below describes something the server actually
// computes. Saying so up front is what makes the rest of OnboardZ make sense.
const SYSTEM = [
  ["PersonaZ are your classes",
   "And multiclass is the point. Producer and GhostWriter and Mix Engineer — every class you claim is another way somebody finds you. One class is a smaller surface, not a purer one."],
  ["Experience is time served, not grind",
   "Each skill on a PersonaZ carries the date you started it. Your experience is measured from that date, so it counts the years you have genuinely put in. There is no way to farm it in a weekend, which is exactly why it is worth showing."],
  ["Energy is mana, and it regenerates",
   "Hourly, on its own, at your median reach divided by your tier — Free ÷10, Premium ÷5, StatZ ÷1. Energy runs the AI tools. Rating other people's work tops it up on top of that."],
  ["SpinaZ is coin",
   "Earned by rating, referring, and watching AdZ or clearing OfferZ. Spent on the things tiers gate."],
  ["SkillZ are the skill trees",
   "SingZ and RapZ each track a level, XP, a daily streak and badges, with their own leaderboard. Drills are the quests."],
  ["Your tier is your rank",
   "Free → Premium → StatZ. It buys lower platform fees, faster Energy, and daily AI prompts — 1, then 5, then 20."],
  ["ZodiacZ and NationalitieZ are your origin",
   "Neither is cosmetic. Both are live filters on Social ConnectZ, which makes them how your people find you."],
  ["BattleZ is PvP, CollabZ is co-op, GroupZ and LabelZ are guilds",
   "And your ratings are your visible stats — given by other players, never by you. You cannot score your own work."],
];

function SystemCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="re-card">
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <Swords size={18} className="mt-0.5 shrink-0 text-mcz-ember" />
        <span className="flex-1">
          <span className="block text-sm font-bold text-white">
            Music ConnectZ runs like an RPG
          </span>
          <span className="block text-[12px] text-white/50">
            Not as a theme — as the actual system. Here's the map.
          </span>
        </span>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2.5 border-l-2 border-mcz-ember/30 pl-3">
          {SYSTEM.map(([term, body]) => (
            <p key={term} className="text-[12px] leading-relaxed text-white/60">
              <span className="font-bold text-mcz-ember">{term}.</span> {body}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

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
      what: "Your classes. Every PersonaZ you actually play — Producer, GhostWriter, Mix Engineer, A&R Scout, Director, all of them.",
      why: "This is character creation, and multiclass is the point. Somebody hunting a mix engineer filters for that class — if you never claimed it, you do not exist to them. Each skill you add carries a start date, and that date is where your experience comes from, so claiming a class you have played for a decade is worth a decade. Claim every hat you wear.",
      how: "Open ProfileZ, tap every PersonaZ that fits, tap again to drop one. Date the skills under each one — that is what turns a class into years of experience. Premium can swap the artwork; the class itself is free either way.",
      done: (me?.personas?.length || 0) > 0,
      tab: "profilez", target: "personas", cta: "Open the PersonaZ picker" },

    { key: "birthday", icon: <Cake size={18} />, title: "Add your birthday", bday: true,
      desc: "Sets your ZodiacZ and keeps ads age-appropriate. You must be 13+ to use Music ConnectZ.",
      what: "Your date of birth, entered once.",
      why: "Your origin, and two real jobs. It sets your ZodiacZ, which is a live filter on Social ConnectZ — people genuinely search by sign. And it keeps AdZ honest: 13+ to be here at all, 18+ before any ad gets personalized. Only the sign is public. The date itself stays yours.",
      how: "Pick the date below and hit Save. Your ZodiacZ shows up the second it lands.",
      done: !!me?.birthday,
      tab: "onboardz", target: "birthday", cta: "Jump to the date picker" },

    { key: "heritage", icon: <IconImg icon="nationalitiez.png" alt="" className="h-5 w-5 rounded" />,
      title: "Add your NationalitieZ",
      desc: "Represent your ancestry — it makes you findable on Social ConnectZ.",
      what: "The heritage you represent. As many as are genuinely yours — mixed is normal here.",
      why: "The other half of your origin, and a live filter on Social ConnectZ — which makes it a way to find your people. Diaspora finds diaspora, and collabs come out of that. This is representation, not gatekeeping. Nobody is checking your paperwork.",
      how: "ProfileZ, scroll to NationalitieZ, tap every flag that's yours.",
      done: (me?.nationalities?.length || 0) > 0,
      tab: "profilez", target: "nationalities", cta: "Open NationalitieZ" },

    { key: "post", icon: <Send size={18} />, title: "Drop your first PostZ",
      desc: "Share a track, bars or cover — the community rates it after 30s.",
      what: "Your first piece of work on the platform. A track, bars, cover art, a collab call — whatever you've got.",
      why: "PostZ is the front door, and your posts are what everything else hangs off. Rating opens 30 seconds after you post and comments at 60 — that delay exists so nobody can dogpile a track they have not listened to yet. You cannot score your own, which is the whole reason the number is worth anything.",
      how: "PostZ tab, drop it in the box, pick a genre, hit Post. Your char limit goes up with your tier.",
      done: !!done.post,
      tab: "postz", target: "composer", cta: "Open the PostZ composer",
      onGo: () => mark("post") },

    { key: "rate", icon: <Star size={18} />, title: "Rate 3 tracks",
      desc: "Every rating you give earns +1 Energy.",
      what: "Score three other people's PostZ, 1 to 10.",
      why: "+1 Energy each — mana, on top of what regenerates hourly, and Energy is what runs the AI tools. But that is the small reason. The real one: stats only exist because other players hand them out. A feed where everybody posts and nobody scores is just noise. Rate honestly and you get rated honestly.",
      how: "PostZ tab, find any post that isn't yours and is at least 30 seconds old, tap the score.",
      done: !!done.rate,
      tab: "postz", target: "feed", cta: "Open the feed and rate",
      onGo: () => mark("rate") },

    { key: "refer", icon: <Gift size={18} />, title: "Refer a friend", refer: true,
      desc: `Earn ${ref?.reward_per_join ?? 300} SpinaZ for every legit join.`,
      what: "Your personal invite link. Your username is the code.",
      why: `${ref?.reward_per_join ?? 300} SpinaZ every time someone joins on it, and they land with a welcome drop too — both sides come out ahead. A world is worth exactly as much as the people in it, so bringing one real person beats any amount of grinding.`,
      how: "Copy the link below and send it. The SpinaZ credit when they finish signing up — legit joins only, so don't bother with burner accounts.",
      done: (ref?.count || 0) > 0 || !!done.refer,
      tab: "onboardz", target: "refer", cta: "Jump to your invite link" },
  ];

  // Every step's link opens the app the task lives in and lands on the control.
  const go = (s) => { s.onGo?.(); goToSpot(s.tab, s.target); };

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

      <SystemCard />

      <button onClick={startTour}
        className="neon-btn-primary !w-auto px-5"
        title="Walk me through it">
        <Compass size={16} /> Take the guided tour
      </button>

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
                  <div data-tour="refer" className="mt-2 space-y-2">
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

                {/* Birthday step: inline date picker + save. The anchor wraps
                    both states so its link still has something to land on
                    once the date is saved. */}
                {s.bday && (
                  <div data-tour="birthday">
                    {!s.done ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input type="date" value={bday} max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBday(e.target.value)}
                          className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white/80 outline-none" />
                        <button className="re-btn !w-auto px-3" onClick={saveBday} disabled={!bday || savingBday}>
                          {savingBday ? "…" : "Save"}
                        </button>
                      </div>
                    ) : me?.zodiac ? (
                      <p className="mt-1 text-[11px] text-mcz-ember">Your ZodiacZ: {me.zodiac}</p>
                    ) : null}
                  </div>
                )}

                {/* The link to where the task is actually done. It stays after
                    the step is finished — a done step is still somewhere you
                    go back to — just dimmed so it reads as optional. */}
                {s.tab && (
                  <button
                    className={`mt-2 flex items-center gap-1 text-xs font-semibold hover:brightness-125 ${
                      s.done ? "text-white/40 hover:text-mcz-ember" : "text-mcz-ember"}`}
                    onClick={() => go(s)}>
                    {s.done ? "Open it again" : s.cta} <ArrowRight size={13} />
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
