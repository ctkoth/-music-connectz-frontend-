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
import BossTake from "./BossTake.jsx";
import { track } from "../track.js";

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

  useEffect(() => { track("try_view", { app_key: app }); }, [app]);

  function keep(result) {
    if (!result?.claim_token) return;
    try {
      localStorage.setItem(TRIAL_TOKEN_KEY, result.claim_token);
    } catch {
      /* no storage → they can still sign up, they just lose the take */
    }
    setScored(true);
    track("try_scored", { app_key: app });
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
          <p className="mb-2 text-white/85">
            That take is yours. Make an account in the next 30 days and it lands in {APPS[app]} —
            with the drill, the history, and takes whenever you want them.
          </p>
          <Link to="/register" className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">
            Keep this take — join free
          </Link>
        </div>
      )}
    </div>
  );
}
