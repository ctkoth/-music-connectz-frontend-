// Pure decisions for the Health Connect steps card, kept out of the component so they run under plain node. The days, the
// note and whether a phone is linked are the server's (`/api/economy/health/`); this only words them and builds the link
// that opens the Android app's native screen (a web page cannot read a watch, so linking happens there).

/** Which Android app to open: the BodieZ app's own package inside the BodieZ shell, else the main one. */
export function androidPackage(standalone) {
  return standalone === "bodiez" ? "net.musicconnectz.bodiez" : "net.musicconnectz.app";
}

/** The link that opens the native "Link steps" screen in the installed app. An intent:// link only means something to
 *  Chrome on Android; elsewhere the card says so instead of offering a button that does nothing. */
export function launchHref(standalone) {
  return `intent://link#Intent;scheme=mczhealth;package=${androidPackage(standalone)};end`;
}

export const onAndroid = (ua) => /Android/i.test(ua || "");

/** Bars for the day list: a width in percent against the biggest day shown. No days, no bars; a zero is a thin bar, not
 *  nothing, so a recorded zero is still visible as a recorded day. Order is the server's (newest first). */
export function bars(days) {
  const list = Array.isArray(days) ? days.filter((d) => d && Number.isFinite(d.steps) && d.day) : [];
  const top = Math.max(1, ...list.map((d) => d.steps));
  return list.map((d) => ({ day: d.day, steps: d.steps, pct: Math.max(2, Math.round((d.steps / top) * 100)) }));
}

/** "Mon 17" from an ISO day, in the viewer's locale, without shifting it through a timezone. */
export function dayLabel(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return String(iso || "");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}
