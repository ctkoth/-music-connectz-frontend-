// The one-tap join on every public page (Corey: every public page needs the OAuth CTA). A slim bar at the
// bottom; tapping it opens the same OAuthButtons the sign-up screen leads with, right here, so a visitor
// joins without leaving the post, profile or take they were looking at. Hidden on the auth screens (they
// already lead with it), in the standalone shells (no OAuth there), and once closed for this visit.
import { Suspense, lazy, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
// Loaded only when the bar is opened, so the sign-in code is not in every visitor's first download.
const OAuthButtons = lazy(() => import("../auth/OAuthButtons.jsx"));

const AUTH_PATHS = ["/login", "/register", "/forgot", "/reset-password", "/oauth/callback"];
const KEY = "mcz_joinbar_closed";

export default function JoinBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [closed, setClosed] = useState(() => { try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; } });
  if (import.meta.env.VITE_STANDALONE || closed || AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;
  const close = () => { setClosed(true); try { sessionStorage.setItem(KEY, "1"); } catch { /* this view only */ } };
  return (
    <>
    {/* Room at the foot of the page so the bar never covers its last line. */}
    <div aria-hidden="true" className={open ? "h-64" : "h-16"} />
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-mcz-bg/95 px-4 py-2 backdrop-blur" role="region" aria-label="Join Music ConnectZ">
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-2 pl-10">
        {!open ? (
          <>
            <p className="min-w-0 flex-1 text-xs text-white/75">Join free👾 — post📤 your work, ask the coach🎤, collab🤝 with others and battle⚔️ them.</p>
            <button type="button" className="neon-btn-primary !w-auto !py-2 px-4 text-xs" onClick={() => setOpen(true)}>Join free in one tap</button>
          </>
        ) : (
          <div className="w-full space-y-2 py-1">
            <p className="text-sm font-semibold text-white">Join free👾 in one tap — then post📤, get coached🎤, collab🤝 and battle⚔️</p>
            <Suspense fallback={<p className="text-xs text-white/50">Loading sign-in…</p>}><OAuthButtons first onSuccess={() => navigate(pathname === "/" ? "/" : pathname, { replace: true })} onError={setErr} /></Suspense>
            {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}
            <button type="button" className="text-xs text-white/50 underline" onClick={() => navigate("/register")}>Or sign up with email</button>
          </div>
        )}
        <button type="button" aria-label="Close" className="shrink-0 text-white/40 hover:text-white" onClick={close}><X size={16} /></button>
      </div>
    </div>
    </>
  );
}
