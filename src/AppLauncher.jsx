// AppLauncher — a grid of icon tiles for a parent tab that nests sub-apps.
//
// Corey's ask, verbatim: "can u put the apps nestled in the parent tabs withn
// their icons and corey voice description clicking the icon opens the app."
// His reference image was a "ToolZ (audio, visual, & app toolZ)" neon sign —
// a lightbulb full of tool icons — as a moodboard for what the category
// should feel like, not a literal layout to copy.
//
// This is deliberately the SMALL version of that ask. A full nested-routing
// restructure (ImageZ/KeyConnectZ/SentenceZ moving under real child routes
// inside ToolZ, goto.js targets and OCC's EXPORT_ROUTES following) was
// proposed and explicitly declined earlier on this branch — too much to do
// responsibly in one pass, and it touches an AI-metered endpoint
// (SentenceZ) that does not exist yet. So a tile here does NOT define a new
// nested URL. It navigates to the app's own existing top-level route
// (`/image`, `/clean`, `/keyconnect`) exactly as the dock and the drawer
// already do — this is a second front door onto the same rooms, not a new
// building.
//
// Reusable on purpose: takes a plain list of {icon, label, description,
// route}, so a second parent tab that groups sibling apps (CollabZ,
// MessageZ, ...) can render the same grid later without a second
// implementation to drift from this one.
import { Link } from "react-router-dom";
import { IconImg } from "./App.jsx";

export default function AppLauncher({ tiles }) {
  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => (
        <Link
          key={t.route}
          to={t.route}
          className="neon-frame flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-mcz-ember hover:bg-white/[0.07]"
        >
          <IconImg
            icon={t.icon}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <div className="font-semibold text-white">{t.label}</div>
            <p className="mt-0.5 text-[13px] leading-snug text-white/60">{t.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
