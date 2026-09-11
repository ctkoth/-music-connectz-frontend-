// QuestZ — its own tab, at last.
//
// The board was only ever reachable inside MimeZ. That is the mistake
// CLAUDE.md already records about the offer engine living inside PostZ —
// "the feature had no tab of its own" — except the stakes here are higher,
// because QuestZ is not a promotion. It is the ECONOMY'S FRONT DOOR:
// `energy_rate_per_hour` is reach ÷ tier, reach is 0 until an external
// account is verified, and Energy is what an OCC run, a GameZ build and a
// priced post all cost. A new member's income is entirely this board.
//
// So the tab is not a convenience. Until it existed, the answer to "I have no
// Energy, how do I get some?" was "open the silent-performance training app",
// which nobody guesses and nothing said out loud.
import QuestBoard from "../QuestBoard.jsx";
import { IconImg } from "../App.jsx";
import { ENERGY } from "../resources.js";

export default function QuestZ() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="questz.png" alt="QuestZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#ffcf3f" }}>
            QuestZ
          </h2>
          {/* What the board pays is the board's to say — the rows carry their
              own numbers and the server's `note` explains the economy. This
              line says what the tab IS, and no figure that lives elsewhere. */}
          <p className="text-sm text-white/60">
            Daily, weekly and one-off missions that pay {ENERGY}. Every one states what
            it's worth before you start it, and lands you on the control that finishes it.
          </p>
        </div>
      </header>

      <QuestBoard />
    </div>
  );
}
