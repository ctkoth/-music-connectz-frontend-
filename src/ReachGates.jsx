// "Who can reach me": the five range gates, applied to messages and calls
// sent TO you. Open by default — this is for members who are bothered, not a
// wall everyone starts behind. People you follow always get through.
import { useEffect, useState } from "react";
import { api } from "./api.js";
import RangeGates from "./RangeGates.jsx";

export default function ReachGates() {
  const [gates, setGates] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api("/api/economy/reach/").then((d) => setGates(d.gates || {})).catch(() => setGates(null)); }, []);
  if (gates === null) return null;
  const any = Object.keys(gates).length > 0;

  async function save() {
    try {
      const d = await api("/api/economy/reach/", { method: "POST", body: { gates } });
      setGates(d.gates || {});
      setMsg(Object.keys(d.gates || {}).length ? "Saved — strangers outside these ranges can't message or call you." : "Saved — anyone can reach you.");
    } catch (e) { setMsg(e.message || "Couldn't save that."); }
  }

  return (
    <div className="re-card space-y-2">
      <p className="text-sm font-semibold text-white">Who can reach me</p>
      <p className="text-[11px] text-white/45">
        {any ? "Messages and calls from members outside these ranges are refused, and they're told why."
             : "Anyone can message or call you. Set ranges below if you'd rather not hear from everyone."}
        {" "}People you follow can always reach you.
      </p>
      <RangeGates value={gates} onChange={setGates} title="Ranges for messages & calls" />
      <div className="flex flex-wrap gap-2">
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={save}>Save</button>
        {any && <button className="neon-btn-ghost !w-auto px-4 py-2 text-xs" onClick={() => setGates({})}>Clear (everyone)</button>}
      </div>
      {msg && <p className="text-[11px] text-mcz-cyan">{msg}</p>}
    </div>
  );
}
