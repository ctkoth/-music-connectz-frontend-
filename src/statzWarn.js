// When the StatZ sample tells a member how long is left, besides the banner that is
// always on screen. The times come from the server (`warn_at_seconds`), and each is
// said once per sample — keyed on the server's end time by the caller, so a reload
// cannot repeat it. Kept pure so it runs under plain node.

export const DEFAULT_WARN_AT = [300, 60];

/** The warnings that are due: thresholds the clock has crossed and that have not been said. */
export function dueWarnings(left, warnAt = DEFAULT_WARN_AT, said = new Set()) {
  if (!(left > 0)) return [];
  return [...warnAt].sort((a, b) => b - a).filter((t) => left <= t && !said.has(t));
}

/** Only the latest one when several are due at once (a tab that slept through two). */
export const latestDue = (left, warnAt, said) => {
  const due = dueWarnings(left, warnAt, said);
  return due.length ? due[due.length - 1] : null;
};

const minutes = (sec) => (sec >= 120 ? `${Math.round(sec / 60)} minutes` : sec >= 60 ? "1 minute" : `${sec} seconds`);

export function warningText(threshold, features = []) {
  const names = features.map((f) => f.label.toLowerCase()).join(", ");
  return {
    title: `${minutes(threshold)} left on your StatZ sample`,
    body: `${names ? `${names} lock when it ends. ` : ""}Anything you built stays yours. Upgrade to keep them.`,
  };
}

/** "Ends at 3:42 PM" — the clock time, because "10 minutes left" is easy to lose track of. */
export const endsAtText = (iso, locale) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? `ends at ${new Date(t).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}` : "";
};

/** "5h 12m" / "42m" / "under a minute" — how long until the next free sample opens. */
export function untilText(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s < 60) return "under a minute";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
