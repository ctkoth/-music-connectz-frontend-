// "Do you already have an account?" — asked once, where we genuinely can't tell.
//
// Every member gets one account, and this is the one moment a second one used
// to get made by accident. A provider that hands over no email (Twitter gives
// none at all) matches nothing, so signing in with it opened a NEW account for
// somebody who already had one — every single time, not occasionally.
//
// Two things this deliberately is not:
//
//   * It is NOT asked on every sign-in. A known identity is decided by a unique
//     constraint and a verified address links silently; asking a returning
//     member would be friction on the common path and would train people to
//     click through an identity question, which is how a safeguard turns into
//     a duplicate factory.
//   * It is NOT a wall. "I'm new" always works. A member whose only sign-in is
//     a provider we can't match has to be able to join, or the safeguard
//     becomes a limit that says WHETHER — and those don't make people upgrade,
//     they make people leave.
//
// "I already have one" cannot be taken on trust either: saying so doesn't merge
// anything. It sends them to sign in the way they already can, and the provider
// gets linked from there — which is the existing link flow, and the only version
// of "yes" that isn't an account takeover.
import { useState } from "react";
import { Loader2, UserPlus, LogIn } from "lucide-react";

export default function AccountChoice({ choice, onCreate, onSignIn, busy }) {
  const [picked, setPicked] = useState("");
  if (!choice?.needs_choice) return null;

  const provider = (choice.provider || "").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="neon-frame space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-extrabold">
          Do you already have an account?
        </h2>
        <p className="text-sm text-white/60">
          {choice.email
            ? <>We couldn't match <b className="text-white/80">{choice.email}</b> to an existing account.</>
            : <>{provider} doesn't tell us your email, so we can't tell whether you've been here before.</>}
        </p>
        {/* The rule this exists to serve, said plainly at the moment it applies. */}
        <p className="text-[11px] text-white/40">
          Everyone gets one account, so it's worth a second to get this right.
        </p>
      </div>

      <button
        className="neon-btn-primary w-full justify-center"
        disabled={busy}
        onClick={() => { setPicked("new"); onCreate?.(); }}
      >
        {busy && picked === "new"
          ? <Loader2 className="animate-spin" size={15} />
          : <UserPlus size={15} />}
        {" "}I'm new — create my account
        {choice.suggested_username && (
          <span className="ml-1 text-white/50">as @{choice.suggested_username}</span>
        )}
      </button>

      <button
        className="re-btn w-full justify-center"
        disabled={busy}
        onClick={() => { setPicked("old"); onSignIn?.(); }}
      >
        <LogIn size={15} /> I already have one — sign me in
      </button>

      {/* Said before the second button is pressed, so nobody expects a merge
          and finds a login form. */}
      <p className="text-[11px] leading-relaxed text-white/40">
        Signing in the way you normally do keeps everything you've made. You can
        link {provider} to that account afterwards, and it'll sign you straight
        in next time.
      </p>
    </div>
  );
}
