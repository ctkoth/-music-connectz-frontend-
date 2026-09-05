// The front door: one Boss Take, scored, no account.
//
// Reading about a vocal coach persuades nobody. Being told your take is a 6,
// and exactly which two things cost you the other four, is a different
// conversation entirely. So the trial is the product, not a tour of it.
//
// The take is not a dead end. The score comes back with a claim token, kept
// here and handed to /register, so the thing they made at the door opens
// inside SingZ once they join.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import BossTake from "./BossTake.jsx";
import { track } from "../track.js";
import { keepTrialToken } from "../trialClaim.js";

const APPS = { singz: "SingZ", rapz: "RapZ" };

// Re-exported so nothing that already imports them from here has to move. The
// storage itself lives in trialClaim.js now, because signing IN has to reach
// it too and an auth screen importing a lazy app route to read localStorage is
// how a chunk ends up in the login bundle.
export { storedTrialToken, clearTrialToken } from "../trialClaim.js";

export default function TrialTake() {
  const { appKey = "singz" } = useParams();
  const app = APPS[appKey] ? appKey : "singz";
  const [scored, setScored] = useState(false);
  const [score, setScore] = useState(null);
  const [shared, setShared] = useState("");

  useEffect(() => { track("try_view", { app_key: app }); }, [app]);

  function keep(result) {
    if (!result) return;
    // The token and the score are separate things. Gating on the token meant
    // a take that scored fine but came back without one showed the visitor
    // nothing at all — no offer to keep it, and no way to share it.
    if (result.claim_token) keepTrialToken(result.claim_token);
    if (result.score != null) setScore(result.score);
    setScored(true);
    track("try_scored", { app_key: app });
  }

  // The whole viral loop, such as it is: somebody gets a number they're proud
  // of and currently has nowhere to put it. The share carries a link back to
  // this exact door — the free one, no account — because sending a stranger
  // to a signup form is how you waste a recommendation.
  const shareUrl = `${window.location.origin}/try/${app}`;
  const shareText = score != null
    ? `I scored ${score}/10 on my ${APPS[app]} take 🎤 — real AI coach, free, no account. Get yours scored:`
    : `Got my ${APPS[app]} take scored free by an AI coach 🎤 — no account needed. Try it:`;

  async function share() {
    // Only ever count a share that actually went out. navigator.share
    // rejects with AbortError when somebody opens the sheet and backs out,
    // and counting that would inflate the one number that tells us whether
    // this loop works at all.
    try {
      if (navigator.share) {
        await navigator.share({ title: "Music ConnectZ", text: shareText, url: shareUrl });
        setShared("Shared — thanks for passing it on.");
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setShared("Copied — paste it anywhere.");
      }
      track("try_shared", { app_key: app });
    } catch {
      // Cancelled, or a browser that allows neither. Say nothing: a share
      // somebody backed out of is not an error they need told about.
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/login" className="text-sm text-white/60 hover:text-white">Sign in</Link>
      </header>

      <div className="mb-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
          Get one take scored — free, no account
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Same coach our {APPS[app]} members use, same rubric, same score out of 10. One take per
          day. Sign up after and it's saved to your account.
        </p>
        <div className="mt-3 flex gap-2">
          {Object.entries(APPS).map(([k, label]) => (
            <Link key={k} to={`/try/${k}`}
                  className={`pill ${k === app ? "pill-on" : "hover:text-white"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <BossTake appKey={app} trial onResult={keep} />

      {scored && (
        <div className="mt-4 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
          <p className="mb-3 text-white/85">
            That take is yours. Make an account in the next 30 days and it lands in {APPS[app]} —
            with the drill, the history, and takes whenever you want them.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/register" className="re-btn !w-auto px-5">
              Keep this take — join free
            </Link>
            {/* Signing in keeps it too. It always could have — the token is
                claimed against whoever is logged in, not against a brand new
                row — but the only button said "join", so anybody who already
                had an account read that as "not for me" and lost the take. */}
            <Link to="/login" className="re-btn re-btn-purple !w-auto px-5">
              Already have an account? Sign in and keep it
            </Link>
            {/* The label names the number that's going out, so nobody
                discovers what they shared by sharing it. */}
            <button type="button" onClick={share} className="re-btn re-btn-cyan !w-auto px-5">
              <Share2 size={15} />
              {score != null ? `Share your ${score}/10` : "Share this"}
            </button>
          </div>
          {shared && <p className="mt-2 text-[11px] text-emerald-300">{shared}</p>}
        </div>
      )}
    </div>
  );
}
