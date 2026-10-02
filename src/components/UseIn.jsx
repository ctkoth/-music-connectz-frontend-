import { useEffect, useState } from "react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";

// "Use it in…" for any IntelligenceZ piece. Lists the member's open deals,
// battles and releases, states K-Oth's share of THEIR earnings before the
// button that commits to it, and shows where the piece is already used.
const KIND_LABEL = { collab: "CollabZ", battle: "BattleZ", release: "DistributeZ" };
const CURRENCY = { money: "💵", spinaz: "🍥" };

// Attach a piece to a deal, battle or release. The share is stated before the
// button that commits to it, and only ever comes out of this member's earnings.
export default function UseIn({ source, sourceId, pct, text }) {
  const [targets, setTargets] = useState(null);
  const [uses, setUses] = useState([]);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => api(`/api/economy/intelligence/uses/?source=${source}&source_id=${sourceId}`)
    .then((d) => setUses(d.uses || [])).catch(() => {});
  useEffect(() => {
    api("/api/economy/intelligence/targets/").then((d) => setTargets(d.targets || [])).catch(() => setTargets([]));
    load();
  }, [source, sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = (k, id) => targets?.find((t) => t.kind === k && t.id === id)?.title || `#${id}`;
  const chosen = targets?.find((t) => `${t.kind}:${t.id}` === pick);

  async function attach(text) {
    setMsg("");
    try {
      await api("/api/economy/intelligence/uses/", { method: "POST",
        body: { source, source_id: sourceId, target_kind: chosen.kind, target_id: chosen.id, text } });
      setPick(""); load();
    } catch (e) { setMsg(e.message); }
  }
  async function detach(id) {
    try { await api(`/api/economy/intelligence/uses/${id}/`, { method: "DELETE" }); load(); }
    catch (e) { setMsg(e.message); }
  }

  if (!targets) return null;
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <h4 className="text-sm font-semibold">Use it in…</h4>
      {uses.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
          <span>{KIND_LABEL[u.target_kind]}: {title(u.target_kind, u.target_id)} —{" "}
            <span className="text-mcz-ember">−{u.royalty_pct}% of your earnings</span> to K-Oth
            {(u.paid_cents > 0 || u.paid_spinaz > 0) && <span className="text-white/40"> · paid so far {u.paid_cents ? `${(u.paid_cents / 100).toFixed(2)} 💵` : `${u.paid_spinaz} 🍥`}</span>}
          </span>
          {!u.locked && <button className="re-link" onClick={() => detach(u.id)}>Remove</button>}
        </div>
      ))}
      {targets.length === 0 ? (
        <p className="text-xs text-white/50">
          Nothing open to use it in yet — start a deal in{" "}
          <button className="re-link" onClick={() => goToSpot("collabz", "collabz:main")}>CollabZ</button>, a battle in{" "}
          <button className="re-link" onClick={() => goToSpot("battlez", "battlez:main")}>BattleZ</button>, or distribute a post from{" "}
          <button className="re-link" onClick={() => goToSpot("postz", "composer")}>PostZ</button>.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select className="neon-input !w-auto" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Pick a deal, battle or release…</option>
            {targets.map((t) => (
              <option key={`${t.kind}:${t.id}`} value={`${t.kind}:${t.id}`}>{KIND_LABEL[t.kind]} — {t.title}</option>
            ))}
          </select>
          {chosen && (
            <>
              <span className="text-xs text-mcz-ember">
                −{pct}% of what you earn from it {CURRENCY[chosen.currency] || ""} goes to K-Oth
              </span>
              <button className="re-btn !w-auto px-4" onClick={() => attach(text)}>Use this version</button>
            </>
          )}
        </div>
      )}
      {msg && <p className="text-xs text-mcz-ember">{msg}</p>}
    </div>
  );
}
