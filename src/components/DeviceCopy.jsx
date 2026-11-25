// "You still have a copy on this device": shown where a file the server lost is drawn. The copy is the member's own, kept when they uploaded it
// (deviceVault.js). Two things can be done with it: download it, or put it back on the server behind the SAME file, so every post, master and
// link that already points at it plays again with nothing re-attached (POST /uploads/<id>/restore/). The server decides: it only accepts a copy
// of the same size as the original, for a file that really is gone, and it answers in its own words, shown as they came.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { getCopy } from "../deviceVault.js";
import { sizeLabel } from "../recorder.js";

export default function DeviceCopy({ kind, id, name = "", onRestored }) {
  const [copy, setCopy] = useState(undefined);      // undefined = looking, null = none
  const [state, setState] = useState({ busy: false, err: "", done: false });
  useEffect(() => { let dead = false; getCopy(kind, id).then((c) => { if (!dead) setCopy(c); }); return () => { dead = true; }; }, [kind, id]);
  if (copy === undefined) return null;
  if (!copy) return <p className="text-[11px] text-white/60">No copy of this file is kept on this device, so it can't be restored from here. If you still have the original, upload it again.</p>;
  const uploadId = String(copy.key || "").startsWith("upload:") ? Number(String(copy.key).split(":")[1]) : null;
  const save = () => {
    const url = URL.createObjectURL(copy.blob);
    const a = document.createElement("a");
    a.href = url; a.download = copy.name || name || "recording"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const restore = async () => {
    setState({ busy: true, err: "", done: false });
    try {
      const fd = new FormData();
      fd.append("file", copy.blob, copy.name || name || "recording");
      await api(`/api/economy/uploads/${uploadId}/restore/`, { method: "POST", body: fd });
      setState({ busy: false, err: "", done: true });
      onRestored?.();
    } catch (e) { setState({ busy: false, err: e.message || "Couldn't put it back.", done: false }); }
  };
  return (
    <div className="space-y-1">
      <p className="text-xs text-emerald-300">
        ✅ This device still has your copy ({sizeLabel(copy.size)}, kept {new Date(copy.savedAt).toLocaleDateString()}).{" "}
        <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={save}>⬇ Download my copy</button>
        {uploadId != null && !state.done && (
          <button type="button" className="re-btn ml-1 !w-auto px-2 py-0.5" disabled={state.busy} onClick={restore}>{state.busy ? "Putting it back…" : "⬆ Put it back on the server"}</button>
        )}
      </p>
      {uploadId != null && !state.done && !state.busy && <p className="text-[11px] text-white/55">Putting it back keeps the same file, so anything that links to it plays again. Free. It counts against your storage again.</p>}
      {state.done && <p className="text-xs text-emerald-300" role="status">✅ Put back on the server. It plays again.</p>}
      {state.err && <p className="text-xs text-mcz-ember" role="alert">{state.err}</p>}
    </div>
  );
}
