import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserCircle2 } from "lucide-react";
import PasswordField from "./PasswordField.jsx";
import { useAuth } from "./AuthContext.jsx";
import OAuthButtons from "./OAuthButtons.jsx";
import { AuthShell } from "./Register.jsx";
import { track } from "../track.js";
import { claimTrialTake, storedTrialToken } from "../trialClaim.js";
import { goToSpot } from "../goto.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // A take recorded at /try, before this person signed in. It used to be
  // claimable only by REGISTERING, so somebody who already had an account and
  // pressed Sign in watched it disappear.
  const hasTrial = !!storedTrialToken();

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // The take is not a dead end after a login either: land on the app it went
  // to, at the control that plays it, rather than announcing a success at the
  // top of the feed.
  async function landTrialTake() {
    const claim = await claimTrialTake();
    if (!claim) return false;
    const [tab, anchor] = String(claim.open_in || "").split(":");
    if (!tab) return false;
    goToSpot(tab, anchor || "");
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      track("login_success");
      navigate("/");
      landTrialTake();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in with your username, email, or phone.">
      {/* Say it BEFORE they sign in, not after. Somebody who recorded a take
          at the door and is now looking at a password field needs to know the
          take is still coming with them — that is the whole reason they are
          on this screen rather than closing the tab. */}
      {hasTrial && (
        <p className="mb-3 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">
          🎤 Your scored take is waiting — sign in and it lands in your account.
        </p>
      )}
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

      <OAuthButtons onSuccess={() => { navigate("/"); landTrialTake(); }} onError={setError} />

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
