import { useEffect, useState } from "react";
import { Loader2, Lock, Trash2, Upload } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToTab } from "../goto.js";
import MemberName from "../MemberName.jsx";

// FaceZ — the faces you've saved for Video ConnectZ (and Image ConnectZ when it
// ships), and, for adults, a feed of other members' faces to rate. The API
// (/api/economy/facez/) has existed with no screen; Video ConnectZ was the only
// thing that could even upload one. Rating a face is rating somebody on looks,
// so the feed is adults-only both ways — the server decides and says why.

export default function FaceZ() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [tagged, setTagged] = useState("");
  const [rated, setRated] = useState({});

  const load = () => api("/api/economy/facez/").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const body = new FormData();
      body.append("image", file); body.append("name", name.trim());
      if (tagged.trim()) body.append("tagged", tagged.trim().replace(/^@/, ""));
      await api("/api/economy/facez/", { method: "POST", body });
      setName(""); setTagged(""); await load();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  async function remove(id) {
    try { await api(`/api/economy/facez/${id}/`, { method: "DELETE" }); load(); } catch (x) { setErr(x.message); }
  }

  async function rate(f, score) {
    try {
      const r = await api(`/api/economy/facez/${f.id}/rate/`, { method: "POST", body: { score } });
      setRated((m) => ({ ...m, [f.id]: { score, earned: r.earned_energy, median: r.median } }));
      if (r.earned_energy) window.dispatchEvent(new Event("mcz-stats-refresh"));
    } catch (x) { setErr(x.message); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="facez.png" alt="FaceZ" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">FaceZ</h2>
          <p className="text-sm text-white/60">Faces for your AI videos — clear, front-facing photos work best.</p>
        </div>
      </header>
      {err && <p className="text-sm text-mcz-ember">{err}</p>}
      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d && (
        <section className="neon-frame space-y-3 p-4">
          <h3 className="font-semibold">Your faces <span className="text-white/40">({d.mine.length})</span></h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <input className="neon-input !w-auto flex-1" maxLength={80} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="neon-input !w-auto flex-1" maxLength={40} placeholder="Tag a member (optional)" value={tagged} onChange={(e) => setTagged(e.target.value)} />
            <label className="neon-btn-primary !w-auto cursor-pointer px-4">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Add a face
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
            </label>
          </div>
          <p className="text-[11px] text-white/45">Free. Tagging someone tells them. Your faces count toward your storage.</p>
          {d.mine.length === 0 ? (
            <p className="text-sm text-white/55">No faces yet — add one, then star in a video.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {d.mine.map((f) => (
                <div key={f.id} className="group relative overflow-hidden rounded-xl border border-white/10">
                  <img src={f.url} alt={f.name || "face"} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-1.5 py-1 text-[10px]">
                    <span className="truncate">{f.name || "Untitled"}{f.count ? ` · ${f.median ?? "–"}★ (${f.count})` : ""}</span>
                    <button onClick={() => remove(f.id)} aria-label="Delete face" className="text-white/60 hover:text-mcz-ember"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="re-link text-xs" onClick={() => goToTab("videoconnectz")}>Star in a video → Video ConnectZ</button>
        </section>
      )}

      {d && (
        <section className="space-y-3">
          <h3 className="font-semibold">Rate faces <span className="text-xs font-normal text-emerald-300">{d?.rating_reward?.amount
            ? `+${d.rating_reward.amount} ⚡ for your first rating of each (${d.rating_reward.left_today} left today)`
            : d?.rating_reward ? "Today's paid ratings are used — ratings still count" : ""}</span></h3>
          {d.feed_locked ? (
            <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70"><Lock size={14} /> {d.feed_locked}</p>
          ) : d.feed.length === 0 ? (
            <p className="text-sm text-white/55">Nobody else has added a face yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {d.feed.map((f) => {
                const mine = rated[f.id]?.score ?? f.my_rating;
                return (
                  <div key={f.id} className="re-card space-y-1.5 p-2">
                    <img src={f.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <MemberName username={f.owner} />
                    <div className="flex flex-wrap gap-1">
                      {[...Array(10)].map((_, i) => (
                        <button key={i} onClick={() => rate(f, i + 1)}
                          className={`h-6 w-6 rounded text-[11px] ${mine === i + 1 ? "bg-mcz-cyan text-black" : "bg-white/5 text-white/70 hover:bg-white/15"}`}>{i + 1}</button>
                      ))}
                    </div>
                    {rated[f.id] && <p className="text-[10px] text-white/50">Median {rated[f.id].median ?? "–"}{rated[f.id].earned ? <span className="text-emerald-300"> · +{rated[f.id].earned} ⚡</span> : ""}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
