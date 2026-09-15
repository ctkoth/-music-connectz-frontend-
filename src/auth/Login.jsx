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

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

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
          sessionStorage.removeItem("mcz_oauth_pending");
          sessionStorage.removeItem("mcz_oauth_provider");
          track("oauth_linked_after_login", { provider: pendingProvider });
        } catch (linkErr) {
          // Link failed, but login succeeded — still redirect, they can link manually later
          console.warn("OAuth link failed after login:", linkErr);
          track("oauth_link_failed", { provider: pendingProvider, error: linkErr.message });
        }
      }

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
