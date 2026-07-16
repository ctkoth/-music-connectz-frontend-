import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, LogOut } from "lucide-react";
import { useAuth } from "./auth/AuthContext.jsx";
import Login from "./auth/Login.jsx";
import Register from "./auth/Register.jsx";
import ForgotPassword from "./auth/ForgotPassword.jsx";
import ResetPassword from "./auth/ResetPassword.jsx";
import MimeZ from "./apps/MimeZ.jsx";
import DirectZ from "./apps/DirectZ.jsx";
import LessonZ from "./apps/LessonZ.jsx";
import InstrumentZ from "./apps/InstrumentZ.jsx";
import MessageZ from "./apps/MessageZ.jsx";
import ProfileZ from "./apps/ProfileZ.jsx";
import GroupZ from "./apps/GroupZ.jsx";
import CollabZ from "./apps/CollabZ.jsx";
import BattleZ from "./apps/BattleZ.jsx";
import LabelZ from "./apps/LabelZ.jsx";
import BugZ from "./apps/BugZ.jsx";
import Mcz2App from "./mcz2/Mcz2App.jsx";

// CUSTOM_ICONS registry — keyed to EXACT filenames (platform convention).
// Complete platform set from Corey's icon inventory (Jul 6). Missing files
// fall back to the MCZ logo via <IconImg> until dropped into /public/icons/.
export const CUSTOM_ICONS = {
  "arsenal.png": "/icons/arsenal.png",
  "azrael.png": "/icons/azrael.png",
  "background.png": "/icons/background.png",
  "battlez.png": "/icons/battlez.png",
  "boardz.png": "/icons/boardz.png",
  "bodiez.png": "/icons/bodiez.png",
  "bugz.png": "/icons/bugz.png",
  "callz.png": "/icons/callz.png",
  "callz_ai.png": "/icons/callz_ai.png",
  "callz_ai.webp": "/icons/callz_ai.webp",
  "callz_user.png": "/icons/callz_user.png",
  "callz_user.webp": "/icons/callz_user.webp",
  "cleanconnectz.png": "/icons/cleanconnectz.png",
  "collabz.png": "/icons/collabz.png",
  "collabz_originalz.png": "/icons/collabz_originalz.png",
  "collabz_remixez.png": "/icons/collabz_remixez.png",
  "coverz.png": "/icons/coverz.png",
  "crewz.png": "/icons/crewz.png",
  "dawz.png": "/icons/dawz.png",
  "dawz_formulawon.png": "/icons/dawz_formulawon.png",
  "designz.png": "/icons/designz.png",
  "developz.png": "/icons/developz.png",
  "instrumentz.png": "/icons/instrumentz.png",
  "drumz.png": "/icons/drumz.png",
  "violinz.png": "/icons/violinz.png",
  "guitarz.png": "/icons/guitarz.png",
  "bassz.png": "/icons/bassz.png",
  "keyz.png": "/icons/keyz.png",
  "directz.png": "/icons/directz.png",
  "distributez.png": "/icons/distributez.png",
  "energy.png": "/icons/energy.png",
  "facez.png": "/icons/facez.png",
  "favicon.webp": "/favicon.webp",
  "fruity_mobius.png": "/icons/fruity_mobius.png",
  "groupz.png": "/icons/groupz.png",
  "groupz_blocked.png": "/icons/groupz_blocked.png",
  "groupz_custom.png": "/icons/groupz_custom.png",
  "groupz_fanz.png": "/icons/groupz_fanz.png",
  "groupz_friendz.png": "/icons/groupz_friendz.png",
  "homez.png": "/icons/homez.png",
  "imagez.png": "/icons/imagez.png",
  "inbox.png": "/icons/inbox.png",
  "inbox_alt.png": "/icons/inbox_alt.png",
  "intelligence.png": "/icons/intelligence.png",
  "intuition.png": "/icons/intuition.png",
  "keyconnectz.png": "/icons/keyconnectz.png",
  "labelz.png": "/icons/labelz.png",
  "lessonz.png": "/icons/lessonz.png",
  "lilith_anytime.png": "/icons/lilith_anytime.png",
  "lilith_logbook.png": "/icons/lilith_logbook.png",
  "lilith_today.png": "/icons/lilith_today.png",
  "lilith_today2.png": "/icons/lilith_today2.png",
  "lilith_trash.png": "/icons/lilith_trash.png",
  "lilith_upcoming.png": "/icons/lilith_upcoming.png",
  "logo.png": "/mcz-logo-v4.png",
  "managez.png": "/icons/managez.png",
  "messagez.png": "/icons/messagez.png",
  "messagez_outbox.png": "/icons/messagez_outbox.png",
  "mimez.png": "/icons/mimez.png",
  "mixez.png": "/icons/mixez.png",
  "nationalitiez.png": "/icons/nationalitiez.png",
  "occ.png": "/icons/occ.png",
  "onboardz.jpg": "/icons/onboardz.jpg",
  "specz.png": "/icons/specz.png",
  "personaz.png": "/icons/personaz.png",
  "personaz_arscout.png": "/icons/personaz_arscout.png",
  "personaz_designer.png": "/icons/personaz_designer.png",
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
  "preferencez_partner.jpg": "/icons/preferencez_partner.jpg",
  "producez.png": "/icons/producez.png",
  "rapz.png": "/icons/rapz.png",
  "ratez.png": "/icons/ratez.png",
  "royaltiez.png": "/icons/royaltiez.png",
  "scoutz.png": "/icons/scoutz.png",
  "sentencez.png": "/icons/sentencez.png",
  "shotz.png": "/icons/shotz.png",
  "singz.png": "/icons/singz.png",
  "skillz.png": "/icons/skillz.png",
  "social_connectz.png": "/icons/social_connectz.png",
  "socialz.png": "/icons/socialz.png",
  "sonday.png": "/icons/sonday.png",
  "spinaz.png": "/icons/spinaz.png",
  "substancez.png": "/icons/substancez.png",
  "toolz.png": "/icons/toolz.png",
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
  "zodiacz.png": "/icons/zodiacz.png",
};

