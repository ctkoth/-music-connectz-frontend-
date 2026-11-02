import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToSpot, spotlight } from "../goto.js";
import { openHoroscope } from "./Horoscope.jsx";
import { useReligions } from "../ReligionZ.jsx";
import { KIDS, kidLine } from "../profileKids.js";
import { usePhilosophieLists } from "../PhilosophieZ.jsx";
import { labelMap } from "../philosophiez.js";

// The apps that live inside ProfileZ, as children: each one says what it currently
// holds for you, whether that is saved yet, and lands on the exact control.
//
// It decides nothing. What a child says is `kidLine` over values the screen already
// holds; what is unsaved is `unsaved` from the one comparison ProfileZ makes for the
// Save bar, so a tile and the bar can never disagree about what is waiting.
//
// SocialZ is the one child with a screen of its own (it verifies against other
// sites and saves itself), so its numbers are the server's, fetched here. A failed
// fetch leaves the tile on its plain label: an error about a tile nobody pressed
// is an interruption about an interruption.
export default function ProfileKids({ values, unsaved }) {
  const [social, setSocial] = useState(null);
  const religions = useReligions();
  const lists = usePhilosophieLists();

  useEffect(() => {
    let on = true;
    api("/api/economy/socialz/").then((d) => { if (on) setSocial(d); }).catch(() => {});
    return () => { on = false; };
  }, []);

  const v = {
    ...values, social,
    religionLabel: religions.find((r) => r.key === values.religion)?.label || "",
    philosophyLabel: labelMap(lists?.philosophies)[values.philosophy] || "",
  };
  const pending = KIDS.filter((k) => unsaved.has(k.key)).length;

  return (
    <section data-tour="profile-kids" className="neon-frame space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
          Your profile apps
        </p>
        {pending > 0 && (
          <span className="text-[11px] text-amber-300">
            {pending} {pending === 1 ? "has" : "have"} unsaved changes — Save is at the bottom
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/40">
        Each of these is a filter other members can search by. Tap one to land on its control.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KIDS.map((kid) => {
          const line = kidLine(kid.key, v);
          const dirty = unsaved.has(kid.key);
          const open = () => (kid.tab ? goToSpot(kid.tab, `${kid.tab}-reach`) : spotlight(kid.spot));
          return (
            <div key={kid.key}
              className={`flex flex-col rounded-xl border p-2.5 transition ${
                dirty ? "border-amber-300/60 bg-amber-300/5"
                  : line ? "border-mcz-cyan/30 bg-mcz-cyan/5" : "border-white/10 bg-black/30"}`}>
              <button type="button" onClick={open} className="flex flex-1 items-start gap-2 text-left">
                <IconImg icon={kid.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">{kid.label}</span>
                  <span className={`block text-[11px] ${line ? "text-white/70" : "text-white/35"}`}>
                    {line || (kid.tab ? "Connect your accounts" : "Not set yet — tap to set")}
                  </span>
                </span>
              </button>
              {dirty ? (
                <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                  <span aria-hidden>●</span> Unsaved
                </span>
              ) : line && !kid.tab ? (
                <span className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-300/80">
                  <Check size={10} /> Saved
                </span>
              ) : null}
              {/* The sign opens today's reading — the same panel a sign opens
                  anywhere else in the app. */}
              {kid.key === "zodiacz" && values.zodiac && (
                <button type="button" className="mt-1 text-left text-[11px] text-mcz-gold hover:underline"
                  onClick={() => openHoroscope(values.zodiac)}>
                  Today's {values.zodiac} horoscope →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
