import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserCircle2 } from "lucide-react";
import { api } from "../api.js";
import { AuthShell } from "./Register.jsx";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/auth/password/forgot/", {
        method: "POST", auth: false, body: { identifier },
      });
      setMsg(r.detail);
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your username, email, or phone — we'll email you a reset link.">
      <form onSubmit={submit} className="space-y-3">
        <div className="relative">
          <UserCircle2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input className="neon-input pl-10" placeholder="Username, email, or phone"
                 value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
        {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-cyan">{msg}</p>}
        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null} Send reset link
        </button>
      </form>
      <p className="pt-2 text-center text-sm text-white/55">
        Remembered it? <Link to="/login" className="text-mcz-cyan hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
