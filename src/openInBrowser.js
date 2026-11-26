// Getting out of an app's built-in browser (Instagram, TikTok, Facebook...) to the device's real one.
//
// Recording and the file picker often fail inside those browsers and the page cannot tell from
// inside, so the trial says where the fault would be. A sentence and a copy-link was the whole
// way out; on Android there is a real one: an intent:// link asks Chrome to open the same address.
// It names a fallback (the original https address), so a phone without Chrome lands where it was
// rather than on an error. iOS has no equivalent a page may rely on, so it gets the sentence and
// the copy only — a button that sometimes does nothing is worse than none.
//
// Pure, so it runs under plain node (no import.meta.env).

export const isAndroid = (ua = "") => /Android/i.test(ua);

/** The intent:// address that opens `url` in Chrome, or "" when it cannot be built
 *  (not Android, not https/http, or unparseable). */
export function chromeIntent(url, ua = "") {
  if (!isAndroid(ua)) return "";
  let u;
  try { u = new URL(url); } catch { return ""; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "";
  const scheme = u.protocol.slice(0, -1);
  const rest = `${u.host}${u.pathname}${u.search}`;
  return `intent://${rest}#Intent;scheme=${scheme};package=com.android.chrome;`
       + `S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
}

/** What to show: the way out that works on this device, said before anything is pressed. */
export function browserExit(url, ua = "") {
  const intent = chromeIntent(url, ua);
  if (intent) return { kind: "intent", href: intent, label: "Open in Chrome" };
  return { kind: "copy", href: "", label: "Copy this page's link" };
}
