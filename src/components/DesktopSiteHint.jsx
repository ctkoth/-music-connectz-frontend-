// "This page is showing its desktop version" — shown only on a phone whose browser is set to the desktop site
// (screenFit.js says how that is measured). It names the switch for the two browsers members use most, and goes
// away when they close it. Without it, a page laid out at 980px on a 384px screen just looks broken.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { desktopSiteNow } from "../screenFit.js";

const KEY = "mcz_desktop_hint_off";

export default function DesktopSiteHint() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let off = false;
    try { off = localStorage.getItem(KEY) === "1"; } catch { /* blocked: show it, closing still works for the visit */ }
    if (off) return undefined;
    const check = () => setOn(desktopSiteNow());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (!on) return null;
  const close = () => { setOn(false); try { localStorage.setItem(KEY, "1"); } catch { /* blocked */ } };
  return (
    <div role="status" className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
      <p className="min-w-0 flex-1">
        Your browser is showing the <b>desktop version</b> of this page, so it's wider than your screen and you have to
        scroll sideways. For the phone layout, turn it off in the browser menu:{" "}
        <b>Samsung Internet</b> ☰ → Desktop version, or <b>Chrome</b> ⋮ → Desktop site.
      </p>
      <button type="button" onClick={close} aria-label="Close" className="shrink-0 rounded p-1 text-amber-100/70 hover:bg-white/10">
        <X size={14} />
      </button>
    </div>
  );
}
