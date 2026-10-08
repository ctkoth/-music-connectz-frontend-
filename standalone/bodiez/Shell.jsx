import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "../../src/auth/AuthContext.jsx";
import { slugFor } from "../../src/App.jsx";
import Login from "../../src/auth/Login.jsx";
import Register from "../../src/auth/Register.jsx";
import ForgotPassword from "../../src/auth/ForgotPassword.jsx";

const BodieZ = lazy(() => import("../../src/apps/BodieZ.jsx"));

// Where "Post to PostZ", "Send to a coach" and "Train in person" go: the full
// app. Those buttons switch tabs INSIDE Music ConnectZ, and there is no tab to
// switch to here — left alone they would be buttons that do nothing, the worst
// failure this codebase can ship. The member lands on the right app; the
// prefilled text does not travel (a handoff lives in sessionStorage, which does
// not cross origins), and the member signs in there once.
const MAIN = (import.meta.env.VITE_MCZ_URL || "https://musicconnectz.net").replace(/\/$/, "");

function Home() {
  const { user, logout } = useAuth();

  useEffect(() => {
    const open = (e) => window.open(`${MAIN}/${slugFor(String(e.detail || ""))}`, "_blank", "noopener");
    window.addEventListener("mcz-goto-tab", open);
    return () => window.removeEventListener("mcz-goto-tab", open);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <h1 className="sr-only">BodieZ</h1>
      <div className="mb-3 flex items-center justify-between text-xs text-white/50">
        <span>Signed in as {user.username}</span>
        <button className="inline-flex items-center gap-1 hover:text-white" onClick={logout}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
      <Suspense fallback={<Loader2 className="mx-auto mt-10 animate-spin" size={20} />}>
        <BodieZ />
      </Suspense>
      <p className="mt-8 text-center text-[11px] text-white/35">
        Same account and data as <a className="underline" href={MAIN} target="_blank" rel="noreferrer">Music ConnectZ</a>.
      </p>
    </main>
  );
}

export default function Shell() {
  const { user, loading } = useAuth();
  if (loading) return <Loader2 className="mx-auto mt-24 animate-spin" size={22} role="status" aria-label="Loading" />;
  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
