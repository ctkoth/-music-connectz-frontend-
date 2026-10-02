import { useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Send, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { goToSpot, goToTab } from "../goto.js";
import { MONEY } from "../resources.js";

// DistributeZ — your releases. The backend (releasez.py) has filled releases
// from posts and collabs for a long time, and they went nowhere: a post's
// "Fill a release from it" door created one and there was no screen that
// listed it. This is that screen.
//
// What it says out loud, every time, because each is a place a release dies
// quietly otherwise:
//   * what's MISSING, before the Submit button — the server's list, by name;
//   * how many you can still send this month, before you press it (Free: 1);
//   * what submitting actually does — it goes to the Music ConnectZ team, who
//     put it out and credit RoyaltieZ. Not "it's on Spotify now".

const RELEASES = "/api/economy/distributez/releases/";
const STATUS = {
  draft: ["Draft", "border-white/20 text-white/60"],
  ready: ["Ready to send", "border-emerald-300/50 text-emerald-300"],
  submitted: ["Sent", "border-mcz-cyan/50 text-mcz-cyan"],
};

function QuotaLine({ q }) {
  if (!q) return null;
  if (q.per_month == null) return <span className="text-emerald-300">Unlimited releases on your tier.</span>;
  return (
    <span>
      <span className={q.left ? "text-emerald-300" : "text-mcz-ember"}>{q.left} of {q.per_month}</span> release
      {q.per_month === 1 ? "" : "s"} left this month on Free.{" "}
      <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Premium sends as many as you like</button>
    </span>
  );
}

function ReleaseCard({ r, quota, onChanged }) {
  const [f, setF] = useState({ title: r.title, artist_name: r.artist_name, genre: r.genre,
    release_date: r.release_date, isrc: r.isrc, explicit: r.explicit, lyrics: r.lyrics });
  const [open, setOpen] = useState(r.status !== "submitted");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const locked = new Set(r.locked || []);
  const dirty = Object.keys(f).some((k) => (f[k] ?? "") !== (r[k] ?? ""));
  const sent = r.status === "submitted";
  const canSend = r.ready && !sent && !(quota?.per_month != null && quota.left <= 0);

  async function run(kind, fn) {
    setBusy(kind); setMsg("");
    try { await fn(); onChanged(); } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  }
  const save = () => run("save", () => api(`${RELEASES}${r.id}/`, { method: "PATCH", body: f }));
  const send = () => run("send", () => api(`${RELEASES}${r.id}/submit/`, { method: "POST", body: {} }));
  const drop = () => run("drop", () => api(`${RELEASES}${r.id}/`, { method: "DELETE" }));
  const field = (k, label, props = {}) => (
    <label className="text-[11px] text-white/50">
      {label}
      <input className="neon-input !py-1.5 text-sm" value={f[k] ?? ""} disabled={locked.has(k)}
        onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="neon-frame space-y-3 p-3">
      <div className="flex items-start gap-3">
        {r.artwork_url
          ? <img src={r.artwork_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-mcz-ember/50 text-[10px] text-mcz-ember">no cover</div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{r.title || "Untitled"}</p>
          <p className="truncate text-xs text-white/55">{r.artist_name}{r.genre ? ` · ${r.genre}` : ""}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`rounded-full border px-2 py-0.5 ${STATUS[r.status]?.[1]}`}>{STATUS[r.status]?.[0] || r.status}</span>
            {r.submitted_at && <span className="text-white/40">sent {new Date(r.submitted_at).toLocaleDateString()}</span>}
            {r.source_post && <a className="re-link" href={r.source_post.url}>from “{r.source_post.title}” <ExternalLink size={10} className="inline" /></a>}
            {r.source_deal && <button className="re-link" onClick={() => goToSpot("collabz", "collabz-deals")}>from the collab “{r.source_deal.title}”</button>}
          </div>
        </div>
        <button className="text-xs text-white/50 hover:text-white" onClick={() => setOpen((v) => !v)}>{open ? "Less" : "Edit"}</button>
      </div>

      {r.missing?.length > 0 && (
        <p className="text-xs text-mcz-ember">Still needs {r.missing.join(", ")} — add it on the post it came from, then press Fill again.</p>
      )}
      {r.audio_url && <audio src={r.audio_url} controls className="h-8 w-full" />}

      {open && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {field("title", "Title", { maxLength: 160 })}
            {field("artist_name", "Artist", { maxLength: 120 })}
            {field("genre", "Genre", { maxLength: 40 })}
            {field("release_date", "Release date", { type: "date" })}
            {field("isrc", "ISRC (if you have one)", { maxLength: 15, placeholder: "e.g. USRC17607839" })}
            <label className="flex items-end gap-2 pb-2 text-xs text-white/70">
              <input type="checkbox" checked={!!f.explicit} onChange={(e) => setF({ ...f, explicit: e.target.checked })} /> Explicit
            </label>
          </div>
          <label className="block text-[11px] text-white/50">
            Lyrics
            <textarea className="neon-input text-sm" rows={3} value={f.lyrics || ""} onChange={(e) => setF({ ...f, lyrics: e.target.value })} />
          </label>
          {locked.size > 0 && <p className="text-[11px] text-white/45">It's out, so the title and ISRC are fixed — everything else can still change.</p>}
          <div className="flex flex-wrap items-center gap-2">
            {dirty && <button className="re-btn !w-auto px-4 py-1.5 text-xs" disabled={!!busy} onClick={save}>{busy === "save" ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} Save</button>}
            {!sent && (
              <button className="neon-btn-primary !w-auto px-4 py-1.5 text-xs" disabled={!!busy || !canSend || dirty} onClick={send}
                title={dirty ? "Save your changes first" : ""}>
                {busy === "send" ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />} Send it — free
              </button>
            )}
            {!sent && <button className="text-xs text-white/40 hover:text-mcz-ember" disabled={!!busy} onClick={drop}><Trash2 size={12} className="inline" /> Drop the draft</button>}
          </div>
          {!sent && !r.ready && <p className="text-[11px] text-white/45">Send unlocks once nothing is missing.</p>}
          {!sent && r.ready && quota?.per_month != null && quota.left <= 0 && (
            <p className="text-[11px] text-mcz-ember">This month's Free release is used — it stays ready here for next month.</p>
          )}
        </div>
      )}
      {sent && (
        <button className="re-link text-xs" onClick={() => goToTab("royaltiez")}>What it earns lands in RoyaltieZ →</button>
      )}
      {msg && <p className="text-xs text-mcz-ember">{msg}</p>}
    </div>
  );
}

function OwnerQueue() {
  const [rows, setRows] = useState(null);
  const [amt, setAmt] = useState({});
  const [msg, setMsg] = useState("");
  const load = () => api("/api/economy/distributez/queue/").then((d) => setRows(d.releases || [])).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  async function credit(r) {
    const cents = Math.round(parseFloat(amt[r.id] || "0") * 100);
    if (!(cents > 0)) return;
    try {
      await api("/api/economy/royalties/accrue/", { method: "POST", body: { username: r.username, amount_cents: cents, release_id: r.id } });
      setMsg(`Credited ${MONEY} $${(cents / 100).toFixed(2)} to @${r.username} for “${r.title}”.`); setAmt({ ...amt, [r.id]: "" });
    } catch (e) { setMsg(e.message); }
  }
  return (
    <section className="space-y-2 rounded-xl border border-mcz-gold/40 p-3">
      <h3 className="font-semibold text-mcz-gold">Owner · sent releases to distribute</h3>
      <p className="text-[11px] text-white/50">Oldest first. When a release earns, credit it here — any IntelligenceZ royalty share on it is taken automatically.</p>
      {msg && <p className="text-xs text-white/70">{msg}</p>}
      {rows?.length === 0 && <p className="text-xs text-white/50">Nothing waiting.</p>}
      {(rows || []).map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-2 text-xs">
          <span className="min-w-0 flex-1 truncate"><b>{r.title}</b> — {r.artist_name} · @{r.username}</span>
          {r.audio_url && <a className="re-link" href={r.audio_url} target="_blank" rel="noreferrer">song</a>}
          {r.artwork_url && <a className="re-link" href={r.artwork_url} target="_blank" rel="noreferrer">cover</a>}
          {r.video_url && <a className="re-link" href={r.video_url} target="_blank" rel="noreferrer">video</a>}
          <input className="neon-input !w-24 !py-1 text-xs" type="number" min="0.01" step="0.01" placeholder="$ earned"
            value={amt[r.id] || ""} onChange={(e) => setAmt({ ...amt, [r.id]: e.target.value })} />
          <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => credit(r)}>Credit</button>
        </div>
      ))}
    </section>
  );
}

