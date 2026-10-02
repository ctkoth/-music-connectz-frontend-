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

function inAppWithPlugins() {
  return Capacitor.isNativePlatform()
    && Capacitor.isPluginAvailable("Browser")
    && Capacitor.isPluginAvailable("App");
}

/** Should provider `p` leave the WebView for a Chrome tab? */
export const goesExternal = (p) => !!p?.external && inAppWithPlugins();

/** Send the member to `url` — a Chrome tab for `external` providers in the
 *  app, the same tab everywhere else. */
export async function openProvider(p, url) {
  if (!goesExternal(p)) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

/** True on the web page a Chrome tab lands on mid-handoff. */
export const isAppHandoff = (state) =>
  !Capacitor.isNativePlatform() && typeof state === "string" && state.startsWith(APP_STATE_PREFIX);

/** The link that carries the callback query back into the app. */
export const appReturnUrl = (search) =>
  `intent://oauth/callback${search}#Intent;scheme=${SCHEME};package=${SCHEME};end`;

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
