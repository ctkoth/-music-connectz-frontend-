// "You still have a copy on this device": shown where a file the server lost is drawn. The copy is the member's own, kept when they uploaded it
// (deviceVault.js). If there is one the member can download it right now; if there is not, the row says so plainly instead of promising a recovery.
import { useEffect, useState } from "react";
import { getCopy } from "../deviceVault.js";
import { sizeLabel } from "../recorder.js";

export default function DeviceCopy({ kind, id, name = "" }) {
  const [copy, setCopy] = useState(undefined);      // undefined = looking, null = none
  useEffect(() => { let dead = false; getCopy(kind, id).then((c) => { if (!dead) setCopy(c); }); return () => { dead = true; }; }, [kind, id]);
  if (copy === undefined) return null;
  if (!copy) return <p className="text-[11px] text-white/60">No copy of this file is kept on this device, so it can't be restored from here. If you still have the original, upload it again.</p>;
  const save = () => {
    const url = URL.createObjectURL(copy.blob);
    const a = document.createElement("a");
    a.href = url; a.download = copy.name || name || "recording"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  return (
    <p className="text-xs text-emerald-300">
      ✅ This device still has your copy ({sizeLabel(copy.size)}, kept {new Date(copy.savedAt).toLocaleDateString()}).{" "}
      <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={save}>⬇ Download my copy</button>
    </p>
  );
}