export default function DistributeZ() {
  const [d, setD] = useState(null);
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);

  const load = () => api(RELEASES).then(setD).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    api("/api/economy/postz/?mine=1").then((r) => setPosts(r.posts || [])).catch(() => setPosts([]));
  }, []);

  const releasedPostIds = new Set((d?.releases || []).map((r) => r.source_post?.id).filter(Boolean));
  const candidates = (posts || []).filter((p) => !releasedPostIds.has(p.id));

  async function fill(p) {
    setBusy(p.id); setErr("");
    try { await api(`/api/economy/postz/${p.id}/distribute/`, { method: "POST", body: {} }); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="distributez.png" alt="DistributeZ" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">DistributeZ</h2>
          <p className="text-sm text-white/60">Your post's song, cover, video and lyrics become a release — nothing retyped.</p>
        </div>
      </header>

      {d && (
        <div className="space-y-1 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/65">
          <p>{d.how_it_works}</p>
          <p><QuotaLine q={d.quota} /></p>
          {d.required?.length > 0 && <p className="text-white/45">Every release needs {d.required.join(", ")}.</p>}
        </div>
      )}
      {err && <p className="text-sm text-mcz-ember">{err}</p>}
      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d?.is_owner && <OwnerQueue />}

      <section className="space-y-2" data-tour="distributez-releases">
        <h3 className="font-semibold">Your releases {d && <span className="text-white/40">({d.releases.length})</span>}</h3>
        {d?.releases.length === 0 && <p className="text-sm text-white/55">None yet — fill one from a post below.</p>}
        {(d?.releases || []).map((r) => <ReleaseCard key={`${r.id}-${r.status}`} r={r} quota={d.quota} onChanged={load} />)}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Fill a release from a post</h3>
        {posts === null && <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="animate-spin" size={12} /> Your posts…</p>}
        {posts && candidates.length === 0 && (
          <p className="text-sm text-white/55">
            {posts.length ? "Every post of yours already has a release." : "Post a track first — "}
            {!posts.length && <button className="re-link" onClick={() => goToSpot("postz", "composer")}>open PostZ</button>}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {candidates.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{p.title}</span>
              <button className="re-btn !w-auto px-3 py-1 text-xs" disabled={busy === p.id} onClick={() => fill(p)}>
                {busy === p.id ? <Loader2 className="animate-spin" size={12} /> : null} Fill a release · free
              </button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-white/40">Collabs can be released too — open the deal in CollabZ and use “Distribute”.</p>
      </section>
    </div>
  );
}
