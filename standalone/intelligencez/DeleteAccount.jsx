import { useState } from "react";
import { api } from "../../src/api.js";
import { useAuth } from "../../src/auth/AuthContext.jsx";
import { ENERGY, MONEY, PROMPTZ, SPINAZ } from "../../src/resources.js";

// Play requires an app that lets somebody create an account to let them delete
// it FROM INSIDE THE APP, not only from a web page. The main site has this in
// ProfileZ; this build has no ProfileZ, so without this the listing would have
// offered sign-up and no way out — which is the exact shape of failure Play's
// account-deletion policy was written for. (Same control as the Sentence
// ConnectZ and BodieZ shells, with this app's own list of what goes.)
//
// It says what goes BEFORE the control that does it (the cost/gain rule applied
// to the most expensive button there is), and it says the awkward part first:
// this is ONE account, so deleting it here deletes the Music ConnectZ account
// behind it too. A member who only ever mastered a song here can still have one,
// and "it only deletes my pieces" is the wrong thing to believe.
//
// Same endpoint ProfileZ calls (DELETE /api/auth/me/), same cascade: the rows
// go with the account, and the stored files — including every master a member
// saved from Mix ConnectZ — are removed once the delete commits
// (apps/accounts/erasure.py in the backend).
export default function DeleteAccount() {
  const { logout } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function destroy(e) {
    e.preventDefault();
    if (typed !== "DELETE") return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/me/", { method: "DELETE" });
      logout(); // the account is gone; this clears the tokens and lands on sign-in
    } catch (err) {
      // The server's own sentence, unreworded. When Stripe could not cancel the
      // billing it says so and says the account was NOT deleted; a second
      // "nothing was deleted" tacked on here would be the same fact twice.
      setError(err.message || "The account was not deleted.");
      setBusy(false);
    }
  }

  return (
    <details className="mt-6 rounded-lg border border-white/10 p-3 text-sm" data-tour="iz-delete-account">
      <summary className="cursor-pointer text-white/70">Delete my account</summary>
      <form onSubmit={destroy} className="mt-3 space-y-3">
        <p className="text-white/75">
          This is one account, shared with Music ConnectZ, so deleting it here
          deletes it there too. It cannot be undone.
        </p>
        <p className="font-semibold text-mcz-ember">What goes:</p>
        <ul className="list-disc space-y-1 pl-5 text-white/70">
          <li>Every piece Sentence ConnectZ wrote for you, and what you typed to ask for it</li>
          <li>Every loop Instrumental ConnectZ composed for you, and the brief you gave it</li>
          <li>Replies you kept from OCC, and what you asked to get them</li>
          <li>
            Every master you saved in Mix ConnectZ — the mastered audio file itself and the
            record of how it was made. (Mix ConnectZ never uploads the song you master, only
            a master you choose to save.)
          </li>
          <li>Your posts, uploaded files and comments on Music ConnectZ, and the messages you sent and received</li>
          <li>
            Whatever the wallet holds — {ENERGY} Energy, {SPINAZ} SpinaZ, {PROMPTZ} PromptZ and any{" "}
            <span className="font-semibold text-mcz-ember">{MONEY} money</span>. Money is
            not paid out first, so withdraw it before you delete.
          </li>
        </ul>
        <p className="text-mcz-ember">
          Premium, StatZ and auto top-up billing is cancelled at Stripe first, straight
          away, and the rest of a paid period is not refunded. If it can't be cancelled,
          the account is not deleted and you are told.
        </p>
        <label className="block text-white/60" htmlFor="iz-del-confirm">
          Type DELETE to confirm
        </label>
        <input
          id="iz-del-confirm"
          className="neon-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
        />
        {error && <p role="alert" className="text-mcz-ember">{error}</p>}
        <button
          type="submit"
          disabled={busy || typed !== "DELETE"}
          className="min-h-[44px] rounded-lg border border-mcz-ember/60 px-4 font-semibold text-mcz-ember disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete account for good"}
        </button>
      </form>
    </details>
  );
}
