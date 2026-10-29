import { useState } from "react";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { goToSpot } from "../goto.js";
import { addSeeds } from "../yourApps.js";

// "I'm here for ___" — a guided menu so a brand-new member picks the thing
// they actually came to do instead of landing on the Dock and having to
// already know this app's own names for things (CollabZ, DirectZ, LessonZ…)
// before they can find any of them. Role first, then what they want to DO
// with it, then straight to the exact control — never a tab switch that
// dumps them at the top of an app they've never seen, same as every other
// handoff in this codebase (`goToSpot`).
//
// Every role label here is the SAME string `apps/economy/personaz.py`
// already uses (Rapper, Singer, Ghost Writer, A&R Scout…) — this is a
// curated SUBSET of personas for a first-run picker, not a second list of
// what a persona is called. If a role's label ever changes server-side,
// change it here too; there is nothing server-driven to keep this in sync
// automatically because this is pure navigation, like every other step in
// OnboardZ.
//
// Predicates are deliberately not identical across roles: BattleZ is a
// 1v1/freestyle/cypher challenge, which fits a Rapper or Singer and nothing
// a Designer or Developer would call "proving their skillz." A Designer or
// Developer has no scored AI coach in this codebase at all — showing their
// work (the portfolio) is the honest stand-in, not an invented score.
const ROLES = [
  { key: "rapper", label: "Rapper", emoji: "🎤",
    predicates: [
      { label: "Write", desc: "Lyrics, with K-Oth's register", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "rapz", target: "rapz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
    ] },
  { key: "singer", label: "Singer", emoji: "🎶",
    predicates: [
      { label: "Write", desc: "Lyrics, with K-Oth's register", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "singz", target: "singz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
    ] },
  { key: "guitarist", label: "Guitarist", emoji: "🎸",
    predicates: [
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "guitarz", target: "guitarz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "bassist", label: "Bassist", emoji: "🎸",
    predicates: [
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "bassz", target: "bassz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "pianist", label: "Pianist", emoji: "🎹",
    predicates: [
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "keyz", target: "keyz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "drummer", label: "Drummer", emoji: "🥁",
    predicates: [
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "drumz", target: "drumz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "violinist", label: "Violinist", emoji: "🎻",
    predicates: [
      { label: "Prove my SkillZ", desc: "Record a scored take", tab: "violinz", target: "violinz-take" },
      { label: "Battle", desc: "Call somebody out", tab: "battlez", target: "battlez-opponent" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "producer", label: "Producer", emoji: "🎚️",
    predicates: [
      { label: "Prove my SkillZ", desc: "Show your work", tab: "profilez", target: "portfolio-links" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
      { label: "Sell", desc: "License beats, or sell your own", tab: "beatz", target: "beatz-sell" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "mixengineer", label: "Mix Engineer", emoji: "🎛️",
    predicates: [
      { label: "Prove my SkillZ", desc: "Show your work", tab: "profilez", target: "portfolio-links" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "ghostwriter", label: "Ghost Writer", emoji: "✍️",
    predicates: [
      { label: "Write", desc: "Lyrics, hooks, a story beat", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
      { label: "Promo", desc: "Post it, or reach your followers", tab: "postz", target: "composer" },
      { label: "Teach it", desc: "6★+ unlocks LessonZ", tab: "lessonz", target: "lessonz-teach" },
    ] },
  { key: "videographer", label: "Videographer", emoji: "🎥",
    predicates: [
      { label: "Prove my SkillZ", desc: "A scored collaborative video", tab: "directz", target: "directz-releases" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
      { label: "Sell", desc: "List on MercheZ", tab: "merchz", target: "merchz-sell" },
    ] },
  { key: "designer", label: "Designer", emoji: "🎨",
    predicates: [
      { label: "Write", desc: "A resume, bio or cover letter", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Prove my SkillZ", desc: "Show your work", tab: "profilez", target: "portfolio-links" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
      { label: "Sell", desc: "List on MercheZ", tab: "merchz", target: "merchz-sell" },
    ] },
  { key: "developer", label: "Developer", emoji: "🖥️",
    predicates: [
      { label: "Write", desc: "A resume, bio or cover letter", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Prove my SkillZ", desc: "Show your work", tab: "profilez", target: "portfolio-links" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
    ] },
  { key: "director", label: "Director", emoji: "🎬",
    predicates: [
      { label: "Write", desc: "A treatment, resume or bio", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Prove my SkillZ", desc: "A scored collaborative video", tab: "directz", target: "directz-releases" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
    ] },
  { key: "manager", label: "Manager", emoji: "📋",
    predicates: [
      { label: "Write", desc: "A resume, bio or cover letter", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
    ] },
  { key: "arscout", label: "A&R Scout", emoji: "🔭",
    predicates: [
      { label: "Write", desc: "A resume, bio or cover letter", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
    ] },
  { key: "other", label: "Something else", emoji: "✨",
    predicates: [
      { label: "Write", desc: "Whatever you need written", tab: "sentenceconnectz", target: "sentencez-write" },
      { label: "Show my work", desc: "Your portfolio", tab: "profilez", target: "portfolio-links" },
      { label: "Collab", desc: "Start a deal with someone", tab: "collabz", target: "collabz-partner" },
      { label: "Browse everything", desc: "The full app menu", tab: "toolz", target: "" },
    ] },
];

const LAST_ROLE_KEY = "mcz_intent_last_role";

export default function IntentPicker() {
  const [roleKey, setRoleKey] = useState(() => {
    try { return localStorage.getItem(LAST_ROLE_KEY) || null; } catch { return null; }
  });
  const role = ROLES.find((r) => r.key === roleKey) || null;

  function pickRole(k) {
    setRoleKey(k);
    try { localStorage.setItem(LAST_ROLE_KEY, k); } catch { /* private mode — fine, just not remembered */ }
    // What they said they are becomes their first apps: the scored take leads, then the rest of the role.
    const r = ROLES.find((x) => x.key === k);
    if (r) {
      const tabs = [...r.predicates].sort((a, b) => (b.label === "Prove my SkillZ") - (a.label === "Prove my SkillZ"))
        .map((p) => p.tab).filter((t) => t && t !== "toolz");
      addSeeds([...new Set(tabs)]);
    }
  }

  function go(p) {
    goToSpot(p.tab, p.target);
  }

  return (
    <div className="re-card space-y-3" data-tour="intent-picker">
      <div className="flex items-center gap-2">
        <Compass size={18} className="text-mcz-ember" />
        <p className="text-sm font-bold text-white">I'm here for…</p>
      </div>

      {!role ? (
        <>
          <p className="text-[12px] text-white/50">Pick what you are, and we'll pick where to start.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLES.map((r) => (
              <button key={r.key}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-3 text-center hover:border-mcz-ember/40"
                      onClick={() => pickRole(r.key)}>
                <span className="text-xl">{r.emoji}</span>
                <span className="text-[11px] font-semibold text-white/80">{r.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button className="flex items-center gap-1 text-[11px] font-semibold text-white/40 hover:text-mcz-ember"
                  onClick={() => setRoleKey(null)}>
            <ArrowLeft size={12} /> Not {role.label.toLowerCase()}?
          </button>
          <p className="text-[12px] text-white/50">
            <span className="text-lg">{role.emoji}</span> {role.label} — what do you want to do first?
          </p>
          <div className="space-y-2">
            {role.predicates.map((p) => (
              <button key={p.label}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
                      onClick={() => go(p)}>
                <span>
                  <span className="block text-sm font-semibold text-white">{p.label}</span>
                  <span className="block text-[11px] text-white/45">{p.desc}</span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-white/30" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
