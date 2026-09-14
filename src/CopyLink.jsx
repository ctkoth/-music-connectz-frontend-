// The public link to a profile, next to the handle, on every screen a handle
// appears on.
//
// A member's profile IS their pitch — it is the thing they paste into a DM, a
// bio, an email to a venue. Until now the only way to get the address was to
// open `/u/<handle>` and copy the browser's URL bar, which on a phone is a
// three-step operation most people never work out is possible. A link nobody
// can hand to anyone is a page nobody visits.
//
// One component rather than three copies, for the reason every shared thing
// here is one: the handle shows up on the member modal, the public profile and
// your own ProfileZ, and three implementations of "copy my link" would be
// three different URLs within a year.
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { playSound } from "./sound.js";

/** The address a stranger can open. Built from the live origin rather than a
 *  constant so it is right on the .net, the .com, a Vercel preview and
 *  localhost — a hardcoded domain is the one that gets pasted into a DM and
 *  goes to the wrong place. */
export const profileUrl = (username) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/u/${encodeURIComponent(username || "")}`;

export default function CopyLink({ username, className = "", label = "" }) {
  const [state, setState] = useState("");   // "" | "done" | the URL, on failure
  if (!username) return null;
  const url = profileUrl(username);

  async function copy() {
    // `navigator.clipboard` is undefined on an insecure origin and its promise
    // rejects when the browser refuses the permission, so neither is assumed.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        throw new Error("no clipboard api");
      }
      setState("done");
      playSound("open_in");
      setTimeout(() => setState(""), 1800);
    } catch {
      // The old execCommand path, which still works where the async API is
      // refused. If THAT fails the URL goes on screen, selected, so the member
      // can copy it by hand — a copy button that silently does nothing is the
      // dead-button failure this codebase has shipped before, and the one
      // nobody reports because the screen looks fine.
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand refused");
        setState("done");
        setTimeout(() => setState(""), 1800);
      } catch {
        setState(url);
      }
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={copy}
        title={`Copy ${url}`}
        aria-label={`Copy link to @${username}`}
        data-tour="copy-profile-link"
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white"
      >
        {state === "done" ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
        <span>{state === "done" ? "Copied" : (label || "Copy link")}</span>
      </button>
      {/* Only rendered when both copy paths were refused. Read-only and
          pre-selected: the member still gets the link, which is the whole
          point of the control. */}
      {state && state !== "done" && (
        <input
          readOnly
          value={state}
          onFocus={(e) => e.target.select()}
          ref={(el) => el && el.select()}
          className="min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-1.5 py-0.5 text-[11px] text-white/70"
        />
      )}
    </span>
  );
}
