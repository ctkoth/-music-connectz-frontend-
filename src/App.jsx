import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { asList } from "./shape.js";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogOut, ChevronLeft, ChevronRight, Volume2, VolumeX, Bell, X } from "lucide-react";
import { isSoundOn, playSoundPreview, setSoundOn } from "./sound.js";
import { track } from "./track.js";
import { openable } from "./openable.js";
import { goToSpot } from "./goto.js";
import { useAuth } from "./auth/AuthContext.jsx";
import MemberName from "./MemberName.jsx";
import AccountChoice from "./auth/AccountChoice.jsx";
import OAuthCallback from "./auth/OAuthCallback.jsx";
import Dock, { isStatZTier, usePickConnectZ } from "./PickConnectZ.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import Tour from "./Tour.jsx";
import NotificationsPanel from "./components/NotificationsPanel.jsx";
import SoundzPanel from "./components/SoundzPanel.jsx";
import StorageWarning from "./components/StorageWarning.jsx";
import EnergyRegenerationDisplay from "./components/EnergyRegenerationDisplay.jsx";
import { SPINAZ } from "./resources.js";
import { ICON_DEFAULTS } from "./iconManifest.js";

// Every screen below used to be a static import, which means a cold visitor
// hitting the logged-out Landing page paid for the ENTIRE authenticated app —
// all ~28 tabs, SingZ through BugZ — before a single pixel of "here's what
// this is" painted. That's the 730KB single chunk Vite's own build output
// warns about. lazy() + Suspense (below) means each route/tab downloads only
// when it's actually opened, so the cold path (Landing → /try → Register) now
// ships close to nothing extra. JSX referencing a lazy component (as TABS
// does, below) does NOT trigger its import — only mounting it does, which is
// why TABS can stay exactly as written.
import { lazyRoute } from "./chunkError.js";
import { TransactionModalProvider, useTransactionModal } from "./TransactionModalContext.jsx";
import TransactionModal from "./TransactionModal.jsx";
// WidgetZ. Mounted at the top of the signed-in app rather than inside a tab,
// because a widget outlives the screen it was opened from — that is the point
// of it. A link opened on a member's card is still there when its owner has
// been closed and a post is being read instead.
import { WidgetProvider } from "./WidgetBoard.jsx";

const Login = lazy(lazyRoute(() => import("./auth/Login.jsx")));
const Register = lazy(lazyRoute(() => import("./auth/Register.jsx")));
const ForgotPassword = lazy(lazyRoute(() => import("./auth/ForgotPassword.jsx")));
const ResetPassword = lazy(lazyRoute(() => import("./auth/ResetPassword.jsx")));
const MimeZ = lazy(lazyRoute(() => import("./apps/MimeZ.jsx")));
const DirectZ = lazy(lazyRoute(() => import("./apps/DirectZ.jsx")));
const LessonZ = lazy(lazyRoute(() => import("./apps/LessonZ.jsx")));
const InstrumentZ = lazy(lazyRoute(() => import("./apps/InstrumentZ.jsx")));
const MessageZ = lazy(lazyRoute(() => import("./apps/MessageZ.jsx")));
const ProfileZ = lazy(lazyRoute(() => import("./apps/ProfileZ.jsx")));
const StatsZ = lazy(lazyRoute(() => import("./apps/StatsZ.jsx")));
const OpportunitieZ = lazy(lazyRoute(() => import("./apps/OpportunitieZ.jsx")));
const GroupZ = lazy(lazyRoute(() => import("./apps/GroupZ.jsx")));
const CollabZ = lazy(lazyRoute(() => import("./apps/CollabZ.jsx")));
const VenueZ = lazy(lazyRoute(() => import("./apps/VenueZ.jsx")));
const BattleZ = lazy(lazyRoute(() => import("./apps/BattleZ.jsx")));
const LabelZ = lazy(lazyRoute(() => import("./apps/LabelZ.jsx")));
const BugZ = lazy(lazyRoute(() => import("./apps/BugZ.jsx")));
const DawZ = lazy(lazyRoute(() => import("./apps/DawZ.jsx")));
const PostZ = lazy(lazyRoute(() => import("./apps/PostZ.jsx")));
const KeyConnectZ = lazy(lazyRoute(() => import("./apps/KeyConnectZ.jsx")));
const OCC = lazy(lazyRoute(() => import("./apps/OCC.jsx")));
const SocialConnectZ = lazy(lazyRoute(() => import("./apps/SocialConnectZ.jsx")));
const VybeZ = lazy(lazyRoute(() => import("./apps/VybeZ.jsx")));
// Logged-out doors. PersonalityTest is a trial like /try; MetZ and ChordZ are
// the same components the app mounts as tabs — they make no API calls and
// read no session, so serving them to a stranger costs nothing and needs no
// second implementation.
const PersonalityTest = lazy(lazyRoute(() => import("./apps/PersonalityTest.jsx")));
const SpecZ = lazy(lazyRoute(() => import("./apps/SpecZ.jsx")));
const MembershipZ = lazy(lazyRoute(() => import("./apps/MembershipZ.jsx")));
const AdZ = lazy(lazyRoute(() => import("./apps/AdZ.jsx")));
const OfferZ = lazy(lazyRoute(() => import("./apps/OfferZ.jsx")));
const OnboardZ = lazy(lazyRoute(() => import("./apps/OnboardZ.jsx")));
const PublicPost = lazy(lazyRoute(() => import("./apps/PublicPost.jsx")));
const PublicProfile = lazy(lazyRoute(() => import("./apps/PublicProfile.jsx")));
const TrialTake = lazy(lazyRoute(() => import("./apps/TrialTake.jsx")));
const BodieZTrial = lazy(lazyRoute(() => import("./apps/BodieZTrial.jsx")));
const PublicPlaylist = lazy(lazyRoute(() => import("./apps/PublicPlaylist.jsx")));
const PlaylistZ = lazy(lazyRoute(() => import("./apps/PlaylistZ.jsx")));
const MemberProfile = lazy(lazyRoute(() => import("./apps/MemberProfile.jsx")));
const LogZ = lazy(lazyRoute(() => import("./apps/LogZ.jsx")));
const RoyaltieZ = lazy(lazyRoute(() => import("./apps/RoyaltieZ.jsx")));
const CallZ = lazy(lazyRoute(() => import("./apps/CallZ.jsx")));
const GameZ = lazy(lazyRoute(() => import("./apps/GameZ.jsx")));
const SoundZ = lazy(lazyRoute(() => import("./apps/SoundZ.jsx")));
const SoundCloudEngagementZ = lazy(lazyRoute(() => import("./apps/SoundCloudEngagementZ.jsx")));
const CoachZ = lazy(lazyRoute(() => import("./apps/CoachZ.jsx")));
const FunnelZ = lazy(lazyRoute(() => import("./apps/FunnelZ.jsx")));
const DupeZ = lazy(lazyRoute(() => import("./apps/DupeZ.jsx")));
const HabitZ = lazy(lazyRoute(() => import("./apps/HabitZ.jsx")));
const Lilith = lazy(lazyRoute(() => import("./apps/Lilith.jsx")));
const BodieZ = lazy(lazyRoute(() => import("./apps/BodieZ.jsx")));
const JournalZ = lazy(lazyRoute(() => import("./apps/JournalZ.jsx")));
const MetZ = lazy(lazyRoute(() => import("./apps/MetZ.jsx")));
const TunerZ = lazy(lazyRoute(() => import("./apps/TunerZ.jsx")));
const ChordZ = lazy(lazyRoute(() => import("./apps/ChordZ.jsx")));
const IconZ = lazy(lazyRoute(() => import("./apps/IconZ.jsx")));
const ToolZMenu = lazy(lazyRoute(() => import("./components/ToolZMenu.jsx")));
const Landing = lazy(lazyRoute(() => import("./Landing.jsx")));

// A minimal, theme-matched fallback — Suspense shows this for the split
// second a chunk is in flight. Same spinner RequireAuth already used, so a
// lazy chunk loading doesn't look like a different kind of wait.
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-white/50">
      <Loader2 className="mr-2 animate-spin" size={18} /> Loading…
    </div>
  );
}

