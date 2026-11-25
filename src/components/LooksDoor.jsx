// A door from the design and photo apps to the place a member can have THEIR OWN LOOKS read, by AI and by other members:
// LookZMaxZ (AI reading of your own photo) and the community attractiveness rating on a profile. It exists so nobody has to
// leave for another app to get that feedback.
//
// It renders ONLY for a member who has passed the 18+ check (the server's `/economy/identity/`, the same gate LookZMaxZ stands
// behind). A looks-rating invitation shown to a minor, or to somebody who may be one, is the push the whole feature is built
// to avoid, so for everybody else this is nothing at all — not a locked door, not a sentence about why.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";

export default function LooksDoor({ className = "" }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { api("/api/economy/identity/").then((r) => setOk(!!r?.verified_18plus)).catch(() => setOk(false)); }, []);
  if (!ok) return null;
  return (
    <div className={`rounded-lg border border-mcz-cyan/30 bg-mcz-cyan/[0.06] p-2.5 text-[12px] ${className}`} data-tour="looks-door">
      <p className="font-semibold text-white">Want your own looks rated?</p>
      <p className="text-white/65">LookZMaxZ reads your own photo — skin, grooming, styling — with what to change, and other members can rate you from your profile. 18+ verified, your photo only; the price is shown there before you press anything.</p>
      <button type="button" className="re-btn mt-1.5 !w-auto px-4" onClick={() => goToSpot("lookmaxz", "")}>Open LookZMaxZ</button>
    </div>
  );
}
