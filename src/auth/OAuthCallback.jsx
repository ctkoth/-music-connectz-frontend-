import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import AccountChoice, { choiceRoutes } from "./AccountChoice.jsx";
import { AuthShell } from "./Register.jsx";
import { finishImport, importPending } from "../SoundCloudImport.jsx";
import { finishConnect, connectPending } from "../connectOAuth.js";
import { REDIRECT } from "../oauthProviders.jsx";
import { isAppHandoff, appReturnUrl, callbackParams } from "../externalAuth.js";

export default function OAuthCallback() {
  const { oauth, login } = useAuth();
  const navigate = useNavigate();
  // Query AND fragment: Google's and Apple's redirect flows put the identity
  // token in the fragment.
  const [params] = useState(() => callbackParams());
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  // This page, in a Chrome tab, on its way back to the app. The app holds the
  // state and verifier, so it is the one that spends the code — never this tab.
  const [handoff] = useState(() =>
    isAppHandoff(params.get("state")) ? appReturnUrl(`?${params.toString()}`, params.get("state")) : "");

  useEffect(() => {
    async function handleCallback() {
      if (handoff) {
        setBusy(false);
        // Chrome may refuse an app launch nobody tapped for; the button below
        // is the tap.
        window.location.href = handoff;
        return;
      }
      try {
        // Get provider and code from URL params — set by OAuthButtons before redirect
        const provider = sessionStorage.getItem("mcz_oauth_provider");
        const state = sessionStorage.getItem("mcz_oauth_state");
        const verifier = sessionStorage.getItem("mcz_oauth_verifier");
        const code = params.get("code");
        const idToken = params.get("id_token");
        const returnedState = params.get("state");

        // The member pressed Cancel / Deny on the provider's page. Not a
        // fault — say it plainly instead of "missing required parameters".
        const denied = params.get("error");
        if (denied) {
          sessionStorage.removeItem("mcz_oauth_state");
          sessionStorage.removeItem("mcz_oauth_verifier");
          throw new Error(denied === "access_denied" || denied === "user_cancelled_login"
            ? "Sign-in was cancelled. Nothing was created — try again or use email."
            : `The provider refused the sign-in: ${params.get("error_description") || denied}`);
        }
        if (!provider || !(code || idToken)) {
          throw new Error("OAuth callback missing required parameters");
        }
        if (!state || state !== returnedState) {
          throw new Error("This sign-in link expired or was opened in a different tab. Start again from the login page.");
        }
        // One use: a code and its state are spent the moment they are read.
        sessionStorage.removeItem("mcz_oauth_state");

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
        // Must be byte-identical to the redirect_uri the authorize URL carried
        // (REDIRECT) — Twitter, Facebook and GitHub reject the exchange otherwise.
        // Google/Apple through the device browser: the token IS the sign-in.
        const payload = idToken && (provider === "google" || provider === "apple")
          ? { id_token: idToken }
          : { code, redirect_uri: REDIRECT };
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
    setSigningIn(true);
    try { await choiceRoutes(choice, navigate, oauth).create(); }
    catch (e) { setError(e.message); setSigningIn(false); }
  }

  function handleSignInExisting() {
    try { choiceRoutes(choice, navigate, oauth).signIn(); }
    catch (e) { setError(e.message); }
  }

  if (handoff) {
    return (
      <AuthShell title="Back to the app">
        <div className="space-y-4 text-center">
          <p className="text-sm text-white/70">
            You're signed in with the provider. Finish in the Music ConnectZ app.
          </p>
          <a href={handoff} className="neon-btn-primary block w-full">Open Music ConnectZ</a>
          <p className="text-xs text-white/40">You can close this tab afterwards.</p>
        </div>
      </AuthShell>
    );
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