// CUSTOM_ICONS registry — keyed to EXACT filenames (platform convention).
// Complete platform set from Corey's icon inventory (Jul 6). Missing files
// fall back to the MCZ logo via <IconImg> until dropped into /public/icons/.
// ICON ARTWORK: Corey's own PNGs, not the generated neon set.
//
// The `-neon.svg` icons were generated by `tools/make-neon-icons.mjs` and they
// are vector, so they scale — but they are simple line glyphs against real
// designed artwork, and next to the actual icon set they read as low-detail.
// The registry points at the artwork.
//
// Some keys still hold a neon SVG. This comment used to say "three" and name
// them; there were six by then and there are eight now, which is the failure
// this whole file's audit exists for — a hand-kept list nobody re-checks.
// **`node tools/icon-audit.mjs` prints the live list.** Only the reasons that
// carry information are worth writing down:
//
//   * postz.png   — kept deliberately. It is the one Corey asked for and liked.
//   * funnelz.png — no artwork was ever drawn; FunnelZ is owner-only.
//   * journalz.png, chordz.jpg, tunerz.jpg — the artwork exists on Corey's
//                   machine and has never been committed. Pointing at a file
//                   that is not in the repo does not error, it silently falls
//                   back to the MCZ logo, so these hold the generated glyph
//                   instead. src/icons.test.mjs tracks the debt.
//
// The generator stays in `tools/` — it is what made the three above, and it is
// how a new tab gets a placeholder before there is art for it.
export const CUSTOM_ICONS = {
  "arsenal.png": "/icons/arsenal.png",
  "azrael.png": "/icons/azrael.png",
  "background.png": "/icons/background.png",
  "battlez.1v1.png": "/icons/battlez.1v1-neon.svg",
  "battlez.cypher.png": "/icons/battlez.cypher-neon.svg",
  "battlez.cypher.jpg": "/icons/battlez.cypher-neon.svg",
  "battlez.freestyle.png": "/icons/battlez.freestyle-neon.svg",
  "battlez.png": "/icons/battlez-main.webp",
  "boardz.png": "/icons/boardz.png",
  "bodiez.png": "/icons/bodiez.png",
  "bugz.png": "/icons/bugz-neon.svg",
  "callz.png": "/icons/callz-neon.svg",
  "callz_ai.png": "/icons/callz_ai.png",
  "callz_ai.webp": "/icons/callz_ai.webp",
  "callz_user.png": "/icons/callz_user.png",
  "callz_user.webp": "/icons/callz_user.webp",
  "cleanconnectz.png": "/icons/cleanconnectz.png",
  // The detailed illustration Corey sent (two figures, a brick wall,
  // hand-lettering) measured illegible at this icon's real size — cropped
  // and zoomed from an actual rendered run, it read as a colored blob at
  // the ~24-28px the tab strip and dock actually draw it. `public/icons/
  // coachz.jpg` still holds that art (kept, not deleted — it's real work
  // and may suit a banner or the CoachZ screen's own header someday), but
  // the small icon points at the house glyph instead: a whistle with two
  // call arcs, already hand-drawn in tools/make-neon-icons.mjs (`coachz`)
  // for exactly this reason — deliberately NOT a person or a speech
  // bubble, so it can't be mistaken for `personaz_coach` (the human) at
  // the same size. One clear symbol, the same fix vybez's icon got.
  "coachz.jpg": "/icons/coachz-neon.svg",
  "collabz.coverz.png": "/icons/collabz.coverz.png",
  "collabz.originalz.png": "/icons/collabz.originalz-neon.svg",
  "collabz.remixez.png": "/icons/collabz.remixez-neon.svg",
  "collabz.png": "/icons/collabz.jpg",
  "collabz_originalz.png": "/icons/collabz_originalz.png",
  "collabz_remixez.png": "/icons/collabz_remixez.png",
  "coverz.png": "/icons/coverz.png",
  // Updated art, deliberately heavier than the rest of this set — five
  // figures, a camera, a mixer, headphones. Fine at the size this was drawn
  // to be admired at; CrewZ has no live tab yet (grep confirms — only
  // src/mcz2/, which is not mounted), so nothing here is rendering it small
  // today. Before it gets one, size-check it at 24-28px (tab strip) and
  // 36-44px (dock) the way vybez's glyph was — "recognition rather than
  // recall" is the whole test a small icon has to pass, and this much
  // detail is likely to compress into noise at that size where the cleaner
  // CollabZ/CoverZ/OriginalZ/RemixeZ marks won't. If it doesn't read, this
  // is still the right art for a banner or the CrewZ screen's own header,
  // just not for the 32px tile — same call the neon-icon toolchain makes
  // for every other tab in this file.
  "crewz.png": "/icons/crewz.png",
  "dawz.png": "/icons/dawz.png",
  "dawz_formulawon.png": "/icons/dawz_formulawon.png",
  "designz.png": "/icons/designz.png",
  "developz.png": "/icons/developz.png",
  "instrumentz.png": "/icons/instrumentz.png",
  "drumz.png": "/icons/drumz-neon.svg",
  "violinz.png": "/icons/violinz-neon.svg",
  "guitarz.png": "/icons/guitarz-neon.svg",
  "bassz.png": "/icons/bassz.png",
  "keyz.png": "/icons/keyz-neon.svg",
  "directz.png": "/icons/directz-neon.svg",
  "distributez.png": "/icons/distributez.png",
  "energy.png": "/icons/energy.png",
  "facez.png": "/icons/facez.png",
  "favicon.webp": "/favicon.webp",
  "fruity_mobius.png": "/icons/fruity_mobius.png",
  "groupz.png": "/icons/groupz-neon.svg",
  "groupz_blocked.png": "/icons/groupz_blocked.png",
  "partnerz.jpg": "/icons/partnerz-neon.svg",
  "groupz_custom.png": "/icons/groupz_custom.png",
  "groupz_fanz.png": "/icons/groupz_fanz.png",
  "groupz_friendz.png": "/icons/groupz_friendz.png",
  "homez.png": "/icons/homez.png",
  "imagez.png": "/icons/imagez.png",
  "inbox.png": "/icons/inbox.png",
  "inbox_alt.png": "/icons/inbox_alt.png",
  "intelligence.png": "/icons/intelligence.png",
  "intuition.png": "/icons/intuition.png",
  "intelligencez.png": "/icons/intelligencez.jpg",
  "keyconnectz.png": "/icons/keyconnectz-neon.svg",
  "labelz.png": "/icons/labelz-neon.svg",
  "lessonz.png": "/icons/lessonz-neon.svg",
  "lilith_anytime.png": "/icons/lilith_anytime.png",
  "lilith_inbox.png": "/icons/lilith_inbox-neon.svg",
  "lilith_logbook.png": "/icons/lilith_logbook.png",
  "lilith_someday.png": "/icons/lilith_someday-neon.svg",
  "lilith_today.png": "/icons/lilith_today.png",
  "lilith_today2.png": "/icons/lilith_today2.png",
  "lilith_trash.png": "/icons/lilith_trash.png",
  "lilith_upcoming.png": "/icons/lilith_upcoming.png",
  "lilithz.png": "/icons/lilith.taskz.webp",
  "logo.png": "/mcz-logo-v5.jpg",
  "managez.png": "/icons/managez.png",
  "messagez.png": "/icons/messagez-neon.svg",
  "messagez_outbox.png": "/icons/messagez_outbox.png",
  "mimez.png": "/icons/mimez-neon.svg",
  "mixez.png": "/icons/mixez.png",
  "occ.png": "/icons/occ-neon.svg",
  "opportunitiez.png": "/icons/opportunitiez-neon.svg",
  "offerz.png": "/icons/offerz-neon.svg",
  "adz.png": "/icons/adz-neon.svg",
  "money.png": "/icons/money-neon.svg",
  // New editions — neon signage dropped in Jul 16.
  "specz.png": "/icons/specz-neon.svg",
  "nationalitiez.png": "/icons/nationalitiez.png",
  "onboardz.png": "/icons/onboardz-neon.svg",
  // Neon rebuild of the cream/teal PostZ mark. The key stays the .png the
  // rest of the platform refers to and the value points at the SVG — the
  // same indirection "logo.png" → the .jpg already uses, and the reason this
  // registry maps names to paths instead of just globbing a folder.
  "postz.png": "/icons/postz-neon.svg",
  "personaz.png": "/icons/personaz-neon.svg",
  // ProfileZ used to borrow personaz.png. It has its own art in Corey's folder
  // now (profilez.png, applied through ICON_DEFAULTS once committed); until then
  // it keeps the glyph it was already showing.
  "profilez.png": "/icons/personaz-neon.svg",
  "personaz_arscout.png": "/icons/personaz_arscout.png",
  // Underscored like every other personaz_<role>, and matching its own key.
  // The dotted path was the source filename, which is what the import script
  // is for.
  "personaz_coach.jpg": "/icons/personaz_coach-neon.svg",
  "personaz_designer.png": "/icons/personaz_designer.png",
  // Manga-styled alternate art for the Designer PersonaZ — a Premium ICON only.
  // The PersonaZ itself is free to anyone; this is the cosmetic upgrade.
  "personaz_designer_manga.png": "/icons/personaz_designer_manga.png",
  "personaz_developer.png": "/icons/personaz_developer.png",
  "personaz_director.png": "/icons/personaz_director.png",
  "personaz_director.webp": "/icons/personaz_director.webp",
  "personaz_ghostwriter.png": "/icons/personaz_ghostwriter.png",
  "personaz_indieartist.png": "/icons/personaz_indieartist.png",
  "personaz_manager.png": "/icons/personaz_manager.png",
  "personaz_mime.png": "/icons/personaz_mime.png",
  "personaz_mixengineer.png": "/icons/personaz_mixengineer.png",
  "personaz_producer.png": "/icons/personaz_producer.png",
  "personaz_videographer.png": "/icons/personaz_videographer.png",
  "pickconz.png": "/icons/pickconz.png",
  "preferencez.png": "/icons/preferencez.png",
  "producez.png": "/icons/producez.png",
  "rapz.png": "/icons/rapz-neon.svg",
  "ratez.png": "/icons/ratez.png",
  "royaltiez.png": "/icons/royaltiez-neon.svg",
  "scoutz.png": "/icons/scoutz.png",
  "sentencez.png": "/icons/sentencez.png",
  "shotz.png": "/icons/shotz.png",
  "singz.png": "/icons/singz-neon.svg",
  "skillz.png": "/icons/skillz.png",
  "social_connectz.png": "/icons/social_connectz-neon.svg",
  "vybez.png": "/icons/vybez-neon.svg",
  "socialz.png": "/icons/socialz.png",
  "sonday.png": "/icons/sonday.png",
  "playlistz.png": "/icons/playlistz-neon.svg",
  "spinaz.png": "/icons/spinaz.png",
  "statsz.png": "/icons/statsz-neon.svg",
  "substancez.png": "/icons/substancez.png",
  "toolz_lilith.png": "/icons/toolz_lilith.png",
  "trump_toupee.png": "/icons/trump_toupee.png",
  "venuez.png": "/icons/venuez.png",
  "venuez_alt.png": "/icons/venuez_alt.png",
  "vis_group.png": "/icons/vis_group.png",
  "vis_private.png": "/icons/vis_private.png",
  "vis_public.png": "/icons/vis_public.png",
  "vis_restricted.png": "/icons/vis_restricted.png",
  "witchcraft.png": "/icons/witchcraft.png",
  "writez.png": "/icons/writez.png",
  // Live surfaces whose art was on disk but never registered — so they were
  // silently falling back to the MCZ logo on their own tab. WorkZ is new art.
  "workz.png": "/icons/workz.png",
  "habitz.png": "/icons/habitz-neon.svg",
  // .jpg — the art is journalz.jpg. Fourth of the four extension
  // mismatches; on the neon glyph until it lands, then only the path moves.
  "journalz.jpg": "/icons/journalz-neon.svg",
  "logz.png": "/icons/logz-neon.svg",
  "taskz.png": "/icons/taskz-neon.png",
  // Real art for both is committed (metz.jpg, tunerz.jpg) but measured
  // illegible at the 28-36px this app actually renders it — a busy neon-sign
  // frame plus a two-line text banner eats the pixel budget a metronome or
  // tuner silhouette needs, the exact CoachZ failure mode. The existing
  // hand-drawn glyphs stay wired until a simplified illustration replaces
  // them; verified in a live browser, not assumed.
  "metz.jpg": "/icons/metz-neon.svg",
  "tunerz.jpg": "/icons/tunerz-neon.svg",
  "chordz.jpg": "/icons/chordz-neon.svg",
  "drumz.png": "/icons/drumz-neon.svg",
  "toolz.png": "/icons/toolz-main.svg",
  // Registered ahead of the MCZ2 surface being wired up, so its rows don't
  // land as logos the day it is.
  "analytics.png": "/icons/analytics.png",
  "builder.png": "/icons/builder.png",
  "filez.png": "/icons/filez.png",
  "gamez.png": "/icons/gamez.png",
  // No artwork for SoundZ — it is a tab this session added, so it takes a
  // generated neon icon like FunnelZ does until there is a drawing for it.
  "soundz.png": "/icons/soundz-neon.svg",
  "soundcloudengagementz.png": "/icons/soundcloudengagementz-neon.svg",
  "gitz.png": "/icons/gitz.png",
  "pathz.png": "/icons/pathz.png",
  "imageconnectz.png": "/icons/imageconnectz.png",
  "instrumentalconnectz.png": "/icons/instrumentalconnectz.png",
  "languagez.png": "/icons/languagez.png",
  "languagez_pt.png": "/icons/languagez_pt.png",
  "membership.png": "/icons/membership.png",
  "merchz.png": "/icons/merchz.png",
  "moodz.png": "/icons/moodz.png",
  "onboardz.jpg": "/icons/onboardz-neon.svg",
  "parcel.png": "/icons/parcel.png",
  "personaz_weightlifter.png": "/icons/personaz_weightlifter.png",
  "preferencez_partner.jpg": "/icons/preferencez_partner.jpg",
  "sentencez_editor.png": "/icons/sentencez_editor.png",
  "tellz.png": "/icons/tellz.png",
  "tier_premium.png": "/icons/tier_premium.png",
  "tier_statz.png": "/icons/tier_statz.png",
  "videoz.png": "/icons/videoz.png",
  "zodiacz.png": "/icons/zodiacz.png",
  // BadgeZ artwork — each badge that has real art names it; the rest carry
  // their emoji. Registered so the fallback is the emoji, not a logo.
  "badge_owner.png": "/icons/badge_owner.png",
  "badge_founding.png": "/icons/badge_founding.png",
  "badge_gifted.png": "/icons/badge_gifted.png",
  "badge_sexy.png": "/icons/badge_sexy.png",
  "badge_polyglot.png": "/icons/badge_polyglot.png",
  "badge_patron.png": "/icons/badge_patron.png",
  "badgez.png": "/icons/badgez.png",
  // Reserved ahead of the artwork. These eight OCC tabs are on their emoji
  // until the art exists; the keys are registered now so dropping the file
  // into public/icons/ is the whole job — nothing here has to change. Missing
  // files fall back to the tab's emoji, not to the logo (see IconImg).
  // Owner-only tab — reserved ahead of the artwork, same as the rest above;
  // falls back to the MCZ logo until a file lands at /public/icons/funnelz.png.
  "funnelz.png": "/icons/funnelz-neon.svg",
};

