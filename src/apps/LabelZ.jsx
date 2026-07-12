import { useCallback, useEffect, useState } from "react";
import { FileSignature, Loader2, Plus } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

export default function LabelZ() {
  const [data, setData] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [msg, setMsg] = useState("");
  const [newLabel, setNewLabel] = useState({ name: "", bio: "" });
  const [offer, setOffer] = useState({ label_id: "", artist: "", title: "Artist Agreement", terms_text: "", advance_display: "", signed_name: "" });
  const [signName, setSignName] = useState({});

  const load = useCallback(() => {
    api("/api/labelz/").then(setData).catch((e) => setMsg(e.message));
    api("/api/labelz/contracts/").then(setContracts).catch(() => setContracts({ as_artist: [], as_owner: [] }));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createLabel() {
    setMsg("");
    try { await api("/api/labelz/", { method: "POST", body: newLabel }); setNewLabel({ name: "", bio: "" }); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function sendOffer() {
    setMsg("");
    try { await api("/api/labelz/contracts/", { method: "POST", body: offer }); setMsg("Contract offered — signed on your side, awaiting the artist."); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function respond(id, action) {
    setMsg("");
    try {
      await api(`/api/labelz/contracts/${id}/${action}/`, { method: "POST", body: { signed_name: signName[id] || "" } });
      load();
    } catch (e) { setMsg(e.message); }
  }

  if (!data) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;
  const myLabels = data.labels.filter((l) => l.i_own);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="labelz.png" alt="LabelZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#a78bfa" }}>LabelZ</h2>
          <p className="text-sm text-white/60">Public label groups · e-signed artist agreements. Advances settle off-platform.</p>
          <span className="pill mt-1 inline-block">Contracts: adults only · signatures audit-logged</span>
        </div>
      </header>
      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {data.can_create ? (
        <div className="neon-frame space-y-3 p-4">
          <h3 className="font-semibold">Start a label</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="neon-input" placeholder="Label name" value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} />
            <input className="neon-input" placeholder="Bio / mission" value={newLabel.bio} onChange={(e) => setNewLabel({ ...newLabel, bio: e.target.value })} />
          </div>
          <button className="neon-btn-primary !w-auto px-5" onClick={createLabel}><Plus size={16} /> Create label</button>
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/50">
          Creating a label requires Premium/StatZ tier or the A&amp;R Scout / Manager persona — set yours in ProfileZ.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Labels</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.labels.map((l) => (
            <div key={l.id} className="neon-frame p-4">
              <p className="font-semibold">{l.name} {l.i_own && <span className="pill ml-1 text-[10px]">yours</span>}</p>
              <p className="text-xs text-white/55">by {l.owner} · {l.member_count} member{l.member_count === 1 ? "" : "s"}</p>
              {l.bio && <p className="mt-1 text-sm text-white/60">{l.bio}</p>}
            </div>
          ))}
          {data.labels.length === 0 && <p className="text-sm text-white/45">No labels yet — found the first one.</p>}
        </div>
      </div>

      {myLabels.length > 0 && (
        <div className="neon-frame space-y-3 p-4">
          <h3 className="font-semibold"><FileSignature size={16} className="inline" /> Offer a contract</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="neon-input" value={offer.label_id} onChange={(e) => setOffer({ ...offer, label_id: e.target.value })}>
              <option value="">From label…</option>
              {myLabels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input className="neon-input" placeholder="Artist username" value={offer.artist} onChange={(e) => setOffer({ ...offer, artist: e.target.value })} />
            <input className="neon-input" placeholder="Title" value={offer.title} onChange={(e) => setOffer({ ...offer, title: e.target.value })} />
            <input className="neon-input" placeholder="Advance (recorded only, e.g. $200)" value={offer.advance_display} onChange={(e) => setOffer({ ...offer, advance_display: e.target.value })} />
            <textarea className="neon-input sm:col-span-2" rows={4} placeholder="Full agreement terms — splits, term length, termination…" value={offer.terms_text} onChange={(e) => setOffer({ ...offer, terms_text: e.target.value })} />
            <input className="neon-input sm:col-span-2" placeholder="Type YOUR full legal name to sign the offer" value={offer.signed_name} onChange={(e) => setOffer({ ...offer, signed_name: e.target.value })} />
          </div>
          <button className="neon-btn-primary !w-auto px-5" onClick={sendOffer}>Sign &amp; offer</button>
        </div>
      )}

      {contracts && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">My contracts</h3>
          {[...contracts.as_artist, ...contracts.as_owner.filter((c) => !contracts.as_artist.find((a) => a.id === c.id))].map((c) => (
            <div key={c.id} className="neon-frame mb-3 space-y-2 p-4">
              <div className="flex items-start justify-between">
                <p className="font-medium">{c.title} <span className="text-xs text-white/40">· {c.label} → {c.artist}</span></p>
                <span className="pill uppercase">{c.status}</span>
              </div>
              <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-white/70">{c.terms_text}</pre>
              <p className="text-[11px] text-white/40">
                {c.advance_display && <>Advance: {c.advance_display} (off-platform) · </>}
                Doc hash {c.doc_sha256?.slice(0, 12)}… ·
                {c.owner_signed_name && <> Label signed: {c.owner_signed_name}</>}
                {c.artist_signed_name && <> · Artist signed: {c.artist_signed_name}</>}
              </p>
              {c.status === "offered" && contracts.as_artist.find((a) => a.id === c.id) && (
                <div className="flex flex-wrap gap-2">
                  <input className="neon-input !w-64 !py-2 text-xs" placeholder="Type your full legal name"
                         value={signName[c.id] || ""} onChange={(e) => setSignName({ ...signName, [c.id]: e.target.value })} />
                  <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => respond(c.id, "sign")}>Sign</button>
                  <button className="neon-btn-ghost !w-auto px-4 py-2 text-xs" onClick={() => respond(c.id, "decline")}>Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
