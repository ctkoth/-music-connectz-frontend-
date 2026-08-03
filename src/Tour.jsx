// Guided tutorial.
//
// OnboardZ used to be a checklist: it told you what to do and left you to find
// it. This walks you there — switches to the right app, spotlights the actual
// control, and where a step needs something from you it will not advance until
// you have given it.
//
// Targets are marked with data-tour="…" on the real elements, so the tour
// highlights the live control rather than a picture of one.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { goToTab } from "./goto.js";

export const TOUR_EVENT = "mcz-start-tour";
export const startTour = () => window.dispatchEvent(new CustomEvent(TOUR_EVENT));

// Each step names the app it lives in, the element it points at, and — when it
// needs something from the member — a `requires` predicate read off /me.
export const TOUR_STEPS = [
  {
    tab: "profilez", target: "personas",
    title: "Pick your classes",
    body: "PersonaZ are how people find you. Claim every hat you actually wear — multiclass is the point, and one class is a smaller surface, not a purer one.",
    requires: (me) => (me?.personas?.length || 0) > 0,
    ask: "Tap at least one PersonaZ below to continue.",
  },
  {
    tab: "profilez", target: "skills",
    title: "Date your skills",
    body: "Open + Skills on a PersonaZ and give each one a start date. Your experience is measured from that date — years you actually put in, nothing you can farm in a weekend.",
    optional: true,
  },
  {
    tab: "onboardz", target: "birthday",
    title: "Set your ZodiacZ",
    body: "Your birthday sets your sign, which is a live filter on Social ConnectZ. Only the sign is public — the date stays yours.",
    requires: (me) => !!me?.birthday,
    ask: "Pick your date of birth and hit Save.",
  },
  {
    tab: "profilez", target: "nationalities",
    title: "Represent your heritage",
    body: "Start typing and the list narrows — i gives Irish, Italian, Indian. Pick as many as are genuinely yours; it's how diaspora finds diaspora here.",
    optional: true,
  },
  {
    tab: "profilez", target: "save",
    title: "Save it",
    body: "Nothing above is live until you save. You'll get a green confirmation when it actually lands — and a real error if it doesn't.",
    optional: true,
  },
  {
    tab: "postz", target: "composer",
    title: "Drop your first PostZ",
    body: "This is the front door. Rating opens 30 seconds after you post and comments at 60, so nobody can pile on something they haven't heard. You can't rate your own.",
    optional: true,
  },
];

function useRect(selector, deps) {
  const [rect, setRect] = useState(null);
  const measure = useCallback(() => {
    const el = selector && document.querySelector(`[data-tour="${selector}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [selector]);

  useLayoutEffect(() => {
    measure();
    // The target may mount a moment after the tab switch, so poll briefly.
    const t = setInterval(measure, 200);
    const stop = setTimeout(() => clearInterval(t), 4000);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(t); clearTimeout(stop);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [measure, ...deps]);

  return [rect, measure];
}

export default function Tour({ me, onRefreshMe }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const step = TOUR_STEPS[i];
  const scrolled = useRef("");

  useEffect(() => {
    const start = () => { setI(0); setOpen(true); };
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, []);

  // Switch to the app this step lives in before looking for its target.
  useEffect(() => {
    if (open && step) goToTab(step.tab);
  }, [open, i]); // eslint-disable-line react-hooks/exhaustive-deps

  const [rect] = useRect(open && step ? step.target : null, [i, open]);

  // Bring the target into view once per step.
  useEffect(() => {
    if (!open || !step || scrolled.current === `${i}`) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      scrolled.current = `${i}`;
    }
  }, [open, i, rect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-read the account while the tour is open so `requires` unlocks live.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => onRefreshMe?.(), 2500);
    return () => clearInterval(t);
  }, [open, onRefreshMe]);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  if (!open || !step) return null;

  const satisfied = !step.requires || step.requires(me);
  const last = i === TOUR_STEPS.length - 1;
  const pad = 8;

  // Card sits under the target when there's room, else above it — but always
  // fully on screen. Mixing top/bottom anchoring let it settle partly outside
  // the viewport when the target sat near an edge, which left Next unclickable.
  const CARD_H = 260;
  const clampTop = (v) => Math.max(8, Math.min(v, window.innerHeight - CARD_H - 8));
  const below = !rect || rect.top + rect.height < window.innerHeight * 0.5;
  const cardStyle = rect
    ? { top: clampTop(below ? rect.top + rect.height + pad + 6
                            : rect.top - pad - 6 - CARD_H) }
    : { top: clampTop(window.innerHeight / 2 - CARD_H / 2) };

  return (
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {/* Spotlight: a ring around the target with a huge shadow dimming the rest. */}
      {rect ? (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            top: rect.top - pad, left: rect.left - pad,
            width: rect.width + pad * 2, height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            border: "2px solid #ff5500",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}

      <div className="pointer-events-auto absolute inset-x-0 mx-auto max-w-md px-4" style={cardStyle}>
        <div className="neon-frame bg-mcz-bg/95 p-4 backdrop-blur">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-mcz-ember">
                Step {i + 1} of {TOUR_STEPS.length}
              </p>
              <h3 className="font-display text-lg font-extrabold">{step.title}</h3>
            </div>
            <button onClick={() => setOpen(false)} title="Exit the tour"
              className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <p className="text-[12px] leading-relaxed text-white/70">{step.body}</p>

          {!satisfied && step.ask && (
            <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[11px] text-mcz-ember">
              <ArrowRight size={12} className="shrink-0" /> {step.ask}
            </p>
          )}
          {satisfied && step.requires && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300">
              <Check size={12} /> Done — carry on.
            </p>
          )}
          {!rect && (
            <p className="mt-2 text-[11px] text-white/40">
              Looking for that control… scroll a little if it hasn't appeared.
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button disabled={i === 0} onClick={() => setI((n) => n - 1)}
              className="rounded-lg p-2 text-white/50 disabled:opacity-25 hover:bg-white/10 hover:text-white">
              <ArrowLeft size={15} />
            </button>
            <button
              className="neon-btn-primary !w-auto flex-1 px-4"
              disabled={!satisfied}
              onClick={() => (last ? setOpen(false) : setI((n) => n + 1))}
            >
              {last ? "Finish" : satisfied ? "Next" : "Waiting on you…"}
            </button>
            <button onClick={() => setOpen(false)}
              className="text-[11px] text-white/40 hover:text-white/70">Skip</button>
          </div>
        </div>
      </div>
    </div>
  );
}