// The sources an icon key may be drawn from, best first. Corey's own artwork
// (ICON_DEFAULTS, built from his icon folder) always leads; the registry entry —
// often a generated glyph — is the backup, never the other way round; the MCZ
// logo is the last resort. ICON_DEFAULTS lists only committed files, so the
// first source is never a known 404.
export const iconSources = (icon) => [...new Set([ICON_DEFAULTS[icon], CUSTOM_ICONS[icon]].filter(Boolean))];

// Renders a registry icon; if the file is missing (still being remade),
// falls back to the next source and then the MCZ logo instead of a broken image.
export function IconImg({ icon, alt = "", className = "", fallback = null }) {
  // A key can be registered before its artwork lands — that is deliberate, so
  // dropping the file into public/icons/ is the only step needed to light it
  // up. Until it does, the file 404s, and `fallback` is what the caller wants
  // shown instead of the MCZ logo (OCC passes the tab's emoji, which still
  // means the right thing where a generic logo would mean nothing).
  const [failed, setFailed] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => { setFailed(false); setN(0); }, [icon]);
  if (failed && fallback !== null) return fallback;
  const sources = iconSources(icon);
  return (
    <img
      src={sources[n] || "/mcz-logo-v4.png"}
      alt={alt}
      className={className}
      onError={(e) => {
        if (n + 1 < sources.length) {
          setN(n + 1);
          return;
        }
        if (fallback !== null) {
          setFailed(true);
          return;
        }
        if (!e.currentTarget.dataset.fbk) {
          e.currentTarget.dataset.fbk = "1";
          e.currentTarget.src = "/mcz-logo-v4.png";
        }
      }}
    />
  );
}

