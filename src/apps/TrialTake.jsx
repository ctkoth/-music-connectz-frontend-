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
import { Share2, Loader2 } from "lucide-react";
import BossTake from "./BossTake.jsx";
import { track } from "../track.js";
import TrialToUpgradePrompt from "../components/TrialToUpgradePrompt.jsx";

const TRIAL_TOKEN_KEY = "mcz_trial_token";
const APPS = { singz: "SingZ", rapz: "RapZ" };

export function storedTrialToken() {
  try {
    return localStorage.getItem(TRIAL_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearTrialToken() {
  try {
    localStorage.removeItem(TRIAL_TOKEN_KEY);
  } catch {
    /* private-mode browsers throw on storage; losing the token is survivable */
  }
}

export default function TrialTake() {
  const { appKey = "singz" } = useParams();
  const app = APPS[appKey] ? appKey : "singz";
  const [scored, setScored] = useState(false);
  const [score, setScore] = useState(null);
  const [shared, setShared] = useState("");
  const [bossTakeReady, setBossTakeReady] = useState(false);

  useEffect(() => { track("try_view", { app_key: app }); }, [app]);

  function keep(result) {
    if (!result) return;
    // The token and the score are separate things. Gating on the token meant
    // a take that scored fine but came back without one showed the visitor
    // nothing at all — no offer to keep it, and no way to share it.
    if (result.claim_token) {
      try {
        localStorage.setItem(TRIAL_TOKEN_KEY, result.claim_token);
      } catch {
        /* no storage → they can still sign up, they just lose the take */
      }
    }
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
          One take scored — free, instantly
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Record ~30 seconds and get exact feedback from the same AI coach our {APPS[app]} members use.
          One free daily take. Join after to keep your takes and track progress.
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

      <div className="mb-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Real feedback example</p>
        <p className="mt-2 text-sm text-white/85">
          <span className="font-bold text-emerald-300">Score: 7/10</span> — Pitch accuracy is solid, but breath control cost you 2 points. Work on sustain, and you'll hit 9+.
        </p>
      </div>

      {!bossTakeReady && (
        <div className="mb-4 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 py-8">
          <Loader2 className="mr-2 animate-spin text-cyan-300" size={18} />
          <span className="text-sm text-white/60">Checking mic access…</span>
        </div>
      )}

      <div className={bossTakeReady ? "" : "hidden"}>
        <BossTake appKey={app} trial onResult={keep} onReady={() => setBossTakeReady(true)} />
      </div>

      {scored && (
        <>
          <div className="mt-4 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="mb-3 text-white/85">
              Save this score and get your personalized drill. Create your free account in the next 30 days to keep your takes and track progress.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link to="/register" className="re-btn !w-auto px-5">
                Keep this take — join free
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

          <div className="mt-6">
            <TrialToUpgradePrompt score={score ?? 7} />
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-white/50">
              What you unlock by joining
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3">
                <p className="mb-2 font-semibold text-emerald-300">Free</p>
                <ul className="space-y-1 text-[11px] text-white/75">
                  <li>✓ Keep all your takes</li>
                  <li>✓ 3 scored takes/day</li>
                  <li>✓ Personalized drill</li>
                  <li>✓ Track your progress</li>
                  <li>✓ Post & compete</li>
                </ul>
              </div>
              <div className="rounded-lg border border-mcz-gold/30 bg-mcz-gold/5 p-3">
                <p className="mb-2 font-semibold text-mcz-gold">Premium</p>
                <ul className="space-y-1 text-[11px] text-white/75">
                  <li>✓ Everything in Free</li>
                  <li>✓ 5 scored takes/day</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ Priority support</li>
                  <li>✓ Coming soon: 1:1 coaching</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
