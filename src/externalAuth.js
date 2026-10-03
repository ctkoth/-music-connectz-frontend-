// Facebook refuses to log anybody in from an Android WebView — the APK's own
// screen included — and Spotify's "Continue with Facebook" hands off to the
// same refusal. So in the APK those providers run in a Chrome tab instead, and
// the code comes back to the app through a deep link.
//
// The round trip:
//   1. The app opens the provider in a Chrome tab with a state that starts
//      with "app." (sessionStorage — state, PKCE verifier — stays in the app).
//   2. The provider redirects the TAB to /oauth/callback. That page has none
//      of the app's sessionStorage, so it never spends the code: it sees the
//      "app." state and hands the query to the app through an intent: URL
//      pinned to our package, so no other app can receive it.
//   3. The app gets the deep link and loads its own /oauth/callback with the
//      same query, where the state check and the exchange run as they always
//      have.
//
// An APK built before these plugins existed reports them unavailable, and
// keeps the old in-WebView flow rather than opening a tab nothing can return
// from.
import { Capacitor } from "@capacitor/core";

const SCHEME = "net.musicconnectz.app";
export const APP_STATE_PREFIX = "app.";
// The Windows app's round trip: same idea as Android, a different door back.
// The system browser lands on /oauth/callback, sees "desk.", and hands the
// query to the desktop app through its registered net.musicconnectz.app://
// protocol (desktop/main.cjs).
export const DESK_STATE_PREFIX = "desk.";

function inAppWithPlugins() {
  return Capacitor.isNativePlatform()
    && Capacitor.isPluginAvailable("Browser")
    && Capacitor.isPluginAvailable("App");
}

const UA = () => (typeof navigator === "undefined" ? "" : navigator.userAgent || "");
// Desktop builds that can take a sign-in back announce it in their UA; an
// older .exe is plain Electron and has no protocol registered.
const deskVersion = () => Number((UA().match(/MCZDesktop\/(\d+)/) || [])[1] || 0);

/** Which build of the app this page is running inside — every sign-in
 *  decision below starts here, because what works differs by device:
 *   - "android"      APK with the Browser/App plugins (can hand off to Chrome)
 *   - "android-old"  APK built before them (nothing can come back)
 *   - "desktop"      Windows app that registered the return protocol
 *   - "desktop-old"  older Windows app (nothing can come back)
 *   - "inapp"        Instagram / Facebook / TikTok / Snapchat / LinkedIn's
 *                    own in-app browser — Google refuses sign-in in these
 *   - "web"          a real browser */
export function appShell() {
  if (Capacitor.isNativePlatform()) return inAppWithPlugins() ? "android" : "android-old";
  if (/Electron\//.test(UA())) return deskVersion() >= 2 ? "desktop" : "desktop-old";
  if (/FBAN|FBAV|Instagram|musical_ly|Bytedance|TikTok|Snapchat|LinkedInApp|Line\/|MicroMessenger/i.test(UA())) return "inapp";
  return "web";
}

/** Providers that refuse to sign anyone in from an embedded browser: Google
 *  (disallowed_useragent), Apple's popup (nothing to return to), Facebook. */
export const NEEDS_REAL_BROWSER = new Set(["google", "apple", "facebook", "spotify"]);

/** Should provider `p` leave the app for the device's real browser?
 *  Android: the providers that refuse WebViews. Windows: every provider —
 *  Google treats Electron as an embedded browser too, and one path is
 *  easier to keep right than a list. */
export const goesExternal = (p) => {
  const shell = appShell();
  if (shell === "desktop") return true;
  if (shell === "android") return !!p?.external || NEEDS_REAL_BROWSER.has(p?.key);
  return false;
};

/** The state prefix that tells /oauth/callback where to hand the code. */
export const statePrefixFor = (p) =>
  !goesExternal(p) ? "" : appShell() === "desktop" ? DESK_STATE_PREFIX : APP_STATE_PREFIX;

/** Send the member to `url` — a Chrome tab for `external` providers in the
 *  app, the same tab everywhere else. */
export async function openProvider(p, url) {
  if (!goesExternal(p)) {
    window.location.href = url;
    return;
  }
  if (appShell() === "desktop") {
    // desktop/main.cjs routes window.open to the system browser.
    window.open(url, "_blank");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

/** True on the web page a Chrome tab lands on mid-handoff. */
export const isAppHandoff = (state) =>
  !Capacitor.isNativePlatform() && !/Electron\//.test(UA()) && typeof state === "string"
  && (state.startsWith(APP_STATE_PREFIX) || state.startsWith(DESK_STATE_PREFIX));

/** The link that carries the callback query back into the app it came from. */
export const appReturnUrl = (search, state = "") =>
  state.startsWith(DESK_STATE_PREFIX)
    ? `${SCHEME}://oauth/callback${search}`
    : `intent://oauth/callback${search}#Intent;scheme=${SCHEME};package=${SCHEME};end`;

/** The callback's parameters from the query AND the fragment — Google's and
 *  Apple's redirect flows return the identity token in the fragment, which
 *  never reaches a server and would otherwise be lost at the handoff. */
export function callbackParams() {
  const out = new URLSearchParams(window.location.search);
  new URLSearchParams((window.location.hash || "").replace(/^#/, "")).forEach((v, k) => {
    if (!out.has(k)) out.set(k, v);
  });
  return out;
}

/** In the app: when the deep link arrives, finish the sign-in here. */
export function listenForAppReturn() {
  if (!inAppWithPlugins()) return;
  import("@capacitor/app").then(({ App }) => {
    App.addListener("appUrlOpen", ({ url }) => {
      let u;
      try { u = new URL(url); } catch { return; }
      if (u.protocol !== `${SCHEME}:` || u.host !== "oauth") return;
      // Android can't close a Chrome tab from here; bringing this
      // single-task activity forward already removes it from the stack.
      window.location.assign(`/oauth/callback${u.search}`);
    });
  });
}
