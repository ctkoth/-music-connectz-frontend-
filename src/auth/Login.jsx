import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, UserCircle2 } from "lucide-react";
import PasswordField from "./PasswordField.jsx";
import { useAuth } from "./AuthContext.jsx";
import OAuthButtons from "./OAuthButtons.jsx";
import { AuthShell, safeNext } from "./Register.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // A guest who hit a gated action while browsing without an account (see
  // GuestCTA.jsx) may already have one — landing back on it after LOGIN
  // matters exactly as much as it does after registering.
  const next = safeNext(params.get("next"));
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
      navigate(next || "/");
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

      <OAuthButtons onSuccess={() => navigate(next || "/")} onError={setError} />

      <p className="pt-2 text-center text-sm text-white/55">
        New here?{" "}
        <Link to={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-mcz-cyan hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
