// The one OAuth-connect verification that exists: sign in with Google,
// grant read-only YouTube access, and the server reads the real
// subscriberCount in the same step — no code to paste, no AI page-read, no
// human queue. Everything else in LinksCard is best-effort by comparison.
//
// This does NOT reuse /oauth/callback (App.jsx's OAuthCallback) — that route
// only ever mounts the sign-in/link screen, not ProfileZ, so a callback sent
// there would never reach this card. Google is sent straight back to
// /profilez?yt=callback instead — the page this card already lives on — and
// this component picks the code/state off the query string itself.
import { useEffect, useRef, useState } from "react";
import { Loader2, Youtube } from "lucide-react";
import { api } from "../api.js";

const YT_REDIRECT = `${window.location.origin}/profilez?yt=callback`;
const YT = "/api/economy/social/verify/youtube/";

export default function YouTubeVerifyCard({ onChange }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("yt") !== "callback") return;
    const code = params.get("code");
    const state = params.get("state");
    const expected = sessionStorage.getItem("mcz_yt_state");
    sessionStorage.removeItem("mcz_yt_state");
    window.history.replaceState({}, "", window.location.pathname);
    if (!code) return;
    if (!state || state !== expected) {
      setMsg("That YouTube sign-in couldn't be verified — try connecting again.");
      return;
    }
    setBusy(true);
    api(YT, { method: "POST", body: { action: "finish", code, redirect_uri: YT_REDIRECT } })
      .then((r) => {
        setMsg(r.verified
          ? `Verified — ${r.followers.toLocaleString()} subscribers now count toward your reach.`
          : (r.detail || "Channel confirmed, but its subscriber count is hidden."));
        onChange?.();
      })
      .catch((e) => setMsg(e.message || "Couldn't verify that."))
      .finally(() => setBusy(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setBusy(true); setMsg("");
    try {
      const r = await api(YT, { method: "POST", body: { action: "start", redirect_uri: YT_REDIRECT } });
      sessionStorage.setItem("mcz_yt_state", r.state);
      window.location.href = r.auth_url;
    } catch (e) { setMsg(e.message || "Couldn't start YouTube verification."); setBusy(false); }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="flex items-center gap-2 text-[12px] text-white/70">
          <Youtube size={16} color="#FF0000" /> Verify your YouTube channel via Google — real subscriber count, one step.
        </span>
        <button className="re-btn !w-auto shrink-0 px-3 text-xs" disabled={busy} onClick={start}>
          {busy ? <Loader2 className="animate-spin" size={12} /> : "Connect"}
        </button>
      </div>
      {msg && <p className="px-1 text-[11px] text-mcz-gold">{msg}</p>}
    </div>
  );
}
