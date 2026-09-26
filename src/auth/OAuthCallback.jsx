import { track } from "../track.js";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import AccountChoice from "./AccountChoice.jsx";
import { AuthShell } from "./Register.jsx";
import { finishImport, importPending } from "../SoundCloudImport.jsx";
import { finishConnect, connectPending } from "../connectOAuth.js";

export default function OAuthCallback() {
  const { oauth, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get provider and code from URL params — set by OAuthButtons before redirect
        const provider = sessionStorage.getItem("mcz_oauth_provider");
        const state = sessionStorage.getItem("mcz_oauth_state");
        const verifier = sessionStorage.getItem("mcz_oauth_verifier");
        const code = params.get("code");
        const returnedState = params.get("state");

        if (!provider || !code) {
          throw new Error("OAuth callback missing required parameters");
        }
        if (!state || state !== returnedState) {
          throw new Error("OAuth state mismatch — request may have been intercepted");
        }

        // A SoundCloud IMPORT reuses this whole dance — same authorize URL,
        // same redirect, same state check — and differs only in what the code
        // is spent on. Checked before the sign-in exchange because a code is
        // single-use: spending it on a sign-in would leave the import with
        // nothing to present.
        if (importPending()) {
          const out = await finishImport(code);
          navigate(`/post?imported=${out?.imported ?? 0}`);
          return;
        }

        // A logged-in member linking a new provider from ConnectionZ. Same
        // reason it's checked before the sign-in exchange: the code is
        // single-use, and this member is already signed in, so the "do you
        // already have an account?" question ahead doesn't apply to them —
        // routing them through it would sign them OUT of the account they
        // came here to add a provider to. Own try/catch: a failed link sends
        // them back to their profile with the reason, never the generic
        // "sign-in failed" screen below, which assumes nobody is logged in.
        if (connectPending()) {
          try {
            await finishConnect(provider, code, verifier);
            navigate(`/profile?connected=${encodeURIComponent(provider)}`);
          } catch (e) {
            navigate(`/profile?connect_failed=${encodeURIComponent(e.message)}`
              + `&provider=${encodeURIComponent(provider)}`);
          }
          return;
        }

        // Exchange code for user (backend will either auto-signin or ask "do you have one?")
        const payload = { code, redirect_uri: window.location.origin + "/oauth/callback" };
        if (verifier) payload.code_verifier = verifier;
        const result = await oauth(provider, payload);

        if (result?.needs_choice) {
          // Couldn't automatically link — ask user if they have an account
          setChoice(result);
        } else {
          // Auto-logged in
          navigate("/");
        }
      } catch (e) {
        setError(e.message || "OAuth sign-in failed");
      } finally {
        setBusy(false);
      }
    }

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateNew() {
    // User said "I'm new" — open the account from the signed pending token.
    //
    // This used to navigate to /register?pending=…&provider=… with a comment
    // saying "Register.jsx handles it". Register.jsx never read any of those
    // params, so every first-time visitor who tapped "I'm new" landed on the
    // blank manual signup form — no account made, nothing linked, and the
    // provider they had just authenticated with thrown away. The backend has
    // always accepted `{ pending }` and opens the account from it.
    setSigningIn(true);
    try {
      if (!choice?.pending) throw new Error("Missing pending token");
      await oauth(choice.provider, { pending: choice.pending });
      track("register_success");
      navigate("/");
    } catch (e) {
      setError(e.message);
      setSigningIn(false);
    }
  }

  async function handleSignInExisting() {
    // User said "I already have one" — go to login, then link OAuth after
    setSigningIn(true);
    try {
      if (!choice?.pending) throw new Error("Missing pending token");
      // Store the pending token in sessionStorage so Login can use it after signup
      sessionStorage.setItem("mcz_oauth_pending", choice.pending);
      sessionStorage.setItem("mcz_oauth_provider", choice.provider);
      navigate("/login");
    } catch (e) {
      setError(e.message);
      setSigningIn(false);
    }
  }

  // Loading
  if (busy) {
    return (
      <AuthShell title="Signing you in">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-mcz-cyan" size={32} />
          <p className="text-sm text-white/60">Connecting with OAuth provider…</p>
        </div>
      </AuthShell>
    );
  }

  // Error
  if (error && !choice) {
    return (
      <AuthShell title="Sign-in failed">
        <div className="space-y-4">
          <p className="text-sm text-mcz-ember">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="neon-btn-primary w-full"
          >
            Back to login
          </button>
        </div>
      </AuthShell>
    );
  }

  // "Do you already have an account?" choice
  if (choice?.needs_choice) {
    return (
      <AuthShell title="Welcome to Music ConnectZ">
        <AccountChoice
          choice={choice}
          onCreate={handleCreateNew}
          onSignIn={handleSignInExisting}
          busy={signingIn}
        />
        {error && <p className="text-sm text-mcz-ember mt-3">{error}</p>}
      </AuthShell>
    );
  }

  // Should not reach here
  return null;
}
