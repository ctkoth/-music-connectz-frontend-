import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";

// Settings — one door to every control that sets how Music ConnectZ behaves. It holds no settings of its own:
// each card opens the control where it already lives (landing on it, not at the top of a screen). A setting
// that is not built yet is shown as coming, never as a button to nothing.
const DOORS = [
  { label: "Who can see what", note: "Per field: public, members, private, friends, fans, PartnerZ.", tab: "profilez", target: "visibility", icon: "profilez.png" },
  { label: "Sound & Casino look", note: "Sound packs, the beep and the neon casino look.", tab: "soundz", target: "soundz:main", icon: "soundz.png" },
  { label: "Verify I'm 18+", note: "Unlocks the adult-only parts of the app.", tab: "profilez", target: "verify-18", icon: "profilez.png" },
  { label: "Plans & billing", note: "Free, Premium and StatZ, and what each holds.", tab: "membershipz", target: "membershipz:main", icon: "money.png" },
  { label: "Your profile", note: "Name, birthday, location, portfolio links.", tab: "profilez", target: "profilez:main", icon: "profilez.png" },
];
const COMING = [
  ["🕵️‍♂️ Incognito", "Anonymous mode, switchable per post, per tab or everywhere — for Premium."],
  ["🔒 Two-factor sign-in", "A second step at login. There is no 2FA built yet."],
];

export default function SettingsHub() {
  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-3xl font-extrabold text-white">Settings</h2>
        <p className="text-[14px] text-white/60">How the app behaves for you — each one opens where it lives.</p>
      </header>
      <div className="space-y-2">
        {DOORS.map((d) => (
          <button key={d.label} onClick={() => goToSpot(d.tab, d.target)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-white/25">
            <IconImg icon={d.icon} alt="" className="h-12 w-12 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1"><span className="block text-[16px] font-bold text-white">{d.label}</span>
              <span className="block text-[12px] text-white/60">{d.note}</span></span>
            <span aria-hidden="true" className="text-white/40">›</span>
          </button>
        ))}
        {COMING.map(([t, note]) => (
          <div key={t} aria-disabled="true" className="rounded-2xl border border-dashed border-white/15 p-3 opacity-70">
            <span className="block text-[16px] font-bold text-white">{t} <span className="text-[12px] font-normal text-white/60">— coming soon</span></span>
            <span className="block text-[12px] text-white/60">{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
