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
import { api } from "../api.js";
import { track } from "../track.js";
import TrialToUpgradePrompt from "../components/TrialToUpgradePrompt.jsx";

const TRIAL_TOKEN_KEY = "mcz_trial_token";

// The doors the front door offers come from GET /api/economy/trialdoorz/,
// which reads them off the mounted routes.
//
// This was `{ singz: "SingZ", rapz: "RapZ" }` — and `INSTRUMENT_APP_KEYS`
// mounts SEVEN. GuitarZ, BassZ, KeyZ, DrumZ and ViolinZ each had a working,
// scored, no-account coach that nothing on the internet linked to: five
// doors, built and paid for, that no visitor could find and no funnel could
// show as a drop-off, because a step nobody can reach never appears as one.
// A hardcoded list here is how that happened, so there isn't one any more.
//
// FALLBACK, not a second list: if the endpoint is down the two doors that
// have always existed still open, because a trial screen that renders
// nothing is worse than one that renders less than it could.
const FALLBACK = [{ app_key: "singz", label: "SingZ" }, { app_key: "rapz", label: "RapZ" }];

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
  const [doors, setDoors] = useState(FALLBACK);
  // Whether the answer above is the server's or the fallback's. `try_view`
  // waits for it: firing on the fallback and again on the real list would
  // count one visitor twice and, on a door the fallback doesn't know, count
  // them at the wrong door first.
  const [doorsLoaded, setDoorsLoaded] = useState(false);
  const known = doors.some((d) => d.app_key === appKey);
  const app = known ? appKey : "singz";
  const label = doors.find((d) => d.app_key === app)?.label || "SingZ";
  const [scored, setScored] = useState(false);
  const [score, setScore] = useState(null);
  const [shared, setShared] = useState("");
  const [bossTakeReady, setBossTakeReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [tiers, setTiers] = useState(null);

  useEffect(() => {
    let on = true;
    api("/api/economy/trialdoorz/", { auth: false })
      .then((d) => { if (on && d?.doors?.length) setDoors(d.doors); })
      .catch(() => {})
      // Loaded either way: a failed fetch leaves the two fallback doors open,
      // and a visit that goes unmeasured because a side request 404'd is a
      // visit this funnel would have to explain later.
      .finally(() => on && setDoorsLoaded(true));
    return () => { on = false; };
  }, []);

  useEffect(() => {
    let on = true;
    api("/api/trial/public/stats/?days=30", { auth: false })
      .then((d) => { if (on && d?.headline) setStats(d); })
      .catch(() => {})
      // Failed fetch does not render error: a stats panel that silently fails
      // is better than one that blocks or screams about an API problem.
      .finally(() => {});
    return () => { on = false; };
  }, []);

  useEffect(() => {
    let on = true;
    api("/api/economy/tiers/", { auth: false })
      .then((d) => { if (on && d?.tiers) setTiers(d.tiers); })
      .catch(() => {})
      .finally(() => {});
    return () => { on = false; };
  }, []);

  // Fired once the door list is known, so an unknown /try/<key> is counted as
  // the door it actually opened rather than as one that does not exist.
  useEffect(() => { if (doorsLoaded) track("try_view", { app_key: app }); }, [app, doorsLoaded]);

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
  }

  // The whole viral loop, such as it is: somebody gets a number they're proud
  // of and currently has nowhere to put it. The share carries a link back to
  // this exact door — the free one, no account — because sending a stranger
  // to a signup form is how you waste a recommendation.
  const shareUrl = `${window.location.origin}/try/${app}`;
  const shareText = score != null
    ? `I scored ${score}/10 on my ${label} take 🎤 — real AI coach, free, no account. Get yours scored:`
    : `Got my ${label} take scored free by an AI coach 🎤 — no account needed. Try it:`;

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
          Upload a clip — eight to fifteen seconds is plenty — or record one here, and get exact
          feedback from the same AI coach our {label} members use. One free daily take. Join after
          to keep your takes and track progress.
        </p>
        {/* Every door, not the two that were linked. A drummer who lands on
            a page offering "SingZ or RapZ" correctly concludes this place is
            not for drummers — and DrumZ has scored drum takes the whole
            time. */}
        <div className="mt-3 flex flex-wrap gap-2">
          {doors.map((d) => (
            <Link key={d.app_key} to={`/try/${d.app_key}`}
                  title={d.coach ? `Scored by the ${d.coach}` : undefined}
                  className={`pill ${d.app_key === app ? "pill-on" : "hover:text-white"}`}>
              {d.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        {/* An illustration of the SHAPE of the answer, not somebody's real
            take. It used to be headed "Real feedback example", which claims a
            member said it — a small lie on the one screen whose entire job is
            proving the scoring is not decoration. */}
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">What comes back</p>
        <p className="mt-2 text-sm text-white/85">
          <span className="font-bold text-emerald-300">Score: 7/10</span> — Pitch accuracy is solid, but breath control cost you 2 points. Work on sustain, and you'll hit 9+.
        </p>
      </div>

      {stats && (
        <div className="mb-6 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">What members do</p>
          <div className="mt-3 space-y-2">
            {stats.headline.map((h) => (
              <div key={h.key} className="flex items-center justify-between text-sm">
                <span className="text-white/75">{h.label}</span>
                <span className="text-emerald-300">{h.pct}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/45">Last {stats.days} days across all visitors</p>
        </div>
      )}

      {tiers && (
        <div className="mb-6">
          <style>{`
            @keyframes statz-pulse {
              0%, 100% { box-shadow: 0 0 20px rgba(255, 165, 0, 0.3), inset 0 0 20px rgba(255, 165, 0, 0.1); }
              50% { box-shadow: 0 0 30px rgba(255, 165, 0, 0.5), inset 0 0 30px rgba(255, 165, 0, 0.2); }
            }
            .statz-glow {
              animation: statz-pulse 2.5s ease-in-out infinite;
            }
          `}</style>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50">
            All membership tiers
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {tiers.map((tier) => (
              <div key={tier.key} className={`rounded-lg border p-3 ${
                tier.key === "statz"
                  ? "border-mcz-gold/30 bg-mcz-gold/5 statz-glow"
                  : tier.key === "premium"
                  ? "border-emerald-300/20 bg-emerald-300/5"
                  : "border-white/10 bg-white/5"
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <img
                    src={`/icons/tier_${tier.key}.${tier.key === "free" ? "svg" : "png"}`}
                    alt={tier.label}
                    className="h-8 w-8"
                  />
                  {tier.key === "statz" && tier.founding && (
                    <span className="text-[10px] font-bold text-mcz-gold bg-mcz-gold/20 px-2 py-1 rounded">
                      🔥 Founding 50
                    </span>
                  )}
                </div>
                <p className={`mb-2 font-semibold ${
                  tier.key === "statz"
                    ? "text-mcz-gold"
                    : tier.key === "premium"
                    ? "text-emerald-300"
                    : "text-white"
                }`}>
                  {tier.label}
                </p>
                <ul className="space-y-1 text-[11px] text-white/75">
                  <li>✓ Scored takes: {tier.key === "free" ? "3/day" : tier.key === "premium" ? "5/day" : "Unlimited"}</li>
                  <li>✓ Upload: {tier.key === "free" ? "100MB" : tier.key === "premium" ? "1GB" : "10GB"}</li>
                  <li>✓ Storage: {tier.key === "free" ? "500MB" : tier.key === "premium" ? "5GB" : "100GB"}</li>
                  {tier.key === "statz" && <li className="mt-1 text-mcz-gold font-semibold">✓ No limits</li>}

                  {/* Founding pricing for StatZ */}
                  {tier.key === "statz" && tier.founding && (
                    <>
                      <li className="mt-3 pt-2 border-t border-mcz-gold/20">
                        <div className="space-y-1">
                          <div className="font-semibold text-mcz-gold text-[10px] uppercase">Lifetime:</div>
                          <div className="text-emerald-300 font-bold">${(tier.founding.lifetime_cents / 100).toFixed(0)}</div>
                          <div className="font-semibold text-mcz-gold text-[10px] uppercase mt-1">Yearly:</div>
                          <div className="text-emerald-300 font-bold">${(tier.founding.year_cents / 100).toFixed(0)}/yr</div>
                          <div className="font-semibold text-mcz-gold text-[10px] uppercase mt-1">Monthly:</div>
                          <div className="text-emerald-300 font-bold">${(tier.founding.month_cents / 100).toFixed(2)}/mo</div>
                        </div>
                      </li>
                      {tier.founding.remaining > 0 && (
                        <li className="mt-2 pt-2 border-t border-mcz-gold/20 text-mcz-gold font-semibold text-[10px]">
                          ⚡ {tier.founding.remaining} seats left
                          {tier.founding.remaining <= 10 && <span className="block text-[9px] mt-1 text-mcz-ember">Act fast — running out!</span>}
                        </li>
                      )}
                      {tier.founding.sold_out && (
                        <li className="mt-2 pt-2 border-t border-mcz-gold/20 text-mcz-ember font-semibold text-[10px]">
                          ✗ Sold out
                        </li>
                      )}
                      <li className="mt-2 text-[9px] text-white/50 italic">Regular: ${(tier.price_cents / 100).toFixed(2)}/mo</li>
                    </>
                  )}

                  {/* Regular pricing for Free and Premium */}
                  {tier.key !== "statz" && tier.price_cents > 0 && (
                    <li className="mt-2 pt-2 border-t border-white/10 text-emerald-300">
                      ${(tier.price_cents / 100).toFixed(2)}/mo
                    </li>
                  )}
                  {tier.key === "free" && (
                    <li className="mt-2 text-white/60 italic">Get started free</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {!bossTakeReady && (
        <div className="mb-4 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 py-8">
          <Loader2 className="mr-2 animate-spin text-cyan-300" size={18} />
          {/* Not "Checking mic access" — nothing here touches the mic. This
              waits on the coach's own price and rubric, and saying otherwise
              puts a permission prompt in somebody's head before there is one. */}
          <span className="text-sm text-white/60">Loading the coach…</span>
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
