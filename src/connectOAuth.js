// Link a NEW sign-in from an already-signed-in member's own Social section.
//
// `OAuthLinkView.post` on the backend has always accepted a fresh
// authorization code from an authenticated member — the "worst case" way in
// when the automatic match at login can't tell who somebody is (a SoundCloud
// "KOTH" against an existing "K-Oth", say). `ConnectionZ.jsx` only ever
// rendered the DISCONNECT half of that screen; there was no button here that
// could reach the endpoint that already does this.
//
// It reuses the ordinary OAuth dance rather than inventing a second one —
// same authorize URL, same /oauth/callback, same state check — exactly the
// way SoundCloudImport.jsx already reuses it for a bulk import. The only
// difference is a marker in sessionStorage that tells the callback to spend
// the code on a LINK instead of a sign-in.
import { api } from "./api.js";
import { rand, pkceChallenge, clearFlowMarkers } from "./oauthProviders.jsx";

const MARK = "mcz_oauth_connect";

/** Kick off linking `provider` (one of oauthProviders.jsx's PROVIDERS
 *  entries) to the signed-in member's own account. Same shape as
 *  OAuthButtons' own `start()` — a fresh state, PKCE when the provider needs
 *  it — with the marker set so the callback knows to spend the code on a
 *  link instead of a sign-in. */
export async function startConnect(provider, clientId) {
  clearFlowMarkers();
  const state = rand();
  sessionStorage.setItem("mcz_oauth_provider", provider.key);
  sessionStorage.setItem("mcz_oauth_state", state);
  sessionStorage.setItem(MARK, "1");
  let challenge = "";
  if (provider.pkce) {
    const verifier = rand();
    sessionStorage.setItem("mcz_oauth_verifier", verifier);
    challenge = await pkceChallenge(verifier);
  } else {
    sessionStorage.removeItem("mcz_oauth_verifier");
  }
  window.location.href = provider.auth(encodeURIComponent(clientId), state, challenge);
}

/** Called by OAuthCallback when it finds the marker. Clears it either way,
 *  so a member who navigates away mid-flow doesn't have their next ordinary
 *  sign-in mistaken for a link attempt. */
export async function finishConnect(provider, code, codeVerifier) {
  sessionStorage.removeItem(MARK);
  const body = { code, redirect_uri: `${window.location.origin}/oauth/callback` };
  if (codeVerifier) body.code_verifier = codeVerifier;
  return api(`/api/auth/oauth/${provider}/link/`, { method: "POST", body });
}

export const connectPending = () => sessionStorage.getItem(MARK) === "1";