// Renders a registry icon; if the file is missing (still being remade),
// falls back to the MCZ logo instead of a broken image.
export function IconImg({ icon, alt = "", className = "" }) {
  return (
    <img
      src={CUSTOM_ICONS[icon] || "/mcz-logo-v4.png"}
      alt={alt}
      className={className}
      onError={(e) => {
        if (!e.currentTarget.dataset.fbk) {
          e.currentTarget.dataset.fbk = "1";
          e.currentTarget.src = "/mcz-logo-v4.png";
        }
      }}
    />
  );
}

// Tabs organized into labeled sections so the nav reads as a small app
// launcher instead of one long crowded row. Each group keeps its members
// together; TABS below is the flattened list used for active-tab lookup.
const TAB_GROUPS = [
  {
    label: "Train",
    tabs: [
      { key: "lessonz", label: "LessonZ", icon: "lessonz.png", el: <LessonZ /> },
      { key: "drumz", label: "DrumZ", icon: "drumz.png",
        el: <InstrumentZ appKey="drumz" icon="drumz.png" title="DrumZ" accent="#4da6ff"
            tagline="Drum training — technique, timing, rudiments, chops & fills." /> },
      { key: "violinz", label: "ViolinZ", icon: "violinz.png",
        el: <InstrumentZ appKey="violinz" icon="violinz.png" title="ViolinZ" accent="#c084fc"
            tagline="Violin training — posture, bowing, intonation, repertoire." /> },
      { key: "guitarz", label: "GuitarZ", icon: "guitarz.png",
        el: <InstrumentZ appKey="guitarz" icon="guitarz.png" title="GuitarZ" accent="#4ade80"
            tagline="Guitar training — chords, strumming, riffs, lead." /> },
      { key: "bassz", label: "BassZ", icon: "bassz.png",
        el: <InstrumentZ appKey="bassz" icon="bassz.png" title="BassZ" accent="#fb923c"
            tagline="Bass training — groove, fingerstyle, slap, locking in." /> },
      { key: "keyz", label: "KeyZ", icon: "keyz.png",
        el: <InstrumentZ appKey="keyz" icon="keyz.png" title="KeyZ" accent="#22e6ff"
            tagline="Keyboard training — hands, chords, scales, reading." /> },
      { key: "singz", label: "SingZ", icon: "singz.png",
        el: <InstrumentZ appKey="singz" icon="singz.png" title="SingZ" accent="#f472b6"
            tagline="Vocal training game — range detection, quests, Boss SongZ, voice health first." /> },
      { key: "rapz", label: "RapZ", icon: "rapz.png",
        el: <InstrumentZ appKey="rapz" icon="rapz.png" title="RapZ" accent="#f59e0b"
            tagline="Rap training — 16 style tracks, breath control, combo meter, Boss Mode." /> },
    ],
  },
  {
    label: "Create",
    tabs: [
      { key: "mimez", label: "MimeZ", icon: "mimez.png", el: <MimeZ /> },
      { key: "directz", label: "DirectZ", icon: "directz.png", el: <DirectZ /> },
      { key: "collabz", label: "CollabZ", icon: "collabz.png", el: <CollabZ /> },
      { key: "labelz", label: "LabelZ", icon: "labelz.png", el: <LabelZ /> },
    ],
  },
  {
    label: "Community",
    tabs: [
      { key: "battlez", label: "BattleZ", icon: "battlez.png", el: <BattleZ /> },
      { key: "messagez", label: "MessageZ", icon: "messagez.png", el: <MessageZ /> },
      { key: "groupz", label: "GroupZ", icon: "groupz.png", el: <GroupZ /> },
      { key: "profilez", label: "ProfileZ", icon: "personaz.png", el: <ProfileZ /> },
    ],
  },
  {
    label: "System",
    tabs: [
      { key: "bugz", label: "BugZ", icon: "bugz.png", el: <BugZ /> },
    ],
  },
];

