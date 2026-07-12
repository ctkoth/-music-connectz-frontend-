import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PasswordField from "./PasswordField.jsx";
import { api, tokenStore } from "../api.js";
import { useAuth } from "./AuthContext.jsx";
import { AuthShell } from "./Register.jsx";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { oauth } = useAuth(); // reuse provider-agnostic persist? we set manually below
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw !== pw2) return setMsg("Passwords don't match.");
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/auth/password/reset/", {
        method: "POST", auth: false,
        body: { uid: params.get("uid"), token: params.get("token"), new_password: pw },
      });
      tokenStore.set(r.access, r.refresh);
      window.location.href = "/"; // full reload so AuthContext bootstraps the session
    } catch (err) { setMsg(err.message); setBusy(false); }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You're seconds from being back in.">
      <form onSubmit={submit} className="space-y-3">
        <PasswordField placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <PasswordField placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        {msg && <p className="text-sm text-mcz-pink">{msg}</p>}
        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null} Set new password
        </button>
      </form>
      <p className="pt-2 text-center text-sm text-white/55">
        Link expired? <Link to="/forgot" className="text-mcz-cyan hover:underline">Request a new one</Link>
      </p>
    </AuthShell>
  );
}
