import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Home, Loader2, LogOut, MessageSquare, Music, PenLine, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../src/auth/AuthContext.jsx";
import { lazyRoute } from "../../src/chunkError.js";
import Login from "../../src/auth/Login.jsx";
import Register from "../../src/auth/Register.jsx";
import ForgotPassword from "../../src/auth/ForgotPassword.jsx";
import DeleteAccount from "./DeleteAccount.jsx";

// The IntelligenceZ app: sign-in, and the four IntelligenceZ screens that stand
// on their own, with the hub as Home. Everything else on Music ConnectZ is not
// here, and the screens know it (src/standalone.js: IN_SHELL) — no door to a
// screen this shell lacks, and nothing that offers a purchase.
const Hub = lazy(lazyRoute(() => import("../../src/apps/IntelligenceZ.jsx")));
const Write = lazy(lazyRoute(() => import("../../src/apps/SentenceConnectZ.jsx")));
const Chat = lazy(lazyRoute(() => import("../../src/apps/OCC.jsx")));
const Compose = lazy(lazyRoute(() => import("../../src/apps/InstrumentalConnectZ.jsx")));
const Master = lazy(lazyRoute(() => import("../../src/apps/MixConnectZ.jsx")));

// `key` is the Music ConnectZ tab each screen is (what goToSpot / goToTab name),
// `path` is where it lives in the hash. A child that sends a member to another
// child calls goToSpot("occ", …) exactly as it does on the main site; the shell
// answers the same event App.jsx answers.
const TABS = [
  { key: "intelligencez", path: "", label: "Home", Icon: Home, Screen: Hub },
  { key: "sentenceconnectz", path: "write", label: "Write", Icon: PenLine, Screen: Write },
  { key: "occ", path: "chat", label: "Chat", Icon: MessageSquare, Screen: Chat },
  { key: "instrumentalconnectz", path: "compose", label: "Compose", Icon: Music, Screen: Compose },
  { key: "mixconnectz", path: "master", label: "Master", Icon: SlidersHorizontal, Screen: Master },
];
const byPath = (p) => TABS.find((t) => t.path === p);
const byKey = (k) => TABS.find((t) => t.key === k);

// The privacy policy and terms are the main site's, and they are what a Play
// reviewer opens. They sit under both the signed-out and the signed-in screens so
// neither state is the one without them, and the sign-up screen — where somebody
// is about to hand over what they write — has them in view.
const MAIN = (import.meta.env.VITE_MCZ_URL || "https://musicconnectz.net").replace(/\/$/, "");

// Each link is its own touch target (a11y.css gives every link on a touch screen
// a 44px floor), so they are laid out as a row of targets rather than as links
// inside a sentence, where that floor stretches the line they sit in.
function PolicyLinks() {
  const link = "px-1 text-[11px] text-white/55 underline";
  return (
    <nav aria-label="Policies" className="mt-4 flex flex-wrap items-center justify-center gap-x-3 pb-6">
      <a className={link} href={`${MAIN}/privacy.html`} target="_blank" rel="noreferrer">Privacy policy</a>
      <a className={link} href={`${MAIN}/terms.html`} target="_blank" rel="noreferrer">Terms</a>
      <a className={link} href={`${MAIN}/delete-account.html`} target="_blank" rel="noreferrer">Delete your account</a>
      <a className={link} href={MAIN} target="_blank" rel="noreferrer">Music ConnectZ</a>
    </nav>
  );
}

// Said on every screen, in what is TRUE of that screen: three of them are AI
// output and one is not. "Written by AI" under a mastering screen where no model
// is involved would be a claim about the code that the code does not back.
const DISCLOSURE = {
  intelligencez: "What the AI makes can be wrong. Read it before you use it.",
  sentenceconnectz: "Written by AI. Check it before you use it.",
  occ: "Chat replies are written by AI and can be wrong. Check them before you use them.",
  instrumentalconnectz: "Composed by AI. Listen to it before you use it.",
  mixconnectz: "Mastering here is measured signal processing on your device. No AI model is involved.",
};

const Spinner = () => <Loader2 className="mx-auto mt-10 animate-spin" size={20} role="status" aria-label="Loading" />;

// Every screen the member has opened stays mounted and is only hidden when they
// leave it. Switching to Chat to check something must not empty a half-written
// resume brief, or throw away a master that took a minute to make.
function Screens({ active }) {
  const [opened, setOpened] = useState(() => new Set([active]));
  useEffect(() => {
    setOpened((cur) => (cur.has(active) ? cur : new Set(cur).add(active)));
  }, [active]);
  const prev = useRef(active);
  useEffect(() => {
    // Anything that is playing stops when the member leaves its screen — a
    // master's A/B preview should not keep going underneath Chat.
    if (prev.current !== active) {
      window.dispatchEvent(new CustomEvent("mcz-shell-leave", { detail: prev.current }));
      prev.current = active;
    }
  }, [active]);
  return TABS.filter((t) => opened.has(t.key)).map(({ key, Screen }) => (
    <section key={key} hidden={key !== active} aria-label={byKey(key).label}>
      <Suspense fallback={<Spinner />}>
        <Screen />
      </Suspense>
    </section>
  ));
}

function TabBar() {
  return (
    <nav aria-label="IntelligenceZ"
         className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07060d]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map(({ path, label, Icon }) => (
          <li key={label} className="flex-1">
            <NavLink to={`/${path}`} end
                     className={({ isActive }) => `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${
                       isActive ? "text-mcz-cyan" : "text-white/55 hover:text-white"}`}>
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Signed() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const here = byPath(location.pathname.replace(/^\//, "").split("/")[0]);
  const active = (here || TABS[0]).key;

  // A child's door to another child. App.jsx answers this same event on the main
  // site; here it switches the hash route. A key this shell does not have does
  // nothing, and the children do not render a door to one in the first place.
  useEffect(() => {
    const h = (e) => {
      const t = byKey(e.detail);
      if (!t) return;
      navigate(`/${t.path}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("mcz-goto-tab", h);
    return () => window.removeEventListener("mcz-goto-tab", h);
  }, [navigate]);

  // An address this shell does not have lands on Home rather than on nothing.
  if (!here && location.pathname !== "/") return <Navigate to="/" replace />;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
      <h1 className="sr-only">IntelligenceZ</h1>
      <div className="mb-3 flex items-center justify-between text-xs text-white/50">
        <span>Signed in as {user.username}</span>
        <button className="inline-flex items-center gap-1 hover:text-white" onClick={logout}>
          <LogOut size={13} /> Sign out
        </button>
      </div>

      <Screens active={active} />

      {/* Said on every screen, not buried in the policy. */}
      <p className="mt-8 text-center text-[11px] text-white/55">{DISCLOSURE[active]}</p>
      <DeleteAccount />
      <PolicyLinks />
      <TabBar />
    </main>
  );
}

export default function Shell() {
  const { user, loading } = useAuth();
  if (loading) return <Loader2 className="mx-auto mt-24 animate-spin" size={22} role="status" aria-label="Loading" />;
  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
        <PolicyLinks />
      </>
    );
  }
  return (
    // One route for every screen, so moving between them never remounts the
    // shell (and with it the screens that are kept alive inside it).
    <Routes>
      <Route path="*" element={<Signed />} />
    </Routes>
  );
}
