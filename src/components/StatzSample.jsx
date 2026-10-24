import { useEffect, useMemo, useState } from "react";
import { Crown, Timer } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { playSound } from "../sound.js";
import { endsAtText, latestDue, untilText, warningText } from "../statzWarn.js";

// The StatZ sample: a first full hour, then fifteen minutes every 24 hours. The end
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
  // The warnings before the end: ten minutes and one, said once each per sample.
  useEffect(() => {
    if (!raw?.active || over) return;
    const t = latestDue(left, raw.warn_at_seconds, saidFor(raw.ends_at));
    if (t != null) notifyLeft(raw, t);
  }, [left, over, raw]);  // eslint-disable-line react-hooks/exhaustive-deps
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
// The sample ending is the one moment a member is deciding whether StatZ is worth it, so it
// gets a banner that stays until dismissed, not only a notification they may have blocked.
let endedBanner = null;
const endedListeners = new Set();
const publishEnded = (v) => { endedBanner = v; endedListeners.forEach((f) => f(v)); };
function useEndedBanner() {
  const [v, setV] = useState(endedBanner);
  useEffect(() => { endedListeners.add(setV); return () => endedListeners.delete(setV); }, []);
  return [v, () => publishEnded(null)];
}
const saidMap = new Map();
const saidFor = (endsAt) => { if (!saidMap.has(endsAt)) saidMap.set(endsAt, new Set()); return saidMap.get(endsAt); };
// Says every threshold the clock has already passed as said, so a tab that slept
// through ten minutes does not then say both, and a later one does not say it again.
function notifyLeft(s, threshold) {
  const said = saidFor(s.ends_at);
  (s.warn_at_seconds || []).forEach((t) => { if (t >= threshold) said.add(t); });
  try {
    playSound("message");
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const { title, body } = warningText(threshold, s.features);
      new Notification(title, { body, tag: `statz-sample-${threshold}` });
    }
  } catch { /* a notification is a nicety */ }
}
function notifyEnded(s) {
  if (!s?.ends_at || told.has(s.ends_at)) return;
  told.add(s.ends_at);
  publishEnded(s.ends_at);
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const names = (s.features || []).map((f) => f.label.toLowerCase()).join(", ");
      new Notification("Your StatZ sample has ended", {
        body: `${names ? `${names} are locked now. ` : ""}Anything you already built is still yours. A new 15 minutes opens tomorrow, or upgrade to keep them.`,
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

/** At a StatZ-only control: today's free minutes if they're still yours, else the lock and the upgrade. */
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
          <Crown size={12} /> {s.first ? `Try StatZ free for ${s.minutes} minutes — then ${s.daily_minutes} every day` : `Try StatZ free for ${s.minutes} min — a new ${s.minutes} every day`}
        </button>
      )}
      {s.used && <span className="text-mcz-gold">Your free {s.last_minutes} minutes are used — locked. {s.daily_minutes} more open in {untilText(s.seconds_until_next)}.</span>}
      <button className={s.used ? "neon-btn-primary !w-auto px-3 py-1 text-xs" : "re-link"} onClick={() => upgrade(s)}>
        {s.used ? "Upgrade to StatZ to keep it" : "Upgrade to StatZ"}
      </button>
    </div>
  );
}

/** App-wide, only while a sample runs: the time left and the way to keep it. */
export function StatzTimerBanner() {
  const { s, left } = useStatzTrial();
  const [ended, dismiss] = useEndedBanner();
  if (!s?.active && ended && s && !s.is_statz && !s.available) {
    return (
      <div className="sticky top-0 z-40 mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border border-mcz-ember/50 bg-mcz-ember/10 px-3 py-2 text-sm backdrop-blur" data-statz-ended>
        <span className="font-semibold text-mcz-ember"><Timer size={14} className="mr-1 inline" />Your free StatZ {s.last_minutes} minutes are up</span>
        <span className="text-white/65">{s.features.map((f) => f.label.toLowerCase()).join(", ")} are locked. {s.daily_minutes} more minutes open in {untilText(s.seconds_until_next)}.</span>
        <button className="neon-btn-primary !w-auto px-3 py-1 text-xs" onClick={() => { dismiss(); upgrade(s); }}>Upgrade to StatZ</button>
        <button className="text-xs text-white/50 underline" onClick={dismiss}>Dismiss</button>
      </div>
    );
  }
  if (!s?.active) return null;
  const urgent = left < 5 * 60;
  return (
    <div className={`sticky top-0 z-40 mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border px-3 py-2 text-sm backdrop-blur ${urgent
      ? "border-mcz-ember/60 bg-mcz-ember/15 animate-pulse" : "border-mcz-gold/40 bg-mcz-gold/10"}`}>
      <span className="font-semibold text-mcz-gold"><Timer size={14} className="mr-1 inline" />StatZ sample</span>
      <span className="font-mono tabular-nums text-white">{clock(left)}</span>
      <span className="text-white/60">left ({endsAtText(s.ends_at)}) — {s.features.map((f) => f.label.toLowerCase()).join(", ")}</span>
      <button className="neon-btn-primary !w-auto px-3 py-1 text-xs" onClick={() => upgrade(s)}>Upgrade to keep it</button>
    </div>
  );
}

/** For MembershipZ: the sample offered beside the plan that keeps it. */
export function StatzSampleOffer() {
  const { s, left } = useStatzTrial();
  if (!s || s.is_statz) return null;
  if (s.active) return <p className="text-xs text-mcz-gold">Your StatZ sample has {clock(left)} left.</p>;
  if (!s.available) return s.used ? <p className="text-xs text-white/55">Your free StatZ minutes are used — {s.daily_minutes} more in {untilText(s.seconds_until_next)}.</p> : null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-mcz-gold/30 bg-mcz-gold/10 p-3 text-sm">
      <span>Not sure yet? Try StatZ's {s.features.map((f) => f.label.toLowerCase()).join(", ")} free for {s.minutes} minutes{s.first ? ` — then ${s.daily_minutes} every day` : " — a new window every day"}, no card.</span>
      <button className="re-btn !w-auto px-3 py-1" onClick={start}><Crown size={14} /> {s.first ? `Start my free ${s.minutes} minutes` : `Start today's ${s.minutes} minutes`}</button>
    </div>
  );
}