// LogicZ: every tab has its own address, named after the tab with the trailing
// Z dropped — /post, /battle, /sing. Derived from the key, never typed, because
// a hand-written address is one that drifts from the tab it names.
//
// Until this existed the whole app lived at "/" and switched tabs through a
// custom event: no tab could be linked, bookmarked, or reached with the back
// button. A screen with no address is one you can only tell somebody how to find.
export const slugFor = (key) =>
  key.endsWith("z") && key.length > 2 ? key.slice(0, -1) : key;
export const tabForSlug = (slug) =>
  TABS.find((t) => slugFor(t.key) === String(slug || "").toLowerCase());

const TABS = [
  { key: "toolz", label: "ToolZ", icon: "toolz.png", el: <ToolZMenu /> },
  { key: "onboardz", label: "OnboardZ", icon: "onboardz.png", el: <OnboardZ /> },
  { key: "postz", label: "PostZ", icon: "postz.png", el: <PostZ /> },
  { key: "playlistz", label: "PlaylistZ", icon: "playlistz.png", el: <PlaylistZ /> },
  { key: "social", label: "SocialiZeZ", icon: "social_connectz.png", el: <SocialConnectZ /> },
  // VybeZ gives /api/economy/members/ its first caller. That search — regions,
  // genders, both zodiacs, sober, substances, five range gates and distance —
  // has been implemented and reachable only by typing a URL.
  // Its own mark. It rendered `social_connectz.png` — the identical heart the
  // Social ConnectZ tab four rows up carries — so two tabs wore one icon and
  // neither said which was which. Social ConnectZ is the ROOM; VybeZ is
  // LOOKING, so the glyph is a lens with a heart in it.
  { key: "vybez", label: "VybeZ", icon: "vybez.png", el: <VybeZ /> },
  { key: "soundcloudengagementz", label: "SoundCloud Engagement", icon: "soundcloudengagementz.png", el: <SoundCloudEngagementZ /> },
  { key: "coachz", label: "CoachZ", icon: "coachz.jpg", el: <CoachZ /> },
  { key: "profilez", label: "ProfileZ", icon: "profilez.png", el: <ProfileZ /> },
  { key: "statsz", label: "StatsZ", icon: "statsz.png", el: <StatsZ /> },
  { key: "opportunitiez", label: "OpportunitieZ", icon: "opportunitiez.png", el: <OpportunitieZ /> },
  { key: "specz", label: "SpecZ", icon: "specz.png", el: <SpecZ /> },
  { key: "membershipz", label: "MembershipZ", icon: "money.png", el: <MembershipZ /> },
  { key: "adz", label: "AdZ", icon: "adz.png", el: <AdZ /> },
  { key: "offerz", label: "OfferZ", icon: "offerz.png", el: <OfferZ /> },
  { key: "mimez", label: "MimeZ", icon: "mimez.png", el: <MimeZ /> },
  { key: "directz", label: "DirectZ", icon: "directz.png", el: <DirectZ /> },
  { key: "lessonz", label: "LessonZ", icon: "lessonz.png", el: <LessonZ /> },
  { key: "singz", label: "SingZ", icon: "singz.png",
    el: <InstrumentZ appKey="singz" icon="singz.png" title="SingZ" accent="#f472b6"
        tagline="Vocal training game — range detection, quests, Boss SongZ, voice health first." /> },
  { key: "rapz", label: "RapZ", icon: "rapz.png",
    el: <InstrumentZ appKey="rapz" icon="rapz.png" title="RapZ" accent="#f59e0b"
        tagline="Rap training — 16 style tracks, breath control, combo meter, Boss Mode." /> },
  // These four had a real, scored, tested backend coach — /api/<key>/coach/,
  // /trial/, /progress/ and a SkillZ tree, all mounted — and no route a
  // signed-in member could reach any of it from. InstrumentZ has powered
  // them "via props" per its own comment since it was written; nothing ever
  // instantiated it here. See the note in InstrumentZ.jsx.
  { key: "guitarz", label: "GuitarZ", icon: "guitarz.png",
    el: <InstrumentZ appKey="guitarz" icon="guitarz.png" title="GuitarZ" accent="#eab308"
        tagline="Guitar training — timing, tone, technique, dynamics and cleanliness scored on every take, Boss Mode included." /> },
  { key: "bassz", label: "BassZ", icon: "bassz.png",
    el: <InstrumentZ appKey="bassz" icon="bassz.png" title="BassZ" accent="#7c3aed"
        tagline="Bass training — timing, tone, technique, dynamics and note length scored on every take, Boss Mode included." /> },
  { key: "keyz", label: "KeyZ", icon: "keyz.png",
    el: <InstrumentZ appKey="keyz" icon="keyz.png" title="KeyZ" accent="#38bdf8"
        tagline="Keys training — timing, tone, technique, dynamics and voicing scored on every take, Boss Mode included." /> },
  { key: "violinz", label: "ViolinZ", icon: "violinz.png",
    el: <InstrumentZ appKey="violinz" icon="violinz.png" title="ViolinZ" accent="#b45309"
        tagline="Strings training — intonation, tone, bowing, timing and vibrato scored on every take, Boss Mode included." /> },
  { key: "messagez", label: "MessageZ", icon: "messagez.png", el: <MessageZ /> },
  { key: "keyconnectz", label: "KeyConnectZ", icon: "keyconnectz.png", el: <KeyConnectZ /> },
  { key: "occ", label: "OCC", icon: "occ.png", el: <OCC /> },
  { key: "logz", label: "LogZ", icon: "logz.png", el: <LogZ /> },
  { key: "royaltiez", label: "RoyaltieZ", icon: "royaltiez.png", el: <RoyaltieZ /> },
  { key: "callz", label: "CallZ", icon: "callz.png", el: <CallZ /> },
  { key: "gamez", label: "GameZ", icon: "gamez.png", el: <GameZ /> },
  { key: "soundz", label: "SoundZ", icon: "soundz.png", el: <SoundZ /> },
  { key: "metz", label: "MetZ", icon: "metz.jpg", el: <MetZ /> },
  { key: "tunerz", label: "TunerZ", icon: "tunerz.jpg", el: <TunerZ /> },
  { key: "chordz", label: "ChordZ", icon: "chordz.jpg", el: <ChordZ /> },
  // The tab kept its name and its beat-sequencer practice pad (still `DrumZ`,
  // rendered inside InstrumentZ now rather than standing alone) and gained
  // the scored Boss Take coach the backend already had mounted at
  // /api/drumz/coach/ with nothing here pointing at it.
  { key: "drumz", label: "DrumZ", icon: "drumz.png",
    el: <InstrumentZ appKey="drumz" icon="drumz.png" title="DrumZ" accent="#ef4444"
        tagline="Timing, groove, dynamics, consistency and fills scored on every take — plus a practice pad to warm up on." /> },
  { key: "journalz", label: "JournalZ", icon: "journalz.jpg", el: <JournalZ /> },
  { key: "habitz", label: "HabitZ", icon: "habitz.png", el: <HabitZ /> },
  { key: "lilith", label: "Lilith", icon: "lilithz.png", el: <Lilith /> },
  { key: "bodiez", label: "BodieZ", icon: "bodiez.png", el: <BodieZ /> },
  { key: "collabz", label: "CollabZ", icon: "collabz.png", el: <CollabZ /> },
  { key: "venuez", label: "VenueZ", icon: "venuez.png", el: <VenueZ /> },
  { key: "battlez", label: "BattleZ", icon: "battlez.png", el: <BattleZ /> },
  { key: "labelz", label: "LabelZ", icon: "labelz.png", el: <LabelZ /> },
  { key: "groupz", label: "GroupZ", icon: "groupz.png", el: <GroupZ /> },
  { key: "bugz", label: "BugZ", icon: "bugz.png", el: <BugZ /> },
  { key: "dawz", label: "DawZ", icon: "dawz.png", el: <DawZ /> },
  // Owner-only — filtered out of the Dock for everyone else in Home(),
  // below. The route and TABS entry still exist for anyone who is the
  // owner and lands here directly (e.g. a bookmark), and FunnelZ itself
  // shows nothing to a non-owner even if they reach it another way.
  { key: "funnelz", label: "FunnelZ", icon: "funnelz.png", el: <FunnelZ /> },
  // Not owner-only, unlike FunnelZ: a member needs to see their own
  // duplicates to say which one is theirs. The server decides what each
  // person is shown — the owner every group, a member only their own.
  { key: "dupez", label: "DupeZ", icon: "personaz.png", el: <DupeZ /> },
  // The icon folder as a tree: each parent icon with its children named by
  // filename (battlez.png -> battlez.cypher.png). Owner-only — it is the
  // audit of which art is committed, wired, owed or unplaced, and the members
  // have no use for a list of what is missing.
  { key: "iconz", label: "IconZ", icon: "logo.png", el: <IconZ /> },
];

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/50">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading…
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

