// The BodieZ trial's split, kept on the device until the visitor joins. Its own file so the sign-up screen can
// read it without pulling the whole BodieZ trial into its download.
export const TRIAL_SPLIT_KEY = "mcz_trial_split";

export function storedTrialSplit() {
  try {
    const raw = localStorage.getItem(TRIAL_SPLIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTrialSplit() {
  try {
    localStorage.removeItem(TRIAL_SPLIT_KEY);
  } catch {
    /* private-mode browsers throw on storage; losing the draft is survivable */
  }
}
