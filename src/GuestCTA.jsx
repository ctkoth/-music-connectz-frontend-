// A sign-up prompt tied to the SPECIFIC thing a guest just tried to do —
// never a generic wall. Every gated control on the guest-facing pages
// (PublicFeed, PublicPost) renders one of these instead of quietly doing
// nothing, and `next` carries the guest straight back to what they were
// looking at once they've registered (see Register.jsx's `next` handling).
import { Link, useLocation } from "react-router-dom";

export default function GuestCTA({ action, next, icon: Icon, className = "" }) {
  const location = useLocation();
  const target = next || `${location.pathname}${location.search}`;
  return (
    <Link
      to={`/register?next=${encodeURIComponent(target)}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-mcz-ember/40 bg-mcz-ember/10 px-2.5 py-1 text-[11px] font-semibold text-mcz-ember transition hover:bg-mcz-ember/20 ${className}`}
    >
      {Icon && <Icon size={12} />} Join free to {action}
    </Link>
  );
}
