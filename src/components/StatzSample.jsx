import { useEffect, useMemo, useState } from "react";
import { Crown, Timer } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { playSound } from "../sound.js";

// The StatZ sample: one hour of StatZ-only features, once per member. The end
// time is the server's, so the countdown here is a display of it, never the
// thing that decides — reloading cannot buy more time, and when it reads 0:00
// the server already agrees.

let cached = null;
const listeners = new Set();
const publish = (s) => { cached = s; listeners.forEach((f) => f(s)); };

export function refreshStatzTrial() {
  return api("/api/economy/statz-trial/").then(publish).catch(() => publish(null));
}

export function useStatzTrial() {
  const [raw, setS] = useState(cached);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    listeners.add(setS);
    if (cached === null) refreshStatzTrial();
    return () => listeners.delete(setS);
  }, []);
  const ends = raw?.ends_at ? Date.parse(raw.ends_at) : 0;
  // `left` is floored, so it reads 0:00 for the last second while the server still
  // has that second to go. The sample is OVER when the clock passes the server's end
  // time, not when the display reaches zero, and the screen locks on that moment
  // rather than waiting for a fetch to agree — a fetch sent in the last second would
  // be told it is still active and, with nothing to ask again, leave every feature
  // unlocked until somebody navigated away.
  const over = !!raw?.active && !raw?.is_statz && ends > 0 && now >= ends;
  const s = useMemo(() => (over ? { ...raw, active: false, used: true, available: false } : raw), [raw, over]);
  const left = raw?.active && !over ? Math.max(0, Math.floor((ends - now) / 1000)) : 0;
  useEffect(() => {
    if (!raw?.active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [raw?.active]);
  useEffect(() => {
    if (!over) return undefined;
    notifyEnded(raw);
    // Ask the server to confirm, and again if its clock has not caught up yet.
    let tries = 0;
    let timer;
    const confirm = () => {
      refreshStatzTrial().then(() => {
        if (cached?.active && ++tries < 6) timer = setTimeout(confirm, 2000);
      });
    };
    timer = setTimeout(confirm, 400);
    return () => clearTimeout(timer);
  }, [over, raw?.ends_at]);  // eslint-disable-line react-hooks/exhaustive-deps
  return { s, left };
}

// The sample is the one thing here with a deadline, so the end of it gets said
// somewhere a member who has switched apps will see — but only if they have
// already let this site notify them (nothing here asks for permission; the rest
// alerts control does, because that is the moment somebody has a reason to say
// yes). Once per sample, keyed on the server's end time, so a reload cannot repeat
// it. What locks is the Coach CHOOSING; whatever it already built stays built.
const told = new Set();
function notifyEnded(s) {
  if (!s?.ends_at || told.has(s.ends_at)) return;
  told.add(s.ends_at);
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const names = (s.features || []).map((f) => f.label.toLowerCase()).join(", ");
      new Notification("Your StatZ sample has ended", {
        body: `${names ? `${names} are locked now. ` : ""}Anything you already built is still yours. Upgrade to keep using them.`,
        tag: "statz-sample-ended",
      });
    }
  } catch { /* a notification is a nicety */ }
}

const clock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const upgrade = (s) => goToSpot(s?.upgrade?.tab || "membershipz", s?.upgrade?.target || "membershipz-plans");

async function start() {
  try {
    publish(await api("/api/economy/statz-trial/", { method: "POST" }));
    playSound("level_up");
  } catch {
    refreshStatzTrial();
  }
}

/** At a StatZ-only control: the free hour if it's still yours, else the upgrade. */
export function StatzSample({ what }) {
  const { s, left } = useStatzTrial();
  if (!s || s.is_statz) return null;
  if (s.active) {
    return (
      <p className="text-xs text-mcz-gold">
        <Timer size={12} className="mr-1 inline" />StatZ sample on — {clock(left)} left.{" "}
        <button className="re-link" onClick={() => upgrade(s)}>Keep it: upgrade</button>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
      <span>{what} is a StatZ feature.</span>
      {s.available && (
        <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={start}>
          <Crown size={12} /> Try StatZ free for {s.minutes} min
        </button>
      )}
      <button className="re-link" onClick={() => upgrade(s)}>
        {s.used ? "Your sample's over — upgrade to StatZ" : "Upgrade to StatZ"}
      </button>
    </div>
  );
}

/** App-wide, only while a sample runs: the time left and the way to keep it. */
export function StatzTimerBanner() {
  const { s, left } = useStatzTrial();
  if (!s?.active) return null;
  const urgent = left < 5 * 60;
  return (
    <div className={`sticky top-0 z-40 mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border px-3 py-2 text-sm backdrop-blur ${urgent
      ? "border-mcz-ember/60 bg-mcz-ember/15 animate-pulse" : "border-mcz-gold/40 bg-mcz-gold/10"}`}>
      <span className="font-semibold text-mcz-gold"><Timer size={14} className="mr-1 inline" />StatZ sample</span>
      <span className="font-mono tabular-nums text-white">{clock(left)}</span>
      <span className="text-white/60">left — {s.features.map((f) => f.label.toLowerCase()).join(", ")}</span>
      <button className="neon-btn-primary !w-auto px-3 py-1 text-xs" onClick={() => upgrade(s)}>Upgrade to keep it</button>
    </div>
  );
}

/** For MembershipZ: the sample offered beside the plan that keeps it. */
export function StatzSampleOffer() {
  const { s, left } = useStatzTrial();
  if (!s || s.is_statz) return null;
  if (s.active) return <p className="text-xs text-mcz-gold">Your StatZ sample has {clock(left)} left.</p>;
  if (!s.available) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-mcz-gold/30 bg-mcz-gold/10 p-3 text-sm">
      <span>Not sure yet? Try StatZ's {s.features.map((f) => f.label.toLowerCase()).join(" and ")} free for {s.minutes} minutes — once, no card.</span>
      <button className="re-btn !w-auto px-3 py-1" onClick={start}><Crown size={14} /> Start my free hour</button>
    </div>
  );
}
