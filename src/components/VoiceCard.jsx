import { useState } from "react";
import { Lock, MessageSquare } from "lucide-react";
import { saveVoice, useVoice } from "../voice.js";

/** VoiceZ — how hard the app talks to you. The switches are independent, so
 *  they're three toggles rather than one "tone" dropdown. Explicit is the
 *  only one with a gate, and when the server refuses it the reason goes on
 *  screen: a toggle that flips back with no explanation is worse than one
 *  that was never offered. */
export default function VoiceCard() {
  const voice = useVoice();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function set(key, value) {
    setMsg(""); setBusy(key);
    try {
      await saveVoice({ [key]: value });
    } catch (e) {
      // The real reason, never a cheerful lie — the explicit switch 400s for
      // an account too young for it and that has to be readable.
      setMsg(e.message || "Couldn't save that.");
    } finally { setBusy(""); }
  }

  const rows = [
    ["slang", "Slang", "How this place actually talks. Off gets you the plain version of everything."],
    ["emoji", "Emoji", "Ornament only — \u26a1 \ud83c\udf65 \ud83c\udff7\ufe0f \ud83d\udcb5 \u2b50 stay either way, because they say WHICH resource moved, not how you feel about it."],
    ["explicit", "Explicit", voice.explicit_allowed
      ? "Swearing on. Nothing else changes."
      : "18+. Add a birthday in ProfileZ that says so and this unlocks."],
  ];

  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        <MessageSquare size={13} className="text-mcz-cyan" /> VoiceZ
      </p>
      {rows.map(([key, label, note]) => {
        const locked = key === "explicit" && !voice.explicit_allowed;
        const on = !!voice[key];
        return (
          <button
            key={key}
            type="button"
            disabled={locked || busy === key}
            onClick={() => set(key, !on)}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
              locked ? "cursor-not-allowed border-white/[0.06] opacity-50"
                     : on ? "border-mcz-cyan/50 bg-mcz-cyan/[0.06]" : "border-white/10 hover:border-white/25"
            }`}
          >
            <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition ${
              on ? "justify-end border-mcz-cyan bg-mcz-cyan/25" : "justify-start border-white/20 bg-white/5"}`}>
              <span className={`mx-0.5 h-3.5 w-3.5 rounded-full ${on ? "bg-mcz-cyan" : "bg-white/40"}`} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">
                {label} {locked && <Lock size={11} className="ml-1 inline text-white/40" />}
              </span>
              <span className="block text-[11px] leading-relaxed text-white/50">{note}</span>
            </span>
          </button>
        );
      })}
      {msg && <p className="text-[11px] text-mcz-ember">{msg}</p>}
    </div>
  );
}

