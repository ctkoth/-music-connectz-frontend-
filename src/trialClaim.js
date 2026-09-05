// The take somebody made at the door, and the two ways they get it back.
//
// `/try` scores a Boss Take with no account and keeps a claim token. Handing
// that token to /register worked — and that was the ONLY path. A visitor who
// already had an account, recorded a take at the door and then pressed Sign in
// lost it: `claim_trial_take` had exactly one caller in the whole codebase,
// the register serializer. The screen even said "Sign in" in its own header.
//
// So the token is claimed after ANY arrival — register, sign in, or an OAuth
// return — and the claim tells the client where the take landed so the app can
// offer the jump instead of announcing a success with nowhere to go.
import { api } from "./api.js";

const TRIAL_TOKEN_KEY = "mcz_trial_token";

export function storedTrialToken() {
  try {
    return localStorage.getItem(TRIAL_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function keepTrialToken(token) {
  if (!token) return;
  try {
    localStorage.setItem(TRIAL_TOKEN_KEY, token);
  } catch {
    /* no storage → they can still sign up, they just lose the take */
  }
}

export function clearTrialToken() {
  try {
    localStorage.removeItem(TRIAL_TOKEN_KEY);
  } catch {
    /* private-mode browsers throw on storage; losing the token is survivable */
  }
}

/**
 * Attach a door take to the account that just signed in.
 *
 * Resolves to the claim (`{claimed, take, open_in}`) or null when there was
 * nothing to claim. Never rejects: a stale token must not be the reason a
 * successful login looks like a failed one — which is the same rule that made
 * the register path best-effort.
 */
export async function claimTrialTake() {
  const token = storedTrialToken();
  if (!token) return null;
  try {
    const d = await api("/api/economy/trial/claim/", {
      method: "POST",
      body: { token },
    });
    // Clear either way. A token the server has refused is not going to start
    // working, and leaving it behind means claiming it again on every login.
    clearTrialToken();
    return d?.claimed ? d : null;
  } catch {
    return null;
  }
}
