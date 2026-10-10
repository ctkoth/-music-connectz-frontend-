import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "../../src/auth/AuthContext.jsx";
import Login from "../../src/auth/Login.jsx";
import Register from "../../src/auth/Register.jsx";
import ForgotPassword from "../../src/auth/ForgotPassword.jsx";
import DeleteAccount from "./DeleteAccount.jsx";

const SentenceConnectZ = lazy(() => import("../../src/apps/SentenceConnectZ.jsx"));

// The privacy policy and terms are the main site's, and they are what a Play
// reviewer opens. They sit under both the signed-out and the signed-in screens so
// neither state is the one without them, and the sign-up screen — where somebody
// is about to hand over what they write — has them in view.
const MAIN = (import.meta.env.VITE_MCZ_URL || "https://musicconnectz.net").replace(/\/$/, "");

function PolicyLinks() {
  return (
    <p className="mt-6 pb-6 text-center text-[11px] text-white/45">
      <a className="underline" href={`${MAIN}/privacy.html`} target="_blank" rel="noreferrer">Privacy policy</a>
      {" · "}
      <a className="underline" href={`${MAIN}/terms.html`} target="_blank" rel="noreferrer">Terms</a>
    </p>
  );
}

function Home() {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="sr-only">Sentence ConnectZ</h1>
      <div className="mb-3 flex items-center justify-between text-xs text-white/50">
        <span>Signed in as {user.username}</span>
        <button className="inline-flex items-center gap-1 hover:text-white" onClick={logout}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
      <Suspense fallback={<Loader2 className="mx-auto mt-10 animate-spin" size={20} />}>
        <SentenceConnectZ />
      </Suspense>
      {/* Said before anything is sent, not buried in the policy: what a member
          types is sent to a third-party AI service to be written. */}
      <p className="mt-8 text-center text-[11px] text-white/45">
        What you type is sent to Google's Gemini to be written, and kept in your recent pieces.
        Same account and data as <a className="underline" href={MAIN} target="_blank" rel="noreferrer">Music ConnectZ</a>.
      </p>
      <DeleteAccount />
      <PolicyLinks />
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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
