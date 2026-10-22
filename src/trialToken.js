// The claim token for a take a visitor made at the trial door, kept in this browser so
// Register can attach the take to the account they then make. Its own tiny module so the
// recorder's join card can read it without pulling the whole trial page into its bundle.
export const TRIAL_TOKEN_KEY = "mcz_trial_token";

export function storedTrialToken() {
  try {
    return localStorage.getItem(TRIAL_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearTrialToken() {
  try {
    localStorage.removeItem(TRIAL_TOKEN_KEY);
  } catch {
    /* private-mode browsers throw on storage; losing the token is survivable */
  }
}
