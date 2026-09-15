import { useEffect, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { api } from "./api.js";

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

const rand = () => {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Called by OAuthCallback when it finds the marker. Returns the result so the
 *  callback can render it, and clears the marker either way — a marker that
 *  outlives its import turns the member's NEXT sign-in into an import. */
export async function finishImport(code) {
  sessionStorage.removeItem(MARK);
  return api("/api/economy/soundcloud/import/", {
    method: "POST",
    body: { code, redirect_uri: `${window.location.origin}/oauth/callback` },
  });
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

  function start() {
    if (!clientId) {
      setError("SoundCloud isn't connected on this server yet.");
      return;
    }
    setBusy(true);
    const state = rand();
    sessionStorage.setItem("mcz_oauth_provider", "soundcloud");
    sessionStorage.setItem("mcz_oauth_state", state);
    sessionStorage.removeItem("mcz_oauth_verifier");
    sessionStorage.setItem(MARK, "1");
    const redirect = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    window.location.href =
      `https://secure.soundcloud.com/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${redirect}&state=${state}`;
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
        Up to <strong>{info.max_tracks}</strong> track
        {info.max_tracks === 1 ? "" : "s"} at once on {info.tier}.{" "}
        <span className="text-emerald-300">Free</span> — importing costs nothing.
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
