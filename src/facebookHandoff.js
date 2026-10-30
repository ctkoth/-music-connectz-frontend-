// Spotify offers "Continue with Facebook" on its own login page, and on a phone
// Facebook can answer that by launching the Facebook APP instead of finishing
// in the browser tab. The app has nothing to hand the login back to, so the
// member sits on a screen that says "Open in app" and never reaches Spotify or
// us. Nothing we serve is on that page — the redirect left our origin two
// screens earlier — so the one thing in reach is saying so BEFORE they go, and
// naming the way around it.
//
// Whose stall it is goes in the sentence: "your account is fine" is the fact a
// member in that state needs, because from where they sit it reads as ours.
const HANDS_OFF_TO_FACEBOOK = new Set(["spotify", "facebook"]);

/** The note to show above the sign-in tiles, or null when it doesn't apply.
 *
 *  Phones only — on a computer there is no app to hand off to. In-app browsers
 *  (`shell === "inapp"`) already get a refusal that stops the redirect, so the
 *  note would be a second, softer warning about the same thing. */
export function facebookStallNote({ keys = [], shape, shell }) {
  if (shape !== "phone" || shell === "inapp") return null;
  if (!keys.some((k) => HANDS_OFF_TO_FACEBOOK.has(k))) return null;
  return {
    why: "On a phone, “Continue with Facebook” can open the Facebook app and never come back. That stall is on Facebook's side — your account is fine.",
    instead: "On Spotify's page pick email, Google or Apple instead, or use another option here.",
    stuck: "Already stuck? Close that tab and come back — nothing was changed.",
  };
}
