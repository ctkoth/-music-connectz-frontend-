import { useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext.jsx";

// "Signed in as @dupe — switch back to @main". Shown only while this device is
// holding another account's session for the member (DupeZ's sign-in-to-confirm),
// and only while they are NOT in that account. One tap, no password: the whole
// point of keeping the session is that the way back costs nothing.
//
// It decides nothing. Whether a session is kept, and for whom, is `returnTo.js`;
// this renders the answer and the one control.
export default function ReturnBar() {
  const { user, returnTo, switchBack } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!user || !returnTo || returnTo === user.username) return null;

  async function back() {
    setBusy(true);
    setFailed(false);
    const ok = await switchBack();
    // On a stale session the member lands on sign-in with nothing signed in;
    // there is nothing left to render here, so the failure is stated on the
    // login screen's own flow rather than swallowed.
    if (!ok) setFailed(true);
    setBusy(false);
  }

  return (
    <div className="border-b border-mcz-cyan/25 bg-mcz-cyan/10 px-4 py-1.5 text-[12px] text-white/80">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Signed in as <span className="font-semibold">@{user.username}</span>.{" "}
          <span className="font-semibold">@{returnTo}</span> is still signed in on this device.
        </span>
        <button
          onClick={back}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-mcz-cyan/40 px-2 py-0.5 font-semibold text-mcz-cyan hover:bg-mcz-cyan/10 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
          Switch back to @{returnTo}
        </button>
        {failed && <span className="text-mcz-ember">That session has expired. Sign in again.</span>}
      </div>
    </div>
  );
}
