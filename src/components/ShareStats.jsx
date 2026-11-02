// Post a stats snapshot: a range you pick, an audience you pick, and the exact text the
// server will publish, shown before the button (the preview IS the post — the server
// writes it from its own numbers). It becomes an ordinary PostZ post, so it is liked,
// rated, commented on, shared and opened in other apps like any other.
//
//   <ShareStats endpoint={`/api/economy/views/post/${id}/share/`} />
//   <ShareStats endpoint="/api/economy/funnel/share/" membersToggle />
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { ENERGY } from "../resources.js";
import { Price } from "./Price.jsx";
import RangeGates from "../RangeGates.jsx";

const AUD = [["public", "Public"], ["restricted", "Members in a range"], ["private", "Only me"]];

export default function ShareStats({ endpoint, membersToggle = false, defaultDays = 7 }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(defaultDays);
  const [members, setMembers] = useState(false);
  const [vis, setVis] = useState("public");
  const [gates, setGates] = useState({});
  const [snap, setSnap] = useState(null);
  const [cost, setCost] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [posted, setPosted] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSnap(null);
    api(`${endpoint}?days=${days}${members ? "&members=1" : ""}`)
      .then(setSnap).catch((e) => setMsg(e.message || "Couldn't read the numbers."));
  }, [open, days, members, endpoint]);
  useEffect(() => {
    if (open && !cost) api("/api/economy/postz/cost/").then(setCost).catch(() => {});
  }, [open, cost]);

  async function post() {
    setBusy(true); setMsg("");
    try {
      const r = await api(endpoint, { method: "POST", body: { days, members, visibility: vis, gates: vis === "restricted" ? gates : undefined } });
      setPosted(r.post);
    } catch (e) { setMsg(e.message || "Couldn't post it. Nothing was charged."); }
    finally { setBusy(false); }
  }

  if (!open) {
    return <button type="button" className="re-btn !w-auto px-3 text-xs" onClick={() => setOpen(true)}>
      <Send size={12} /> Post these numbers
    </button>;
  }
  return (
    <div className="re-card space-y-2 text-sm" data-tour="share-stats">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-white/50">Range:</span>
        {(snap?.ranges || [1, 7, 14, 30, 90]).map((n) => (
          <button key={n} type="button" onClick={() => setDays(n)}
                  className={`pill text-[11px] ${days === n ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>
            {n === 1 ? "Today" : `${n} days`}
          </button>
        ))}
      </div>
      {membersToggle && (
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked={members} onChange={(e) => setMembers(e.target.checked)} />
          Include who joined (genders and ages, counted, never named)
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-white/50">Who sees it:</span>
        {AUD.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setVis(k)}
                  className={`pill text-[11px] ${vis === k ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>{l}</button>
        ))}
      </div>
      {vis === "restricted" && <RangeGates value={gates} onChange={setGates} title="Which members can see it" />}
      {snap ? <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-[13px] text-white/80">{snap.text}</pre>
            : !msg && <p className="flex items-center gap-2 text-white/50"><Loader2 size={14} className="animate-spin" /> Reading the numbers…</p>}
      {posted ? (
        <p className="text-emerald-300">Posted. <button className="re-link" onClick={() => goToSpot("postz", "feed")}>See it in PostZ →</button></p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="neon-btn-primary !w-auto px-4 py-2 text-xs" disabled={busy || !snap} onClick={post}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Post it{" "}
            <Price amount={cost?.cost?.amount ?? null} emoji={ENERGY} />
          </button>
          <button type="button" className="text-xs text-white/50" onClick={() => setOpen(false)}>Cancel</button>
          <span className="text-[11px] text-white/40">A refused post isn't charged.</span>
        </div>
      )}
      {msg && <p role="alert" className="text-xs text-mcz-ember">{msg}</p>}
    </div>
  );
}
