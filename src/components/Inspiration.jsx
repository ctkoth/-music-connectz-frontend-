import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "../api.js";
import { RatingNumber, RatingRow } from "./Rating.jsx";
import { handOff } from "../handoff.js";
import { ENERGY, PROMPTZ } from "../resources.js";
import { addSide, asFile, asLink, asPost, asUpload, linkVerdict, listenable, matches, samePost, sideLabel, usesPost, withRecording } from "../inspirationSources.js";

// Inspiration — your take, heard against a song you want to sound like. It
// decides nothing: the price, the EQ regions, the notices and every word of the
// result are the server's. Nothing is saved (the server says so and so do we).
// The lyric half hands a DIRECTION to Sentence ConnectZ; the reference's words
// are never shown or carried.
// The server names what each side was; a post is called by its title and artist.
const sideLabelOf = (x) => (x?.kind === "link" ? `a YouTube video${x.start_seconds ? ` from ${Math.floor(x.start_seconds / 60)}:${String(x.start_seconds % 60).padStart(2, "0")}` : ""}` : x?.kind === "post" ? `"${x.title}" by @${x.author}` : x?.title ? `"${x.title}"` : "your file");
const DIR = { more: "needs more", less: "needs less", close: "already close" };

// One side of the comparison: a file from the device, or something already on the platform. Choosing
// a post here is the same thing PostZ's "Coach it" door does for a take — nothing is uploaded twice.
function Source({ label, side, onSide, disabled, posts, mine, uploads, allowUploads, linkSources }) {
  const [open, setOpen] = useState(null);       // null | "posts" | "files" | "link"
  const [url, setUrl] = useState("");
  const verdict = linkVerdict(url, linkSources);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState(mine ? "mine" : "all");
  const list = withRecording(scope === "mine" ? posts.mine : posts.all).filter((p) => matches(p, q)).slice(0, 40);
  const files = listenable(uploads).filter((u) => matches({ title: u.name }, q)).slice(0, 40);
  const choose = (s) => { onSide(s); setOpen(null); setQ(""); };
  const btn = "rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white disabled:opacity-40";
  return (
    <div className="space-y-1.5 rounded-lg border border-white/15 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-white/80">
          {side ? `${label}: ${sideLabel(side)}` : <span className="text-white/45">{label}</span>}
        </span>
        <label className={`${btn} cursor-pointer inline-flex items-center gap-1`}>
          <Upload size={13} /> File
          <input type="file" accept="audio/*,video/*" className="hidden" disabled={disabled}
                 onChange={(e) => { const f = e.target.files?.[0]; if (f) choose(asFile(f)); e.target.value = ""; }} />
        </label>
        <button type="button" className={btn} disabled={disabled} onClick={() => setOpen(open === "posts" ? null : "posts")}>
          A post
        </button>
        {allowUploads && (
          <button type="button" className={btn} disabled={disabled} onClick={() => setOpen(open === "files" ? null : "files")}
                  title="Anything your other apps made — Mix, Instrumental, Video — lives in FileZ">
            From my apps
          </button>
        )}
        <button type="button" className={btn} disabled={disabled} onClick={() => setOpen(open === "link" ? null : "link")}>
          A link
        </button>
        {side && <button type="button" className={btn} disabled={disabled} onClick={() => onSide(null)} aria-label={`Clear ${label}`}>✕</button>}
      </div>
      {open === "link" && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input className="neon-input !py-1.5 w-full text-xs" inputMode="url" autoComplete="off" spellCheck={false}
                   aria-label={`${label} — link`} placeholder="Paste a YouTube link"
                   value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="button" className={btn} disabled={disabled || verdict.state !== "ok"}
                    onClick={() => { onSide(asLink(url)); setOpen(null); setUrl(""); }}>Use</button>
          </div>
          {/* Said as they type, before anything is pressed: a YouTube link can be heard; Spotify and
              SoundCloud serve a player and never the audio, and the server's own sentence says so. */}
          {verdict.state === "ok" && <p className="text-emerald-300/80">{verdict.text}</p>}
          {verdict.state === "no" && <p role="alert" className="text-amber-200">{verdict.text}</p>}
          {verdict.state === "empty" && (
            <p className="text-white/45">
              {(linkSources || []).find((x) => x.provider === "youtube")?.note
                || "Paste a link to a YouTube video."}
            </p>
          )}
        </div>
      )}
      {(open === "posts" || open === "files") && (
        <div className="space-y-1.5">
          <input className="neon-input !py-1.5 w-full text-xs" placeholder={open === "posts" ? "Search title, @artist or genre" : "Search your files"}
                 value={q} onChange={(e) => setQ(e.target.value)} />
          {open === "posts" && (
            <div className="flex gap-1.5 text-[11px]">
              {mine && <button type="button" onClick={() => setScope("mine")} aria-pressed={scope === "mine"}
                               className={`pill !py-0.5 ${scope === "mine" ? "ring-1 ring-mcz-cyan text-mcz-cyan" : ""}`}>My posts</button>}
              <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"}
                      className={`pill !py-0.5 ${scope === "all" ? "ring-1 ring-mcz-cyan text-mcz-cyan" : ""}`}>Everyone's</button>
            </div>
          )}
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {(open === "posts" ? list : files).map((x) => (
              <li key={x.id}>
                <button type="button" className="w-full rounded bg-white/5 px-2 py-1 text-left hover:bg-white/10"
                        onClick={() => choose(open === "posts" ? asPost(x) : asUpload(x))}>
                  <span className="text-white">{x.title || x.name}</span>
                  {open === "posts" && <span className="text-white/45"> · @{x.author}{x.genre ? ` · ${x.genre}` : ""}</span>}
                </button>
              </li>
            ))}
            {(open === "posts" ? list : files).length === 0 && (
              <li className="text-white/45">
                {open === "posts" ? "No posts with a recording match that." : "No audio or video files match that."}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// The comparison in one sentence, from the server's arithmetic (who leads where, and by how much).
function compareLine(c, label) {
  const n = c.dimensions.length;
  const parts = [`You lead in ${c.take_leads} of ${n}`];
  if (c.even) parts.push(`${c.even} even`);
  if (c.widest) parts.push(`the widest gap is ${label(c.widest)}`);
  if (c.closest && c.closest !== c.widest) parts.push(`you're closest on ${label(c.closest)}`);
  return parts.join(" · ") + ".";
}

export default function Inspiration({ appKey, genre, hostBlob, hostName }) {
  const [info, setInfo] = useState(null);
  const [take, setTake] = useState(null);
  const [ref, setRef] = useState(null);
  const [posts, setPosts] = useState({ mine: [], all: [] });
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);

  useEffect(() => {
    let on = true;
    api(`/api/${appKey}/match/`).then((d) => on && setInfo(d)).catch(() => {});
    // The lists to pick from. A failure leaves them empty and the file door still works — the
    // member did not ask for these, so a fetch that fails says nothing.
    Promise.allSettled([api("/api/economy/posts/?mine=1"), api("/api/economy/posts/?sort=top"), api("/api/economy/uploads/")])
      .then(([mine, all, up]) => {
        if (!on) return;
        const rows = (r) => (r.status === "fulfilled" ? (Array.isArray(r.value) ? r.value : r.value?.posts || []) : []);
        setPosts({ mine: rows(mine), all: rows(all) });
        setUploads(up.status === "fulfilled" ? up.value?.uploads || [] : []);
      });
    return () => { on = false; };
  }, [appKey]);

  // A failed fetch renders nothing: a panel the member did not ask for does not
  // announce its own outage.
  if (!info) return null;

  const mine = take || (hostBlob ? asFile(new File([hostBlob], hostName || "take.webm", { type: hostBlob.type })) : null);
  const same = samePost(mine, ref);
  const needsEnergy = usesPost(mine, ref) && info.post_energy_cost > 0;

  const run = async () => {
    if (!mine || !ref || busy || same) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const f = new FormData();
      addSide(f, "take", mine);
      addSide(f, "reference", ref);
      if (genre) f.append("genre", genre);
      setRes(await api(`/api/${appKey}/match/`, { method: "POST", body: f }));
    } catch (e) {
      setErr(`${e.message} Nothing was charged.`);
    } finally { setBusy(false); }
  };

  const toLyrics = () => handOff("sentenceconnectz", "", {
    kind: "lyrics", genre,
    text: `Rewrite my lyrics with this direction (the reference's words are not used):\n${res.lyric_direction}\n\nMy lyrics:\n`,
  });

  return (
    <section className="mt-3 space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 text-xs text-white/75">
      <h3 className="text-sm font-semibold text-white">✨ Inspiration</h3>
      <p>Pick a song you want to sound like and your own take. The coach tells you what separates them — in the score, the EQ and the how-to — and can send a lyric direction to Sentence ConnectZ.</p>
      <p className="text-white/50">{info.notice}</p>
      <Source label="Your take — a file, a post of yours (like a RapZ submission), or your own YouTube link" side={mine} onSide={setTake} disabled={busy}
              posts={posts} mine allowUploads uploads={uploads} linkSources={info.link_sources} />
      <Source label="Reference — a file, any post you can see, or a YouTube link (a famous example)" side={ref} onSide={setRef} disabled={busy}
              posts={posts} uploads={uploads} allowUploads linkSources={info.link_sources} />
      {same && <p className="text-amber-200">That's the same post on both sides — pick a different reference.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={busy || !mine || !ref || same || !info.configured}
                className="rounded-full border border-mcz-cyan bg-mcz-cyan/15 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Compare"}
        </button>
        {/* Price beside the control, before it is pressed; a failed run is free. */}
        <span className="text-mcz-ember">
          {info.free_today ? "Free today — uses 1 free prompt" : `−${info.cost_cents} ${PROMPTZ}`}
          {needsEnergy && <> · −{info.post_energy_cost} {ENERGY} for using a post</>}
        </span>
        <span className="text-white/40">Not charged if it fails · nothing saved</span>
      </div>
      {needsEnergy && <p className="text-white/45">{info.post_note}</p>}
      {err && <p className="text-red-300">{err}</p>}
      {res?.unscorable && <p className="text-amber-200">{res.unscorable}</p>}
      {res && !res.unscorable && (
        <div className="space-y-3">
          {res.sources && (
            <p className="text-white/50">
              Compared {sideLabelOf(res.sources.take)} against {sideLabelOf(res.sources.reference)}.
            </p>
          )}
          <p className="text-lg font-bold text-white">{res.closeness}% <span className="text-xs font-normal text-white/60">close — {res.closeness_why}</span></p>
          <p>{res.summary}</p>
          {res.overall && (
            <div className="grid gap-2 sm:grid-cols-2">
              <RatingRow value={res.overall.take} outOf label="Your take" detail={res.overall.take_why} />
              <RatingRow value={res.overall.reference} outOf label="The reference" detail={res.overall.reference_why} />
            </div>
          )}
          {res.compare?.dimensions?.length > 0 && (
            <div className="space-y-1">
              <p className="text-white/70">
                {compareLine(res.compare, (k) => info.scores?.[k] || k)}
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {res.compare.dimensions.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-2 rounded bg-white/5 px-2 py-1">
                    <span>{info.scores?.[r.key] || r.key}</span>
                    <span className="tabular-nums">
                      you <RatingNumber value={r.take} size="sm" /> · ref <RatingNumber value={r.reference} size="sm" />
                      <span className={`ml-2 text-[11px] ${r.gap > 0 ? "text-emerald-300" : r.gap < 0 ? "text-white/50" : "text-white/40"}`}>
                        {r.gap > 0 ? `you +${r.gap}` : r.gap < 0 ? `ref +${-r.gap}` : "even"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-white/40">Both rated on one 1-10 scale so they compare. Nothing here is saved as your score.</p>
            </div>
          )}
          {res.eq?.length > 0 && (
            <div>
              <p className="font-semibold text-white">EQ</p>
              {res.eq.map((e) => (
                <p key={e.region} className="mt-1"><b>{e.label} ({e.hz}) — {DIR[e.direction]}.</b> {e.what} {e.how && <span className="text-emerald-300">→ {e.how}</span>}</p>
              ))}
              <p className="mt-1 text-white/45">{res.eq_note}</p>
            </div>
          )}
          {res.how_to?.map((h, i) => (
            <div key={i}><p className="font-semibold text-white">{h.what}</p><p>{h.why}</p><p className="text-emerald-300">{h.how}</p></div>
          ))}
          {res.keep && <p><b>Keep:</b> {res.keep}</p>}
          {res.lyric_direction && (
            <div className="rounded border border-white/10 p-2">
              <p className="font-semibold text-white">Lyrics</p>
              <p>{res.lyric_direction}</p>
              <p className="text-white/45">{res.lyric_note}</p>
              <button type="button" onClick={toLyrics} className="mt-1 rounded-full border border-mcz-cyan px-3 py-1 text-[11px] text-white">
                Rewrite my lyrics in Sentence ConnectZ
              </button>
            </div>
          )}
          <p className="text-white/40">
            Not saved. Cost {res.cost_cents ? `${res.cost_cents} ${PROMPTZ}` : "a free daily prompt"}
            {res.energy_cost > 0 ? ` and ${res.energy_cost} ${ENERGY}` : ""}.
          </p>
        </div>
      )}
    </section>
  );
}
