import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function PasswordField({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
      <input
        className="neon-input pl-10 pr-11"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        minLength={8}
      />
      <button type="button" aria-label={show ? "Hide password" : "View password"}
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
