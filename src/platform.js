// Which native platform this page is in. Reads window.Capacitor rather than importing
// @capacitor/core, so it runs under plain node (the tests) and costs nothing on the web.
//
// iOS 1.0 ships without three things (play/apple-decisions-memo.md): ads, third-party
// sign-in, and purchases. Each is hidden here by ONE flag, so putting one back in 1.1 is
// a one-line change and nothing about the web, Android or desktop builds moves.
export const isIOS = () => {
  try {
    return typeof window !== "undefined" && window.Capacitor?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
};

/** AdMob and the AdZ screen. A rewarded ad needs the real iOS app id and the tracking prompt. */
export const HIDE_ADS = () => isIOS();
/** Premium, StatZ and PromptZ checkout. Apple wants its own in-app purchase for these. */
export const HIDE_PURCHASES = () => isIOS();
/** Google/GitHub/Spotify… sign-in. Apple wants Sign in with Apple beside any of them. */
export const HIDE_SOCIAL_LOGIN = () => isIOS();
