import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { VERSION, newerBuild, versionLabel } from "../version.js";
import { entriesSince } from "../whatsnew.js";

// "Is there a newer Music ConnectZ than the one I'm running?" Asked, not assumed:
// a tab left open across a deploy is still the old program, and the first sign it
// is stale used to be a lazy chunk failing to load (chunkError.js). This asks the
// host for /version.json when the tab opens, whenever it comes back to the
// foreground, and every ten minutes after that.
//
// It never reloads for the member. A reload throws away an unsent post or a
// half-written brief; the banner says what is newer, what changed, and lets them
// choose when. Silent when the check fails or the answer isn't a version
// document — an update notice that cries wolf gets ignored the one time it's true.
const EVERY_MS = 10 * 60 * 1000;

export default function UpdateNotice() {
  const [remote, setRemote] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (VERSION.commit === "dev") return undefined;
    let dead = false;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const body = await r.json();
        if (!dead) setRemote(newerBuild(VERSION, body));
      } catch { /* offline, or not JSON: say nothing */ }
    };
    check();
    const timer = setInterval(check, EVERY_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { dead = true; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  if (!remote) return null;
  const changes = entriesSince(VERSION.version);
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[9999] border-b border-mcz-cyan/40 bg-[#0b1020]/95 px-4 py-2 text-sm text-white backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          A newer Music ConnectZ is out: <b>{versionLabel(remote)}</b>. You're on <b>{versionLabel()}</b>.
        </span>
        <button className="inline-flex items-center gap-1 rounded-md bg-mcz-cyan/20 px-2.5 py-1 font-semibold text-mcz-cyan hover:bg-mcz-cyan/30"
                onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> Reload to update
        </button>
        {changes.length > 0 && (
          <button className="text-xs text-white/60 underline hover:text-white" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide what's new" : "What's new"}
          </button>
        )}
        <span className="w-full text-[11px] text-white/45">Reloading throws away anything you haven't sent or saved yet — finish that first.</span>
      </div>
      {open && (
        <ul className="mx-auto mt-2 max-w-3xl list-disc space-y-1 pl-5 text-xs text-white/75">
          {changes.flatMap((e) => e.items.map((t) => <li key={`${e.version}-${t}`}>{t}</li>))}
        </ul>
      )}
    </div>
  );
}
