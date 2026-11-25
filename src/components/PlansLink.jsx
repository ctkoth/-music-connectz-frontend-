// "See plans": the one way past a limit, wherever a limit is stated. A limit with no button is a dead end, and this repo's rule is that nothing is.
// It lands on the plans themselves (what each plan holds is the server's list, drawn by MembershipZ), never a typed number.
import { goToSpot } from "../goto.js";

export default function PlansLink({ label = "🔒 See plans", className = "" }) {
  return (
    <button type="button" className={`re-btn ml-1 !w-auto px-2 py-0.5 text-[11px] ${className}`} onClick={() => goToSpot("membershipz", "membershipz-plans")}>{label}</button>
  );
}
