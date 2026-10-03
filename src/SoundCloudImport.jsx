import { useEffect, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { api } from "./api.js";
import { PROVIDERS, REDIRECT, clearFlowMarkers, pkceChallenge, rand } from "./oauthProviders.jsx";

// Bring a SoundCloud catalogue in as DRAFT posts.
//
// Posting one SoundCloud link already works at every tier — WidgetZ reads the
// id out of the URL and frames the provider's own player — so this is the same
// thing in bulk, and the tier buys how many come at once.
//
// It reuses the ordinary OAuth dance rather than inventing a second one: the
// same authorize URL, the same /oauth/callback, the same state check. The only
// difference is a marker in sessionStorage that tells the callback to spend the
// code on an import instead of a sign-in.

const MARK = "mcz_sc_import";
// The full answer, handed to PostZ: a bare count in the URL could not say
// that private tracks were left behind or that a slow SoundCloud cut the run
// short — the two things a member most needs to know after a big import.
export const RESULT = "mcz_sc_import_result";
const SC = PROVIDERS.find((p) => p.key === "soundcloud");

/** Called by OAuthCallback when it finds the marker. Returns the result so the
 *  callback can render it, and clears the marker either way — a marker that
 *  outlives its import turns the member's NEXT sign-in into an import. */
export async function finishImport(code, verifier) {
  sessionStorage.removeItem(MARK);
  sessionStorage.removeItem("mcz_oauth_verifier");
  // The SAME redirect the authorize URL carried — it was built from the page
  // origin here while sign-in used REDIRECT, so on any build where
  // VITE_OAUTH_REDIRECT differs from the origin SoundCloud refused the code.
  const body = { code, redirect_uri: REDIRECT };
  if (verifier) body.code_verifier = verifier;
  const out = await api("/api/economy/soundcloud/import/", { method: "POST", body });
  try { sessionStorage.setItem(RESULT, JSON.stringify(out)); } catch { /* the count still travels in the URL */ }
  return out;
}

export const importPending = () => sessionStorage.getItem(MARK) === "1";

export default function SoundCloudImport({ clientId }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/economy/soundcloud/import/").then(setInfo).catch(() => {});
  }, []);

  // A failed fetch renders nothing rather than a broken panel — the member did
  // not ask for this, so telling them it failed is an interruption about an
  // interruption.
  if (!info) return null;

  async function start() {
    if (!clientId) {
      setError("SoundCloud isn't connected on this server yet.");
      return;
    }
    setBusy(true);
    // A connect-flow marker abandoned mid-flow in this tab must not turn this
    // import into a link attempt on the way back.
    clearFlowMarkers();
    const state = rand();
    sessionStorage.setItem("mcz_oauth_provider", "soundcloud");
    sessionStorage.setItem("mcz_oauth_state", state);
    const verifier = rand();
    sessionStorage.setItem("mcz_oauth_verifier", verifier);
    sessionStorage.setItem(MARK, "1");
    // One authorize URL for SoundCloud, shared with sign-in — this file used
    // to carry its own hand-typed copy, which is how the two drifted apart.
    window.location.href = SC.auth(encodeURIComponent(clientId), state, await pkceChallenge(verifier));
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
        Import from SoundCloud
      </p>

      {/* The cost and the gain, before the control that spends anything — and
          here the cost is genuinely nothing, which is worth saying rather than
          leaving somebody to wonder what a bulk import charges. */}
      <p className="pt-2 text-sm text-white/75">
        {info.whole_catalogue || info.max_tracks == null
          ? <>Your <strong>whole catalogue</strong> at once on {info.tier === "statz" ? "StatZ" : info.tier}.{" "}</>
          : <>Up to <strong>{info.max_tracks}</strong> track{info.max_tracks === 1 ? "" : "s"} at once on {info.tier}.{" "}</>}
        <span className="text-emerald-300">Free</span> — importing costs nothing.
      </p>
      <p className="pt-1 text-[11px] leading-relaxed text-white/40">
        Public tracks come in as drafts with their genre and description. Private
        tracks stay on SoundCloud — their player needs a secret link we won't put
        in a post you might publish. Run it again any time: tracks already here
        are skipped.
      </p>

      <p className="pt-1.5 text-[11px] leading-relaxed text-white/40">
        {info.why}
      </p>

      {/* Said plainly, because the member is about to hand over an
          authorisation and is entitled to know what happens to it. */}
      <p className="pt-1.5 text-[11px] leading-relaxed text-white/40">
        SoundCloud will ask you to authorise this. The authorisation is used
        once to read your track list and is never stored.
      </p>

      <button className="neon-btn !w-auto mt-3" onClick={start} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
        {busy ? "Opening SoundCloud…" : "Import my tracks"}
      </button>

      {error && <p className="pt-2 text-sm text-mcz-pink">{error}</p>}
    </div>
  );
}
