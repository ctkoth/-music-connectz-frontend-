import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AtSign, Gift, Loader2, Phone, User } from "lucide-react";
import PasswordField from "./PasswordField.jsx";
import { useAuth } from "./AuthContext.jsx";
import OAuthButtons from "./OAuthButtons.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = (params.get("ref") || "").trim();
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", password2: "", birthday: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await register({ ...form, birthday: form.birthday || null, ref });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Join Music ConnectZ — train, create, climb the SkillZ board.">
      {ref && (
        <div className="flex items-center gap-2 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-sm text-mcz-ember">
          <Gift size={15} /> Invited by <span className="font-semibold">{ref}</span> — you start with <span className="font-semibold">100 SpinaZ</span>, they earn 300.
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <Field icon={User} placeholder="Username" value={form.username} onChange={set("username")} autoComplete="username" />
        <Field icon={AtSign} type="email" placeholder="Email" value={form.email} onChange={set("email")} autoComplete="email" />
        <Field icon={Phone} type="tel" placeholder="Phone number" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        <div className="relative">
          <input type="date" className="neon-input" value={form.birthday} onChange={set("birthday")}
                 aria-label="Birthday (for ZodiacZ)" />
          <p className="mt-1 text-[11px] text-white/35">Birthday (optional) — unlocks your ZodiacZ sign</p>
        </div>
        <PasswordField placeholder="Password (8+ characters)" value={form.password} onChange={set("password")} autoComplete="new-password" />
        <PasswordField placeholder="Repeat password" value={form.password2} onChange={set("password2")} autoComplete="new-password" />

        {error && <p className="text-sm text-mcz-pink">{error}</p>}

        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null}
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <OAuthButtons onSuccess={() => navigate("/")} onError={setError} />

      <p className="pt-2 text-center text-sm text-white/55">
        Already have an account?{" "}
        <Link to="/login" className="text-mcz-cyan hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
      <input className="neon-input pl-10" {...props} required={props.placeholder !== "Phone number"} />
    </div>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center gap-3">
        <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-12 w-12 rounded-xl shadow-neon" />
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-white/55">{subtitle}</p>}
        </div>
      </div>
      <div className="neon-frame space-y-5 p-6">{children}</div>
    </div>
  );
}
