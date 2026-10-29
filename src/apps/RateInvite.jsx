// /rate/<handle> — somebody invited you to get your OWN LookZMaxZ reading. Public, because the
// person reading it usually has no account yet. It explains the rule (your photo, your score, your
// choice who sees it), credits the inviter as an explicit invite, and lands on LookZMaxZ after
// sign-in with the inviter already filled in as who to share with — if they want to.
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { setLanding } from "../landing.js";
import { REF_KEY } from "../referral.js";

export default function RateInvite() {
  const { handle } = useParams();
  const { user, loading } = useAuth();
  const [d, setD] = useState(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    api(`/api/economy/lookmaxz/invite/${encodeURIComponent(handle)}/`, { auth: false })
      .then((r) => {
        setD(r);
        // An explicit invite wins over any page-owner credit, the same as ?ref= on a join link.
        try { localStorage.setItem(REF_KEY, r.username); } catch { /* the ?ref on Join still carries it */ }
        setLanding(`/lookmaxz?for=${encodeURIComponent(r.username)}`);
      })
      .catch(() => setGone(true));
  }, [handle]);

  if (!loading && user && d) return <Navigate to={`/lookmaxz?for=${encodeURIComponent(d.username)}`} replace />;
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center space-y-4 p-6 text-white">
      <h1 className="font-display text-2xl font-extrabold">✨ LookZMaxZ</h1>
      {gone && <p className="text-white/70">That invite link doesn't point at a member any more.</p>}
      {d && (
        <>
          <p className="text-sm leading-snug text-white/80">{d.what}</p>
          <p className="text-[12px] leading-snug text-white/55">{d.rule}</p>
          <div className="flex flex-wrap gap-2">
            <Link className="re-btn !w-auto px-4" to={`/register?ref=${encodeURIComponent(d.username)}`}>Join free</Link>
            <Link className="re-btn !w-auto px-4" to="/login">I have an account</Link>
          </div>
        </>
      )}
    </div>
  );
}
