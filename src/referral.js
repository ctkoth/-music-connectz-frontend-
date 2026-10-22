// Who brought a visitor here, kept until they sign up so Register can credit them.
//
// An explicit invite (`?ref=` on a link somebody shared) always wins — TrialTake and the
// share card write it outright. A public page's OWNER is the fallback: somebody who lands
// on a member's profile, post or playlist and joins was brought by that member, but the
// first such page wins, so wandering on through three profiles does not move the credit.
export const REF_KEY = "mcz_ref";

export function storedRef() {
  try { return localStorage.getItem(REF_KEY) || ""; } catch { return ""; }
}

export function rememberPageOwner(username) {
  if (!username) return;
  try {
    if (!localStorage.getItem(REF_KEY)) localStorage.setItem(REF_KEY, String(username).slice(0, 40));
  } catch { /* blocked storage: the ?ref on the join link still carries it */ }
}
