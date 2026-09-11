// MimeZ — the SkillZ tree it always had, and the quest board it borrowed.
//
// The board used to be DEFINED here, which is how QuestZ shipped without a
// tab: the Energy on-ramp for every new member was reachable only from
// "silent-performance training and practice drills". It lives in
// `src/QuestBoard.jsx` now and has its own tab.
//
// It still renders here on purpose. One of the dailies sends you to MimeZ to
// use the training tree, and arriving to find the quest that sent you gone
// would be a worse dead end than the one being fixed. Same component, so the
// two can never disagree about what a streak is worth.
import QuestBoard from "../QuestBoard.jsx";
import { goToTab } from "../goto.js";
import SkillZPanel from "../skillz/SkillZPanel.jsx";

export default function MimeZ() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <img src="/icons/mimez.png" alt="MimeZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-3xl font-extrabold text-mcz-pink drop-shadow-[0_0_12px_rgba(255,43,209,0.5)]">
            MimeZ
          </h2>
          <p className="text-sm text-white/60">
            Lipsync, selfie and dance training — plus your quest board.
          </p>
          <span className="pill mt-1 inline-block">Teen-safe</span>
        </div>
      </header>

      <div data-tour="skillz-panel">
        <SkillZPanel basePath="/api/mimez" accent="#ff2bd1" />
      </div>

      {/* The same board, and a way to reach the tab it now has. A member who
          came here for the quests should learn where they live rather than
          keep arriving through a training app. */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
            Your quests
          </h3>
          <button className="pill !text-[11px] hover:!text-white" onClick={() => goToTab("questz")}>
            Open QuestZ →
          </button>
        </div>
        <QuestBoard />
      </div>
    </div>
  );
}
