import { useEffect, useState } from "react";
import Term from "../components/Term.jsx";
import { Clapperboard, ImagePlus, Loader2, Lock, Star, Trash2, Upload } from "lucide-react";
import { handOff } from "../handoff.js";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToTab } from "../goto.js";
import MemberName from "../MemberName.jsx";
import { useMentionHandlers } from "../MentionParser.jsx";
import { FACE_FEED_NOTE, tagOutcome, unknownTagLine } from "../facez.js";
import { upgradeWords } from "../tierCount.js";

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
  // What happened to the tag on the last upload, when it was not what was asked.
  const [note, setNote] = useState("");
  const [rated, setRated] = useState({});
  // Corey: a face is rated only if its owner wants it rated — off unless ticked.
  const [openNew, setOpenNew] = useState(false);
  const { goToProfile } = useMentionHandlers();

  const load = () => api("/api/economy/facez/").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setBusy(true); setErr(""); setNote("");
    try {
      const body = new FormData();
      body.append("image", file); body.append("name", name.trim());
      if (openNew) body.append("open_to_ratings", "1");
      if (tagged.trim()) body.append("tagged", tagged.trim().replace(/^@/, ""));
      const r = await api("/api/economy/facez/", { method: "POST", body });
      // The photo is saved even when the tag is not: a handle nobody holds is
      // dropped by the server and answered 201. Read what it kept rather than
      // letting the line under the form claim that someone was told.
      const t = tagOutcome(tagged, r);
      if (t.state === "unknown") setNote(unknownTagLine(t.handle));
      setName(""); setTagged(""); await load();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  async function setOpen(f, open) {
    // Flipped at once on screen; a failed save puts it back and says why.
    setD((x) => ({ ...x, mine: x.mine.map((m) => (m.id === f.id ? { ...m, open_to_ratings: open } : m)) }));
    try { await api(`/api/economy/facez/${f.id}/`, { method: "PATCH", body: { open_to_ratings: open } }); }
    catch (x) { setErr(x.message); load(); }
  }

  async function remove(id) {
    if (!window.confirm("Delete this face? It can't be undone.")) return;
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
      {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d && (
        <section className="neon-frame space-y-3 p-4">
          <h3 className="font-semibold">Your faces <span className="text-white/55">({d.mine.length}{d.faces_limit != null ? ` of ${d.faces_limit}` : " · unlimited"})</span></h3>
          {d.faces_full && (
            <p className="text-xs text-mcz-gold">Full — your tier keeps {d.faces_limit} faces. Delete one{d.faces_ladder && upgradeWords(d.faces_limit, d.faces_ladder, "keeps") ? <>, or{" "}
              <button className="re-link" onClick={() => goToTab("membershipz")}>upgrade ({upgradeWords(d.faces_limit, d.faces_ladder, "keeps")})</button></> : null}.</p>
          )}
          <div className="flex flex-wrap gap-2 text-sm">
            <input className="neon-input !w-auto flex-1" maxLength={80} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="neon-input !w-auto flex-1" maxLength={40} placeholder="Tag a member (optional)" value={tagged} onChange={(e) => setTagged(e.target.value)} />
            <label className="flex items-center gap-1 text-xs text-white/70"><input type="checkbox" checked={openNew} onChange={(e) => setOpenNew(e.target.checked)} /> Open to ratings</label>
            <label className={`neon-btn-primary !w-auto cursor-pointer px-4 ${d.faces_full ? "pointer-events-none opacity-50" : ""}`}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />} Add a face
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} />
            </label>
          </div>
          <p className="text-[11px] text-white/60">Free. Tagging a member tells them. Faces aren't counted toward your storage allowance.</p>
          {/* Before the file is chosen, not after: adding a face is entering the
              feed below, and the only way back out is deleting it. */}
          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/65">{d.ratings_note || FACE_FEED_NOTE}</p>
          {note && <p role="status" className="text-xs text-mcz-gold">{note}</p>}
          {d.mine.length === 0 ? (
            <p className="text-sm text-white/55">No faces yet — add one, then star in a video.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[...d.mine].sort((a, b) => (b.median ?? -1) - (a.median ?? -1)).map((f, i, all) => (
                <div key={f.id} className="group overflow-hidden rounded-xl border border-white/10">
                  <div className="relative">
                    <img src={f.url} alt={f.name || "face"} className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-1.5 py-1 text-[10px]">
                      <span className="truncate">{f.name || "Untitled"}{f.count ? ` · ${f.median ?? "–"}★ (${f.count})` : ""}</span>
                      {i === 0 && f.median != null && all.length > 1 && <span className="ml-1 flex items-center gap-0.5 text-mcz-gold" title="Your best-rated face"><Star size={10} /> best</span>}
                      <button onClick={() => remove(f.id)} aria-label="Delete face" className="text-white/60 hover:text-mcz-ember"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {/* Who this face is tagged as — the member was told, and a
                      name you cannot see on your own photo is a tag you cannot
                      check or mean to change. Below the picture, not over it:
                      the name and delete control already sit on the image. */}
                  <div className="flex flex-wrap gap-1 border-t border-white/10 px-1.5 py-1 text-[10px]">
                    <button className="flex items-center gap-0.5 text-mcz-cyan hover:underline" title="Make an AI picture with this face (Image ConnectZ, priced there)"
                      onClick={() => handOff("imageconnectz", "", { face_id: f.id })}><ImagePlus size={11} /> Picture</button>
                    <button className="flex items-center gap-0.5 text-mcz-cyan hover:underline" title="Make an AI video with this face (Video ConnectZ, priced there)"
                      onClick={() => handOff("videoconnectz", "", { face_id: f.id })}><Clapperboard size={11} /> Video</button>
                    <label className="ml-auto flex items-center gap-0.5 text-white/60" title="Let adult members rate this face">
                      <input type="checkbox" checked={!!f.open_to_ratings} onChange={(e) => setOpen(f, e.target.checked)} /> rated</label>
                  </div>
                  {f.tagged && (
                    <div className="border-t border-white/10 px-1.5 py-1 text-[10px] text-white/50">
                      tagged{" "}
                      <button type="button" onClick={() => goToProfile(f.tagged)} title={`View @${f.tagged}'s profile`}
                        className="break-all font-semibold text-mcz-cyan hover:underline">@{f.tagged}</button>
                    </div>
                  )}
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
                    {rated[f.id] && <p className="text-[10px] text-white/50"><Term k="median">Median</Term> {rated[f.id].median ?? "–"}{rated[f.id].earned ? <span className="text-emerald-300"> · +{rated[f.id].earned} ⚡</span> : ""}</p>}
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
