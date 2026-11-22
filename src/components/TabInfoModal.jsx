import { useEffect } from "react";
import { IconImg } from "../App.jsx";

// "What is this tab?" — opens from the tab's icon. Same sheet for every app's tab set, so a tab's
// description lives in one place (its app's `*Tabs.js`) and is the first thing the icon says, not a tooltip.
export default function TabInfoModal({ open, onClose, icon, title, about }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
         className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div onClick={(e) => e.stopPropagation()}
           className="w-full max-w-md rounded-2xl border border-fuchsia-400/40 bg-mcz-bg p-5 shadow-neon">
        <div className="flex items-center gap-3">
          {icon && <IconImg icon={icon} alt="" className="h-14 w-14 shrink-0 rounded-xl" />}
          <h3 className="font-display text-2xl font-extrabold text-white">{title}</h3>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-white/85">{about}</p>
        <button onClick={onClose} className="neon-btn mt-4 w-full">Got it</button>
      </div>
    </div>
  );
}