const TABS = TAB_GROUPS.flatMap((g) => g.tabs);

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

function CommunityBar() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let on = true;
    const load = () => api("/api/auth/stats/").then((s) => on && setStats(s)).catch(() => {});
    load();
    const t = setInterval(load, 60000); // refresh every minute
    return () => { on = false; clearInterval(t); };
  }, []);
  if (!stats) return null;
  return (
    <div className="neon-frame mb-6 space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="pill">👥 {stats.total_members} members</span>
        <span className="pill !border-emerald-400/40 !text-emerald-300">
          <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {stats.online_now} online now
        </span>
        <span className="pill !text-mcz-gold">⚡ {stats.my_energy} Energy</span>
        <span className="pill !text-mcz-pink">✦ {stats.my_spinaz} SpinaZ</span>
        <span className="pill uppercase !text-mcz-cyan">{stats.my_tier}</span>
        {stats.my_zodiac && <span className="pill">{stats.my_zodiac}</span>}
      </div>
      {stats.online_members?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.online_members.map((u) => (
            <span key={u} className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              ● {u}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Home() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(null); // null = launcher home screen
  const active = TABS.find((t) => t.key === tab);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      {/* Logo doubles as a home button back to the launcher */}
      <button
        onClick={() => setTab(null)}
        className="mb-5 flex items-center gap-3 text-left transition hover:opacity-90"
      >
        <img
          src="/mcz-logo-v4.png"
          alt="Music ConnectZ"
          className="h-11 w-11 rounded-xl shadow-neon"
        />
        <span className="font-display text-xl font-extrabold tracking-tight">
          Music ConnectZ
        </span>
      </button>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-white/55">
          Signed in as <span className="text-white">{user?.username}</span>
        </p>
        <button onClick={logout} className="neon-btn-ghost !w-auto px-3 py-2 text-xs">
          <LogOut size={14} /> Log out
        </button>
      </div>

      {active ? (
        <>
          {/* App view — back bar + title, then the app itself */}
          <div className="mb-5 flex items-center gap-3">
            <button
              onClick={() => setTab(null)}
              className="neon-btn-ghost !w-auto px-3 py-2 text-xs"
            >
              <ChevronLeft size={14} /> Home
            </button>
            <div className="flex items-center gap-2">
              <IconImg icon={active.icon} alt="" className="h-6 w-6 rounded-lg" />
              <span className="font-display text-lg font-bold tracking-tight">
                {active.label}
              </span>
            </div>
          </div>
          {active.el}
        </>
      ) : (
        <>
          <CommunityBar />

          {/* Icon-grid launcher — grouped app tiles, phone home-screen style */}
          <div className="space-y-6">
            {TAB_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-widest text-white/35">
                  {group.label}
                </p>
                <div className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-5">
                  {group.tabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className="group flex flex-col items-center gap-2 rounded-2xl p-1 transition"
                    >
                      <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition group-hover:-translate-y-0.5 group-hover:border-white/25 group-hover:shadow-neon">
                        <IconImg icon={t.icon} alt="" className="h-full w-full object-cover" />
                      </span>
                      <span className="text-center text-xs font-semibold text-white/60 transition group-hover:text-white">
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OAuthCallback() {
  const { oauth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const provider = sessionStorage.getItem("mcz_oauth_provider") || "github";
    if (!code) {
      navigate("/login", { replace: true });
      return;
    }
    const redirect =
      import.meta.env.VITE_OAUTH_REDIRECT || `${window.location.origin}/oauth/callback`;
    const body = { code, redirect_uri: redirect };
    const verifier = sessionStorage.getItem("mcz_oauth_verifier");
    if (verifier) body.code_verifier = verifier;
    oauth(provider, body)
      .then(() => navigate("/", { replace: true }))
      .catch((e) => setError(e.message));
  }, [oauth, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-white/60">
      {error ? (
        <>
          <p className="text-mcz-pink">{error}</p>
          <button className="neon-btn-ghost !w-auto px-4 py-2" onClick={() => navigate("/login")}>
            Back to login
          </button>
        </>
      ) : (
        <>
          <Loader2 className="animate-spin" size={20} /> Finishing sign-in…
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      {/* code_2.2 rebuild — lives at /v2 during the phased port; / flips to it at cutover. */}
      <Route
        path="/v2"
        element={
          <RequireAuth>
            <Mcz2App />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
