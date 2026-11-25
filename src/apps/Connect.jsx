import "../components/ToolZMenu.css";
import { IconImg, tabMeta } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { purposeOf } from "../appPurpose.js";

// Connect — every way to work with other people, in one place: who is here (SocialiZeZ), deals with them
// (CollabZ), head-to-head (BattleZ) and shared rooms (VenueZ). It holds no data of its own: each card opens
// that app on its main control, and the label, icon and one-line purpose are the app's own.
const DOORS = ["social", "collabz", "battlez", "venuez"];

export default function Connect() {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-3xl font-extrabold text-white">Connect</h2>
        <p className="text-[14px] text-white/60">Find people, make deals, compete, meet up.</p>
      </header>
      <div className="category-grid coach-grid">
        {DOORS.map((k) => {
          const t = tabMeta(k);
          if (!t) return null;
          return (
            <button key={k} className="category-card cyan coach-card" onClick={() => goToSpot(k, `${k}:main`)}>
              <IconImg icon={t.icon} alt={t.label} className="category-icon-img" />
              <div className="category-text">
                <div className="category-label">{t.label}</div>
                <div className="category-tag">{purposeOf(k)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
