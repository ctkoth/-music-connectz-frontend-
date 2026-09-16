import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserCircle2 } from "lucide-react";
import PasswordField from "./PasswordField.jsx";
import { useAuth } from "./AuthContext.jsx";
import OAuthButtons from "./OAuthButtons.jsx";
import { AuthShell } from "./Register.jsx";
import { track } from "../track.js";
import { api } from "../api.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkFailed, setLinkFailed] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const clearPending = () => {
    sessionStorage.removeItem("mcz_oauth_pending");
    sessionStorage.removeItem("mcz_oauth_provider");
  };

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      track("login_success");

      // If there's a pending OAuth link from the "I already have one" flow, link it now
      const pendingProvider = sessionStorage.getItem("mcz_oauth_provider");
      const pendingToken = sessionStorage.getItem("mcz_oauth_pending");
      if (pendingProvider && pendingToken) {
        try {
          // `pending`, not `code` — the authorization code was spent on the
          // exchange that produced this token, so the signed result of that
          // exchange is what proves the sign-in happened.
          await api(`/api/auth/oauth/${pendingProvider}/link/`, {
            method: "POST",
            body: { pending: pendingToken },
          });
          clearPending();
          track("oauth_linked", { provider: pendingProvider });
        } catch (linkErr) {
          // The member answered "I already have one" to get this account
          // linked, so a link that did not happen is the thing they came for
          // failing. Saying nothing and going home told them it worked —
          // which is how the key-name bug stayed invisible for as long as it
          // was live, and is the failure class this app has shipped before.
          //
          // The sign-in itself DID succeed, so it is never undone and never
          // re-asked. The token is dropped either way: it is single-use and
          // expires in fifteen minutes, so keeping it only means a stale
          // retry on some later login.
          clearPending();
          track("oauth_link_fail", { provider: pendingProvider, error: linkErr.message });
          setLinkFailed({ provider: pendingProvider, reason: linkErr.message });
          return; // stay put — the retry control is the button on this screen
        }
      }

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Signed in, but the thing they came here to do did not happen. Leads with
  // the SERVER'S sentence — it knows whether the token went stale, the
  // provider is already spoken for, or the sign-in could not be verified, and
  // those need different answers. The retry is the provider button below,
  // which is why this stays on the login screen instead of going home.
  if (linkFailed) {
    const name = linkFailed.provider.charAt(0).toUpperCase() + linkFailed.provider.slice(1);
    return (
      <AuthShell title="Signed in" subtitle={`But we couldn't link your ${name}.`}>
        <div className="space-y-3">
          <div className="rounded-xl border border-mcz-ember/40 bg-mcz-ember/5 p-4">
            <p className="text-sm text-mcz-ember">{linkFailed.reason}</p>
            <p className="pt-2 text-sm text-white/70">
              You're logged in and nothing about your account changed — only
              the {name} link didn't go through.
            </p>
          </div>
          <button className="neon-btn-primary" onClick={() => navigate("/")}>
            Continue to Music ConnectZ
          </button>
          <p className="text-center text-sm text-white/55">
            Or try {name} again — you'll come straight back here.
          </p>
          <OAuthButtons onSuccess={() => navigate("/")} onError={setError} />
          {error && <p className="text-sm text-mcz-pink">{error}</p>}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in with your username, email, or phone.">
      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <UserCircle2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            className="neon-input pl-10"
            placeholder="Username, email, or phone"
            value={form.identifier}
            onChange={set("identifier")}
            autoComplete="username"
            required
          />
        </div>
        <PasswordField placeholder="Password" value={form.password} onChange={set("password")} autoComplete="current-password" />

        <div className="text-right">
          <Link to="/forgot" className="text-xs text-mcz-cyan hover:underline">Forgot password?</Link>
        </div>
        {error && <p className="text-sm text-mcz-pink">{error}</p>}

        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null}
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>

      <OAuthButtons onSuccess={() => navigate("/")} onError={setError} />

      <p className="pt-2 text-center text-sm text-white/55">
        New here?{" "}
        <Link to="/register" className="text-mcz-cyan hover:underline">
          Create an account
        </Link>
        {" "}or{" "}
        <Link to="/try" className="text-mcz-cyan hover:underline">
          try a free scored take first
        </Link>
      </p>
    </AuthShell>
  );
}