// "/" is the one URL that gets shared, indexed and clicked cold — the
// index.html SEO meta and every OG card point at it. A signed-in member
// should land in the app; anyone else gets the marketing page that makes
// good on what those links promised, not a bare "Welcome back" login form
// (that redirect is still what every OTHER protected route does — a deep
// link like /battle while logged out is someone who already knows what this
// is, and /login is the right place to send them).
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/50">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading…
      </div>
    );
  }
  return user ? <Home /> : <Landing />;
}

// Notifications button — opens the habit reminders panel
function NotificationsButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-mcz-cyan transition"
      title="View notifications"
    >
      <Bell size={16} />
    </button>
  );
}

// SoundzPanel button — opens sound preferences
function SoundzButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-mcz-cyan transition"
      title="Sound preferences"
    >
      <Volume2 size={16} />
    </button>
  );
}

// SoundZ on/off. It lives in the header rather than buried in a settings
// screen because it is the control somebody reaches for the moment a sound
// surprises them — a mute you have to go hunting for is one you resent.
// Flipping it ON plays the coin, so you hear what you just agreed to; the
// click is also the user gesture browsers require before any audio at all.
function SoundToggle() {
  const [on, setOn] = useState(isSoundOn);
  useEffect(() => {
    const h = (e) => setOn(!!e.detail);
    window.addEventListener("mcz-sound-changed", h);
    return () => window.removeEventListener("mcz-sound-changed", h);
  }, []);
  return (
    <button
      onClick={() => {
        const next = !on;
        setSoundOn(next);
        setOn(next);
        if (next) playSoundPreview();
      }}
      className={`rounded-lg p-1.5 transition hover:bg-white/10 ${
        on ? "text-mcz-cyan" : "text-white/40"}`}
      title={on ? "SoundZ on — resource changes make a sound" : "SoundZ off — turn sounds on"}
      aria-pressed={on}
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}

function CommunityBar({ onOpenMember, onOpenMembership, onOpenBirthday }) {
  const { openTransactions } = useTransactionModal();
  const [stats, setStats] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    let on = true;
    const load = () => api("/api/auth/stats/").then((s) => on && setStats(s)).catch(() => {});
    load();
    const t = setInterval(load, 60000); // refresh every minute
    return () => { on = false; clearInterval(t); };
  }, []);

  async function loadAllMembers() {
    setLoadingMembers(true);
    try {
      const response = await api("/api/auth/stats/all/");
      setMembers(response.members || []);
      setShowMembers(true);
    } catch (e) {
      console.error("Failed to load members:", e);
    } finally {
      setLoadingMembers(false);
    }
  }

  if (!stats) return null;
  return (
    <>
      <div className="neon-frame mb-6 space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button onClick={loadAllMembers} className="pill cursor-pointer hover:!border-mcz-cyan/70 hover:!bg-mcz-cyan/10 transition active:scale-95">
            👥 {stats.total_members} members
          </button>
        <span className="pill !border-emerald-400/40 !text-emerald-300">
          <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {stats.online_now} online now
        </span>
        <EnergyRegenerationDisplay />
        <button onClick={() => openTransactions({ emoji: "⚡", label: "Energy", key: "energy" })}
                className="pill !text-mcz-gold cursor-pointer hover:!border-mcz-gold/70 hover:!bg-mcz-gold/10 transition active:scale-95">
          ⚡ {stats.my_energy} Energy
        </button>
        <button onClick={() => openTransactions({ emoji: SPINAZ, label: "SpinaZ", key: "spinaz" })}
                className="pill !text-mcz-pink cursor-pointer hover:!border-mcz-pink/70 hover:!bg-mcz-pink/10 transition active:scale-95">
          {SPINAZ} {stats.my_spinaz} SpinaZ
        </button>
        {stats.my_promptz_daily != null && (
          <button onClick={() => openTransactions({ emoji: "🏷️", label: "PromptZ", key: "promptz" })}
                  className="pill !text-mcz-cyan cursor-pointer hover:!border-mcz-cyan/70 hover:!bg-mcz-cyan/10 transition active:scale-95"
                  title={`Free AI prompts today (free 1 · premium 5 · statZ 10) — reset daily, don't stack.${stats.my_promptz ? ` Plus ${stats.my_promptz} prepaid PromptZ.` : ""}`}>
            🏷️ {stats.my_promptz_daily_remaining}/{stats.my_promptz_daily} prompts
          </button>
        )}
        {stats.my_money != null && (
          <button onClick={() => openTransactions({ emoji: "💵", label: "Money", key: "money" })}
                  className="pill !text-emerald-400 cursor-pointer hover:!border-emerald-400/70 hover:!bg-emerald-400/10 transition active:scale-95">
            💵 ${(stats.my_money / 100).toFixed(2)}
          </button>
        )}
        {/* A fact with nowhere to take it — the cross-pollination rule's own
            failure case. Every other pill here opens something; this one just
            named a tier and stopped, on the one platform-wide surface that
            sells the ladder it's sitting on. */}
        <button onClick={() => onOpenMembership?.()}
                className="pill uppercase !text-mcz-cyan cursor-pointer hover:!border-mcz-cyan/70 hover:!bg-mcz-cyan/10 transition active:scale-95">
          {stats.my_tier}
        </button>
        {/* Same gap as the tier pill just above: a fact (your sign) with no
            way to reach the panel that says what it's actually worth. */}
        {stats.my_zodiac && (
          <button onClick={() => onOpenBirthday?.()}
                  className="pill cursor-pointer hover:!border-white/30 hover:!bg-white/10 transition active:scale-95">
            {stats.my_zodiac}
          </button>
        )}
      </div>
      {stats.online_members?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(stats.online_members || []).map((u) => (
            <button
              key={u}
              onClick={() => onOpenMember?.(u)}
              title={`View ${u}'s profile`}
              className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-400/20 hover:shadow-neon active:scale-95"
            >
              ● {u}
            </button>
          ))}
        </div>
      )}
      </div>

      {/* Members modal */}
      {showMembers && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="neon-frame max-h-[70vh] w-full max-w-md overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-display text-lg font-extrabold">Members ({members.length})</h3>
            {loadingMembers ? (
              <p className="flex items-center gap-2 text-white/50"><span className="animate-spin">⟳</span> Loading...</p>
            ) : members.length > 0 ? (
              <div className="space-y-2">
                {members.map((username, i) => (
                  // The row was one big button that only ever did one thing.
                  // The name still opens them; the second thing anyone wants
                  // from a list of people — say something — is beside it now.
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm transition hover:border-mcz-cyan/40 hover:bg-mcz-cyan/10"
                  >
                    <MemberName
                      username={username}
                      onOpen={(u) => { onOpenMember?.(u); setShowMembers(false); }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/50">No members found.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Post-login shell — modeled on the Music ConnectZ vA2.3 reference HTML:
// sticky gradient header (logo · title/date · balance · profile), a horizontal
// scrollable tab bar, and a card-style content area. Rebuilt in the neon MCZ
// theme with the new rainbow logo and the PostZ / Social ConnectZ / SpecZ /
// NationalitieZ editions from the synthesized blueprints.
// Corey-voice tab descriptions (blueprint Global Rule: "clicking the tab icon
// opens a modal showing the Corey voice description with emoji").
const TAB_ABOUT = {
  onboardz: "👋 OnboardZ — your guided first session. Set up your ProfileZ, drop your first PostZ, rate a few tracks, and refer a friend for 300 SpinaZ.",
  postz: "🎵 Drop your work as a PostZ. After 30s the community can rate it 1–10 (anyone but you); after 60s they can comment. Every rating you give earns +1 Energy.",
  social: "💓 Social matching, message boards and personality-based discovery. Filter creators by NationalitieZ heritage to find your people.",
  profilez: "🎭 Your public identity — pick every PersonaZ you play, set ZodiacZ from your birthday, and choose the NationalitieZ that represent your ancestry.",
  specz: "⭐ User metadata & UGC you attach to any app. A StatZ perk: buy SpecZ with SpinaZ to tune how your apps read you.",
  membershipz: "💳 MembershipZ — upgrade your tier to reach further. Lower platform fees, more Energy per top-up, more daily AI prompts, and the StatZ-only SpecZ marketplace. Connect with more collaborators. Founding members lock in 50% off for life.",
  adz: "📺 AdZ — watch a short rewarded ad and earn SpinaZ. Ads play in the mobile app via AdMob; your reward lands automatically when the ad finishes.",
  offerz: "🎁 OfferZ — complete offers (surveys, sign-ups, installs) on the offerwall and earn SpinaZ, credited automatically once the provider confirms.",
  mimez: "🤫 MimeZ — silent-performance training and practice drills.",
  directz: "🎬 DirectZ — directing tools and guided sessions.",
  lessonz: "📚 LessonZ — book and run lessons; teachers set skills, rates and availability.",
  singz: "🎤 SingZ — vocal training: range detection, quests, Boss SongZ — voice health first.",
  rapz: "🎤 RapZ — rap training: style tracks, breath control, combo meter, Boss Mode.",
  messagez: "📨 MessageZ — your messaging center: Inbox and Outbox.",
  journalz: "📔 JournalZ — your diary. A day, written down: mood, weather, tags, the people you were with and where you were. Every entry is private until you publish it — tagging somebody on a private entry tells them nothing. Your first entry each day completes a QuestZ daily.",
  collabz: "🤝 CollabZ — collaborate and manage projects: OriginalZ, CoverZ, RemixeZ.",
  venuez: "📍 VenueZ — CollabZ in a room. Whoever receives the skill pays for it, priced from whoever brings it: a performance charges the visitor at your rates, a session charges you at theirs. The area is public; the address is released only to somebody you accept.",
  battlez: "🪖 BattleZ — one post versus another. Verified 18+ can bet on themselves; others bet SpinaZ.",
  labelz: "🏷️ LabelZ — public groups with record-label logic: advances, terms, e-signed contracts (Premium / A&R Scout / Manager).",
  groupz: "👥 GroupZ — your own private lists. FriendZ and FanZ follow who follows whom, PartnerZ is earned by finishing collabs together, Blocked is the real block, and Custom is yours to make.",
  bugz: "🐞 BugZ — submit a bug as a post. Admins mark it In Progress or Squashed (Squashed rewards 200 SpinaZ).",
  dawz: "🎛️ DawZ — seven DAW knockoffs, none built yet. Vote for which one gets built next.",
  funnelz: "📊 FunnelZ — owner-only. The join funnel measured: landing → trial → register, real events and real unique visitors.",
  dupez: "👤 DupeZ — one person, one account. Accounts that look like the same member, what each one holds, and the one safe way to close the spare: yours goes when you say so, anyone else's is the owner's call.",
};

function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Read the slug off the path rather than from useParams: the tab routes are
  // listed explicitly (so an unknown address still redirects) and an explicit
  // path has no params to read.
  const slug = useLocation().pathname.replace(/^\/+|\/+$/g, "");
  const [tab, setTab] = useState(null); // decided from the URL or onboarded state
  const [infoKey, setInfoKey] = useState(null);
  // LogicZ: what each tab is and what lives inside it, from the server, so the
  // description a member reads can't drift from the thing they land on.
  const [logicz, setLogicz] = useState({});
  const [memberKey, setMemberKey] = useState(null); // username whose profile is open
  const [editMemberKey, setEditMemberKey] = useState(null); // username being edited (owner only)
  const [deleteMemberKey, setDeleteMemberKey] = useState(null); // username being deleted (owner only)
  const [notificationsOpen, setNotificationsOpen] = useState(false); // habit reminders panel
  const [soundzOpen, setSoundzOpen] = useState(false); // sound preferences panel
  const [tourMe, setTourMe] = useState(null); // account state the tour gates on
  // SplitZ — a second app mounted beside the first, real React trees, never
  // an iframe. StatZ keeps it; Premium samples it with an upgrade nudge on
  // the pane. Nulls out on every tab change: a split is a "look at these two
  // together" moment, not a standing layout that should survive navigating
  // away and quietly still be there ten screens later.
  const [splitKey, setSplitKey] = useState(null);
  const refreshTourMe = useCallback(() => {
    api("/api/auth/me/").then(setTourMe).catch(() => {});
  }, []);
  const idx = Math.max(0, TABS.findIndex((t) => t.key === tab));
  const active = TABS[idx];
  const infoTab = infoKey ? TABS.find((t) => t.key === infoKey) : null;
  const logic = infoTab ? logicz[infoTab.key] : null;
  const today = new Date().toLocaleDateString();
  // PickConnectZ dock — pinned apps + the ones this member opens most.
  const { usage, pins, hidden, togglePin, toggleHide } = usePickConnectZ(tab);
  // FunnelZ is owner-only real visitor data — not something to advertise in
  // the drawer for everyone. The route and TABS entry still exist (so the
  // info modal, ⓘ, and a direct link work for the owner); this only trims
  // what the Dock lists.
  const dockApps = user?.is_owner ? TABS : TABS.filter((t) => t.key !== "funnelz" && t.key !== "iconz");

  // One way in and out of a tab: set the state AND the address, together. Two
  // paths would let the URL say one thing while the screen showed another.
  const openTab = (key) => {
    setTab(key);
    setSplitKey(null);
    navigate(`/${slugFor(key)}`, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The two special-cased apps need callbacks a bare `t.el` doesn't carry, so
  // both the primary pane and the split pane resolve through this one
  // function rather than duplicating the ProfileZ/GroupZ branches.
  const appEl = (key) => {
    if (key === "profilez") {
      return <ProfileZ onViewProfile={setMemberKey} onMessage={() => openTab("messagez")} />;
    }
    if (key === "groupz") {
      return <GroupZ onViewProfile={setMemberKey} onMessage={() => openTab("messagez")} />;
    }
    return TABS.find((t) => t.key === key)?.el;
  };

  const go = (delta) => {
    const n = (idx + delta + TABS.length) % TABS.length;
    openTab(TABS[n].key);
  };

  // Lets any tab (e.g. OnboardZ steps) jump to another tab.
  useEffect(() => {
    const h = (e) => {
      if (TABS.some((t) => t.key === e.detail)) {
        setTab(e.detail);
        navigate(`/${slugFor(e.detail)}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("mcz-goto-tab", h);
    return () => window.removeEventListener("mcz-goto-tab", h);
  }, [navigate]);

  // Cross-pollination: mentions open profiles
  useEffect(() => {
    const h = (e) => {
      setMemberKey(e.detail);
    };
    window.addEventListener("mcz-goto-profile", h);
    return () => window.removeEventListener("mcz-goto-profile", h);
  }, []);

  useEffect(() => {
    api("/api/economy/logicz/")
      .then((d) => setLogicz(Object.fromEntries(asList(d?.tabs).map((t) => [t.key, t]))))
      .catch(() => {});   // the modal falls back to its built-in copy
  }, []);

  // The address decides the tab, so a pasted link, a bookmark and the back
  // button all land in the same place.
  useEffect(() => {
    const t = tabForSlug(slug);
    if (t && t.key !== tab) setTab(t.key);
  }, [slug]);

  // New users land on OnboardZ until they've completed it; returning users on PostZ.
  // A checkout return (?checkout=…) lands on MembershipZ so the result is shown.
  useEffect(() => {
    // An address wins over the default landing — someone opening /battle asked
    // for BattleZ, not for wherever we would have sent them.
    if (tabForSlug(slug)) return;
    if (new URLSearchParams(window.location.search).has("checkout")) {
      setTab("membershipz");
      return;
    }
    api("/api/auth/me/")
      .then((m) => setTab(m?.onboarded ? "postz" : "onboardz"))
      .catch(() => setTab("postz"));
  }, []);

  // Gate AFTER the hooks above, never before them. `tab` starts null, so an
  // early return here used to skip both useEffect calls on the very first
  // render — including the one that picks the tab — leaving nothing to ever
  // call setTab. The app sat on this spinner forever, with no request made
  // and nothing logged to the console.
  if (!tab) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/50">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading…
      </div>
    );
  }

  return (
    <TransactionModalProvider>
      <WidgetProvider>
      <div className="min-h-screen">
        {/* Sticky header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-mcz-bg/80 backdrop-blur">
        <div
          className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3"
          style={{ boxShadow: "0 1px 0 rgba(168,85,247,0.15)" }}
        >
          <div className="flex items-center gap-1">
            <a {...openable(`/${slugFor(TABS[(idx - 1 + TABS.length) % TABS.length].key)}`, () => go(-1))}
               className="rounded-lg p-1.5 text-white/60 hover:bg-white/10" title="Previous tab">
              <ChevronLeft size={18} />
            </a>
            <a {...openable(`/${slugFor(TABS[(idx + 1) % TABS.length].key)}`, () => go(1))}
               className="rounded-lg p-1.5 text-white/60 hover:bg-white/10" title="Next tab">
              <ChevronRight size={18} />
            </a>
          </div>

          <a {...openable("/tool", () => openTab("toolz"))} className="flex items-center gap-2"
             title="ToolZ — All Audio, Visual & App ToolZ">
            <img src="/icons/toolz-main.svg" alt="ToolZ" className="h-10 w-10 rounded-lg shadow-neon" onError={e => e.currentTarget.src = "/icons/toolz.png"} />
            <span className="hidden font-display text-lg font-extrabold tracking-tight sm:inline">
              Music ConnectZ
            </span>
          </a>

          {/* LogicZ: the tab's own icon, and clicking it opens the modal that
              says what this tab is. The control used to be text with a ⓘ — the
              icon is the thing the spec points at, and the thing a member's
              thumb actually finds. */}
          {/* `min-w-0` is load-bearing, not tidying. A flex item's default
              `min-width: auto` means this button could not shrink below its
              own text however much `flex-1` asked it to — so on a phone the
              tab name simply pushed the whole right-hand cluster off the
              screen. PostZ fitted, MessageZ went 2px over, and KeyConnectZ
              went 21px over with the Log out button entirely past the edge.
              Every long tab name (OpportunitieZ, MembershipZ,
              SoundCloudEngagementZ) was doing the same thing.

              It read as fine because the overflow is on the RIGHT, where a
              sticky header shows no scrollbar and nothing looks wrong until
              you go to press the control that isn't there. */}
          <button data-tour="tab-info"
                  className="flex min-w-0 flex-1 items-center justify-center gap-2"
                  onClick={() => setInfoKey(tab)} title="What is this tab?">
            {active?.icon && (
              <IconImg icon={active.icon} alt="" className="h-7 w-7 shrink-0 rounded-lg" />
            )}
            <span className="min-w-0 text-center">
              {/* Truncate rather than wrap: a two-line tab name would grow the
                  sticky header on the screen with the least height to spare. */}
              <span className="block truncate text-[11px] font-semibold text-white/70">
                {active?.label} <span className="text-white/30">ⓘ</span>
              </span>
              <span className="block truncate text-[9px] text-white/35">{today}</span>
            </span>
          </button>

          <a
            {...openable("/profile", () => openTab("profilez"))}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
            title="ProfileZ — ctrl/cmd-click for a new tab"
          >
            <IconImg icon="personaz.png" alt="" className="h-7 w-7 rounded-full object-cover" />
          </a>
          <NotificationsButton onClick={() => setNotificationsOpen(true)} />
          <SoundzButton onClick={() => setSoundzOpen(true)} />
          <SoundToggle />
          <button onClick={logout} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        {/* No tab bar: PickConnectZ at the foot of the screen is the primary
            nav. Its ⊞ drawer lists every app, so nothing is unreachable. */}
      </header>

      {/* pb leaves room for the fixed PickConnectZ dock */}
      <main className="mx-auto max-w-4xl px-4 pb-40 pt-5">
        <p className="mb-4 text-xs text-white/45">
          Signed in as <span className="text-white/80">{user?.username}</span>
        </p>
        <CommunityBar onOpenMember={setMemberKey} onOpenMembership={() => openTab("membershipz")}
                      onOpenBirthday={() => goToSpot("profilez", "birthday")} />
        <StorageWarning />
        {/* keyed by tab so switching apps clears a previous app's crash.
            SplitZ's pane sits beside it as a genuinely separate mounted
            tree with its own boundary — one pane crashing must not take the
            other down with it. */}
        <div className={splitKey ? "grid gap-4 lg:grid-cols-2" : ""}>
          <ErrorBoundary key={tab} label={active?.label}>
            <Suspense fallback={<RouteFallback />}>{appEl(tab)}</Suspense>
          </ErrorBoundary>
          {splitKey && (
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between rounded-lg bg-mcz-cyan/10 px-3 py-1.5">
                <span className="flex items-center gap-1.5 text-[11px] text-mcz-cyan">
                  <IconImg icon={TABS.find((t) => t.key === splitKey)?.icon} alt=""
                           className="h-4 w-4 rounded object-cover" />
                  SplitZ — {TABS.find((t) => t.key === splitKey)?.label}
                </span>
                <button onClick={() => setSplitKey(null)}
                        className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                        aria-label="Close SplitZ">
                  <X size={13} />
                </button>
              </div>
              {/* Premium is SAMPLING, not keeping — the CTA sits on the pane
                  every time it opens, cost/gain-style, because a StatZ perk
                  discovered by using it once and losing it the next session
                  reads as a bug rather than a reason to upgrade. */}
              {!isStatZTier(user?.tier) && (
                <button
                  onClick={() => { setSplitKey(null); openTab("membershipz"); }}
                  className="mb-2 flex w-full items-center justify-between rounded-lg border border-mcz-gold/30 bg-mcz-gold/10 px-3 py-2 text-left text-[11px] text-mcz-gold hover:bg-mcz-gold/15"
                >
                  <span>✨ You're sampling SplitZ — StatZ keeps it permanently.</span>
                  <span className="shrink-0 font-semibold underline">Upgrade →</span>
                </button>
              )}
              <ErrorBoundary key={splitKey} label={TABS.find((t) => t.key === splitKey)?.label}>
                <Suspense fallback={<RouteFallback />}>{appEl(splitKey)}</Suspense>
              </ErrorBoundary>
            </div>
          )}
        </div>
      </main>

      {/* Tab description modal — opened by clicking the active tab / its icon. */}
      {infoTab && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setInfoKey(null)}
        >
          <div
            className="neon-frame w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              <IconImg icon={infoTab.icon} alt="" className="h-14 w-14 rounded-2xl shadow-neon" />
              <h3 className="font-display text-2xl font-extrabold">{infoTab.label}</h3>
            </div>
            <p className="text-sm leading-relaxed text-white/75">
              {logic?.desc || TAB_ABOUT[infoTab.key] || "A Music ConnectZ app."}
            </p>

            {/* Its address. The whole point of LogicZ — this is the thing you
                paste to somebody. */}
            <p className="mt-3 font-mono text-[11px] text-mcz-cyan">
              musicconnectz.net/{slugFor(infoTab.key)}
            </p>

            {/* What lives in this tab, and honestly whether it exists yet. A
                modal promising five apps and delivering one is worse than one
                promising one. */}
            {logic?.apps?.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-3">
                {logic.apps.map((a) => (
                  <li key={a.name} className="flex items-start gap-2 text-[12px]">
                    <span className="shrink-0">{a.emoji}</span>
                    <span className="min-w-0">
                      {/* A built app that names a tab is a DOOR, not a line
                          of text. `tab` has been in the payload since `_app`
                          was written and nothing ever read it — the
                          cross-pollination rule broken on the one screen
                          whose entire job is telling a member what this app
                          has. A read-only surface is usually an unfinished
                          one. */}
                      {a.built && a.tab ? (
                        <button
                          onClick={() => { setInfoKey(null); openTab(a.tab); }}
                          className="text-left text-white/80 underline decoration-white/25 underline-offset-2 hover:text-mcz-cyan"
                        >
                          {a.name}
                        </button>
                      ) : (
                        <span className={a.built ? "text-white/80" : "text-white/40"}>
                          {a.name}
                        </span>
                      )}
                      {!a.built && (
                        <span className="ml-1 text-[10px] text-mcz-gold">not built yet</span>
                      )}
                      <span className="block text-[11px] leading-relaxed text-white/40">
                        {a.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <button className="re-btn mt-5" onClick={() => setInfoKey(null)}>Got it</button>
          </div>
        </div>
      )}

      {/* Habit reminders notification panel */}
      <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      {/* Sound preferences panel */}
      <SoundzPanel isOpen={soundzOpen} onClose={() => setSoundzOpen(false)} />

      {memberKey && (
        <Suspense fallback={null}>
          <MemberProfile
            username={memberKey}
            onClose={() => setMemberKey(null)}
            currentUsername={user?.username}
            onEditProfile={() => { setMemberKey(null); openTab("profilez"); }}
            isOwner={user?.is_owner}
            onEditMember={(u) => { setMemberKey(null); setEditMemberKey(u); }}
            onDeleteMember={(u) => { setDeleteMemberKey(u); }}
          />
        </Suspense>
      )}

      {editMemberKey && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setEditMemberKey(null)}>
          <div className="neon-frame w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-extrabold">Edit @{editMemberKey}</h3>
              <button onClick={() => setEditMemberKey(null)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            <p className="mb-4 text-sm text-white/60">Account editing interface would go here. For now, direct the owner to manage this account via the backend admin panel or create a dedicated account management interface.</p>
            <div className="flex gap-2">
              <button className="re-btn" onClick={() => setEditMemberKey(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteMemberKey && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDeleteMemberKey(null)}>
          <div className="neon-frame w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-display text-lg font-extrabold text-mcz-ember">Delete Account: @{deleteMemberKey}</h3>
            <p className="mb-4 text-sm text-white/75">This action is permanent and cannot be undone. All posts, uploads, and data associated with this account will be deleted.</p>
            <div className="flex gap-2">
              <button className="re-btn-ghost" onClick={() => setDeleteMemberKey(null)}>Cancel</button>
              <button className="re-btn !bg-mcz-ember/20 !text-mcz-ember hover:!bg-mcz-ember/40" onClick={async () => {
                try {
                  await api(`/api/auth/users/${encodeURIComponent(deleteMemberKey)}/`, { method: "DELETE" });
                  setDeleteMemberKey(null);
                  setMemberKey(null);
                } catch (e) {
                  alert(`Error: ${e.message}`);
                }
              }}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      <Tour me={tourMe} onRefreshMe={refreshTourMe} />

        <Dock
          apps={dockApps}
          usage={usage}
          pins={pins}
          hidden={hidden}
          tier={user?.tier}
          current={tab}
          onOpen={openTab}
          onTogglePin={togglePin}
          onToggleHide={toggleHide}
          onSplit={setSplitKey}
        />
      </div>
      </WidgetProvider>
      <TransactionModal />
    </TransactionModalProvider>
  );
}


/** A tab component served to somebody with no account.
 *
 * MetZ and ChordZ make no API calls and read no session, so the tab IS the
 * public tool — there is no second implementation to drift. This is only the
 * chrome around it: a way back to the front door, and the one line that says
 * what an account would add, because a free tool with no next step is a
 * bounce with a metronome in it.
 */
function PublicTool({ title, el }) {
  useEffect(() => { track("landing_view"); }, []);
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/login" className="text-sm text-white/60 hover:text-white">Sign in</Link>
      </header>
      <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-white">{title}</h1>
      <p className="mb-4 text-sm text-white/55">Free, no account, nothing to install.</p>
      <Suspense fallback={<div className="py-16 text-center text-white/40">Loading…</div>}>{el}</Suspense>
      <div className="mt-8 rounded-xl border border-mcz-ember/25 bg-mcz-ember/[0.07] p-4 text-center">
        <p className="mb-3 text-sm text-white/80">
          The tools are free forever. The coach is the reason people stay — one take,
          scored, no account needed either.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/test" className="re-btn re-btn-cyan !w-auto px-5">Two-minute PersonalitieZ test</Link>
          <Link to="/try" className="re-btn !w-auto px-5">Get a take scored</Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      {/* Public — readable with no account. By link, never by browse: there is
          no anonymous feed and no anonymous member search. */}
      <Route path="/p/:id" element={<PublicPost />} />
      <Route path="/u/:username" element={<PublicProfile />} />
      <Route path="/try" element={<TrialTake />} />
      {/* Matched BEFORE /try/:appKey — route order matters here, or the
          param route below would swallow this one first. BodieZ is not a
          scored instrument (no audio, no model), so it gets its own small
          trial screen rather than a mode bolted onto TrialTake's
          recorder-first flow. */}
      <Route path="/try/bodiez" element={<BodieZTrial />} />
      <Route path="/try/:appKey" element={<TrialTake />} />
      <Route path="/test" element={<PersonalityTest />} />
      <Route path="/test/:depth" element={<PersonalityTest />} />
      {/* The two tools that are pure client audio. No account, no server. */}
      <Route path="/tool/metz" element={<PublicTool title="MetZ" el={<MetZ />} />} />
      <Route path="/tool/chordz" element={<PublicTool title="ChordZ" el={<ChordZ />} />} />
      <Route path="/pl/:id" element={<PublicPlaylist />} />
      <Route path="/" element={<RootRoute />} />
      {/* LogicZ: one address per tab. Listed explicitly rather than as a
          catch-all so an unknown path still falls through to the redirect
          below instead of rendering an app shell with no tab in it. */}
      {TABS.map((t) => (
        <Route
          key={t.key}
          path={`/${slugFor(t.key)}`}
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
