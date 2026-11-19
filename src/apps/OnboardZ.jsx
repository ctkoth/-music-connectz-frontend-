import { useEffect, useState } from "react";
import { celebrate } from "../celebrate.js";
import { Gift, Copy, Check, User, Star, Send, ArrowRight, PartyPopper, Cake, Info, Swords, ChevronDown, Compass } from "lucide-react";
import { api } from "../api.js";
import { useSay } from "../voice.js";
import { P } from "../phrases.js";
import { IconImg } from "../App.jsx";
import { startTour } from "../Tour.jsx";
import { goToSpot } from "../goto.js";
import { SPINAZ, ENERGY } from "../resources.js";
import IntentPicker from "../components/IntentPicker.jsx";
import { handOff } from "../handoff.js";
import { personaSkillRows, skillsStepDone } from "../onboardSkills.js";
import { storedTrialApp } from "../trialToken.js";
import { readSeeds } from "../yourApps.js";
import { coreDone, firstCoach, nextStep, ordered } from "../onboardOrder.js";
import { FOCUS_COACHES } from "../focus.js";

const COACH_NAME = { singz: "SingZ", rapz: "RapZ", guitarz: "GuitarZ", bassz: "BassZ", keyz: "KeyZ", drumz: "DrumZ", violinz: "ViolinZ",
  flutez: "FluteZ", saxz: "SaxZ", clarinetz: "ClarinetZ", trumpetz: "TrumpetZ", producez: "ProduceZ" };

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
  ["Experience is real-world service, not grind",
   "Each skill carries the stretches you actually played it — start, and end if you stopped. Your experience counts what you built with real people, so quitting for ten years does not quietly count as ten years of practice. Service to others is what makes the number worth showing."],
  ["Energy is mana, and it regenerates",
   "Hourly, on its own, at your median reach divided by your tier — Free ÷10, Premium ÷5, StatZ ÷1. Energy runs the AI tools. Rating other people's work tops it up on top of that."],
  [`SpinaZ ${SPINAZ} is coin`,
   "Earned by rating, referring, and watching AdZ or clearing OfferZ. Spent on the things tiers gate."],
  ["SkillZ are the skill trees",
   "SingZ and RapZ each track a level, XP, a daily streak and badges, with their own leaderboard. Drills are the quests."],
  ["Your tier is your rank",
   "Free → Premium → StatZ. It buys lower platform fees, faster Energy, and daily AI prompts — 1, then 5, then 10."],
  ["ZodiacZ and NationalitieZ are your origin",
   "Neither is cosmetic. Both are live filters on Social ConnectZ, which makes them how your people find you."],
  ["BattleZ is PvP, CollabZ is co-op, GroupZ and LabelZ are guilds",
   "Your ratings are your visible stats — given by other players as real feedback, never by you. You cannot score your own work. Every rating you give lifts somebody else's visibility while building your own credibility."],
];

function SystemCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="re-card">
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <Swords size={18} className="mt-0.5 shrink-0 text-mcz-ember" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">
            Level up and connect
          </span>
          <span className="block text-[12px] text-white/50">
            Music ConnectZ runs like an RPG — not as a theme, but as the actual system. Every mechanic serves growth and community both.
          </span>
        </span>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-white/55 transition ${open ? "rotate-180" : ""}`} />
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
  const talk = useSay();
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
  const isOpen = (s) => detailOpen[s.key] ?? false;
  // The first score: which coach it opens (the one they tried, else one they picked, else SingZ) and whether
  // they already have one. `first` is undefined until the server answers, so nothing flashes.
  const [coach, setCoach] = useState(() => firstCoach({ trialApp: storedTrialApp(), seeds: readSeeds() }));
  const [first, setFirst] = useState(undefined);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api("/api/auth/me/").then((d) => { setMe(d); setBday(d?.birthday || ""); }).catch(() => setMe({}));
    api("/api/auth/referrals/").then(setRef).catch(() => {});
    api("/api/auth/onboard/complete/").then((d) => setFirst(d?.first_take || null)).catch(() => setFirst(null));
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
    { key: "score", icon: <Star size={18} />, title: "Get your first score",
      desc: `Free — record or upload 8–15 seconds in ${COACH_NAME[coach]}, and the AI coach scores it out of 10 and says what to fix.`,
      what: "One take, scored by the coach — the number, what worked, and the one thing to fix first.",
      why: "It's the fastest way to find out what this place is for. Everything else here — posts, ratings, battles — is built on takes like this one.",
      how: `Open ${COACH_NAME[coach]}, press Record (or Upload a clip), then Send it to the coach.`,
      done: !!first,
      tab: coach, target: "bosstake-mic", cta: `Get my score in ${COACH_NAME[coach]}`,
      onGo: () => {} },

    { key: "profile", icon: <User size={18} />, title: "Set up your ProfileZ",
      desc: "Pick every PersonaZ you play and set your ZodiacZ.",
      what: "Your classes. Every PersonaZ you actually play — Producer, GhostWriter, Mix Engineer, A&R Scout, Director, all of them.",
      why: "This is character creation, and multiclass is the point. Somebody hunting a mix engineer filters for that class — if you never claimed it, you do not exist to them. Each skill you add carries a start date, and that date is where your experience comes from, so claiming a class you have played for a decade is worth a decade. Claim every hat you wear.",
      how: "Open ProfileZ, tap every PersonaZ that fits, tap again to drop one. Date the skills under each one — that is what turns a class into years of experience. Premium can swap the artwork; the class itself is free either way.",
      done: (me?.personas?.length || 0) > 0,
      tab: "profilez", target: "personas", cta: "Open the PersonaZ picker" },

    { key: "skills", icon: <Star size={18} />, title: "Add your skills, persona by persona", skills: true,
      desc: "Under each PersonaZ you picked, add the skills you have actually learned.",
      what: "The skills you have learned, filed under the persona they belong to — Pro Tools under Mix Engineer, Rapping under Independent Artist — each with the date you learned it.",
      why: "Skills and experience are what Music ConnectZ is built around. Only skills on your profile can be listed on your work, so this is what fills \"Skills used on this\" when you post. Each skill is rated by the posts that used it, with the work linked beside the rating, and its experience is the time since the date you learned it. A best guess at the date is fine.",
      how: "Open PersonaZ, press Skills under a persona, tick what you have learned and add a start date. Do it for each persona you play — one is enough to finish this step, and the rest can wait.",
      done: skillsStepDone(me?.personas),
      tab: "personaz", target: "personaz-skills", cta: "Open PersonaZ" },

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
      desc: `Earn +${ref?.reward_per_join ?? 300} ${SPINAZ} for every legit join.`,
      what: "Your personal invite link. Your username is the code.",
      why: `${ref?.reward_per_join ?? 300} SpinaZ every time someone joins on it, and they land with a welcome drop too — both sides come out ahead. A world is worth exactly as much as the people in it, so bringing one real person beats any amount of grinding.`,
      how: "Copy the link below and send it. The SpinaZ credit when they finish signing up — legit joins only, so don't bother with burner accounts.",
      done: (ref?.count || 0) > 0 || !!done.refer,
      tab: "onboardz", target: "refer", cta: "Jump to your invite link" },
  ];

  // Every step's link opens the app the task lives in and lands on the control.
  const go = (s) => { s.onGo?.(); goToSpot(s.tab, s.target); };

  const complete = steps.filter((s) => s.done).length;
  // The bonus asks for what makes a member stay — a score, a post, ratings — not the profile paperwork.
  const allDone = first !== undefined && coreDone(steps);
  const next = nextStep(steps);
  const rest = ordered(steps).filter((s) => s !== next);

  // Claim the one-time completion reward the moment every step is done.
  useEffect(() => {
    if (allDone && me && !me.onboarded && !claim) {
      api("/api/auth/onboard/complete/", { method: "POST" })
        .then((c) => {
          setClaim(c);
          // Both sides of the reward land at once, so play the coin — the
          // bigger of the two — rather than stacking two sounds on one event.
          if (c?.granted) celebrate("spinaz", Number(c.reward_spinaz) || 0, { label: "onboarding complete!", big: true });
        })
        .catch(() => {});
    }
  }, [allDone, me, claim]);

  const card = (s, lead = false) => (

          <div key={s.key} className={`re-card ${s.done ? "opacity-70" : ""} ${lead ? "!border-mcz-ember/50" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                s.done ? "bg-mcz-ember/20 text-mcz-ember" : "bg-white/[0.06] text-white/70"}`}>
                {s.done ? <Check size={18} /> : s.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
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
                    <button className="text-[11px] text-white/50 hover:text-white/60"
                            onClick={() => setDetailOpen((d) => ({ ...d, [s.key]: false }))}>
                      Hide the detail
                    </button>
                  </div>
                ) : (
                  <button className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-white/55 hover:text-mcz-ember"
                          onClick={() => setDetailOpen((d) => ({ ...d, [s.key]: true }))}>
                    <Info size={11} /> What is this, and why?
                  </button>
                )}

                {/* Skills step: each persona the member holds, how many skills sit under it, and a door
                    that opens THAT persona in PersonaZ. Read from the profile, never inferred. */}
                {s.skills && (
                  <div className="mt-2 space-y-1">
                    {personaSkillRows(me?.personas).length === 0 ? (
                      <p className="text-[11px] text-white/50">Pick your PersonaZ first (the step above), then add skills under each.</p>
                    ) : personaSkillRows(me?.personas).map((r) => (
                      <div key={r.key} className="flex items-center gap-2 text-[12px]">
                        <span className="min-w-0 flex-1 truncate text-white/80">{r.label}</span>
                        <span className={r.count ? "text-emerald-300" : "text-white/60"}>
                          {r.count ? `${r.count} skill${r.count === 1 ? "" : "s"}` : "no skills yet"}
                        </span>
                        <button type="button" className="text-mcz-ember hover:underline"
                                onClick={() => handOff("personaz", `personaz-${r.key}`, { persona: r.key })}>
                          {r.count ? "Edit" : "Add skills"}
                        </button>
                      </div>
                    ))}
                  </div>
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
                    <div className="text-[11px] text-white/60">
                      {ref?.count ?? 0} joined · {ref?.spinaz_earned ?? 0} {SPINAZ} earned
                    </div>
                  </div>
                )}

                {/* Birthday step: inline date picker + save. The anchor wraps
                    both states so its link still has something to land on
                    once the date is saved. */}
                {s.bday && (
                  <div data-tour="birthday">
                    {!s.done ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="date" value={bday} max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBday(e.target.value)}
                          className="min-w-0 max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white/80 outline-none" />
                        <button className="re-btn !w-auto px-3" onClick={saveBday} disabled={!bday || savingBday}>
                          {savingBday ? "…" : "Save"}
                        </button>
                      </div>
                    ) : me?.zodiac ? (
                      <button type="button" onClick={() => goToSpot("profilez", "birthday")}
                              className="mt-1 flex items-center gap-1 text-[11px] text-mcz-ember hover:underline">
                        Your ZodiacZ: {me.zodiac} — see what it's worth <ArrowRight size={11} />
                      </button>
                    ) : null}
                  </div>
                )}

                {/* The link to where the task is actually done. It stays after
                    the step is finished — a done step is still somewhere you
                    go back to — just dimmed so it reads as optional. */}
                {s.tab && lead && !s.done ? (
                  <>
                    <button className="neon-btn-primary mt-3 !w-auto px-5" onClick={() => go(s)}>
                      {s.cta} <ArrowRight size={15} />
                    </button>
                {s.key === "score" && !s.done && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Which coach">
                        <span className="text-[11px] text-white/55">Not your instrument?</span>
                        {FOCUS_COACHES.map((k) => (
                          <button key={k} type="button" role="radio" aria-checked={coach === k} data-nomemo="true" onClick={() => setCoach(k)}
                                  className={`pill ${coach === k ? "!border-mcz-ember !text-white" : ""}`}>{COACH_NAME[k]}</button>
                        ))}
                      </div>
                    )}
                  </>
                ) : s.tab && (
                  <button
                    className={`mt-2 flex items-center gap-1 text-xs font-semibold hover:brightness-125 ${
                      s.done ? "text-white/55 hover:text-mcz-ember" : "text-mcz-ember"}`}
                    onClick={() => go(s)}>
                    {s.done ? "Open it again" : s.cta} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="onboardz.png" alt="OnboardZ" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold">OnboardZ</h2>
          <p className="text-xs text-white/60">{next ? "One step at a time — here's your next one." : "All done."}</p>
        </div>
      </header>


      {!allDone && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300/30 bg-emerald-300/5 px-4 py-3">
          <Gift size={18} className="shrink-0 text-emerald-300" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-white">Get your first score, post once and rate 3 tracks for a bonus:</p>
            <p className="text-xs text-white/70">+150 {SPINAZ}  +50 {ENERGY}</p>
          </div>
        </div>
      )}


      {/* Progress */}
      {complete > 0 && <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-mcz-ember transition-all"
             style={{ width: `${(complete / steps.length) * 100}%` }} />
      </div>}

      {allDone && (
        <div className="flex items-center gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-4 py-2 text-sm text-mcz-ember">
          <PartyPopper size={16} />
          {claim?.granted
            ? <span>{talk(P.onboard_done(claim.reward_spinaz, claim.reward_energy))}</span>
            : <span>{talk(P.onboard_done_plain)}</span>}
        </div>
      )}

      {next && card(next, true)}
      {rest.length > 0 && (
        <button type="button" className="text-xs font-semibold text-white/60 hover:text-white" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
          {showAll ? "Hide the other steps" : `See all steps (${complete}/${steps.length} done)`}
        </button>
      )}
      {showAll && <div className="space-y-3">{rest.map((x) => card(x))}</div>}

      <details className="re-card">
        <summary className="cursor-pointer text-sm font-semibold text-white">More ways in — pick what you're here for, how it all works, a guided tour</summary>
        <div className="mt-3 space-y-4">
          <IntentPicker />
          <SystemCard />
          <button onClick={startTour} className="neon-btn-primary !w-auto px-5" title="Walk me through it">
            <Compass size={16} /> Take the guided tour
          </button>
        </div>
      </details>
    </div>
  );
}