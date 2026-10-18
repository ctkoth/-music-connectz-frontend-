import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { goToSpot } from "../goto.js";
import { openDoor } from "../doors.js";
import { api } from "../api.js";
import { shareLink, shareText } from "../shareText.js";
import DeclareHuman, { declareHuman } from "./DeclareHuman.jsx";
import { shellHas, IN_SHELL } from "../standalone.js";
import PromoPost from "./PromoPost.jsx";
import HashtagCount, { hashtagBody } from "./HashtagCount.jsx";
import { useRemembered } from "../useRemembered.js";
import { saveText } from "../download.js";
import { PROMPTZ } from "../resources.js";
import { RatingGrid, RatingNumber } from "./Rating.jsx";
import { DEFAULT_FILTER, DEFAULT_SORT, filterTakes, genresOf, isDefault, needsAll, sortTakes } from "../takeSort.js";

// The coach's recent submissions, and where each one can go next.
//
// A score with a date was a dead end: the take had been judged, the read was
// good, and the only thing the screen offered was a number. Every row opens to
// the read and to the doors the SERVER lists for it (`exports`) — a post draft,
// a message, a journal entry, the drills, the punchline writer, a battle — each
// with what it does and what it costs said BEFORE the member presses it.
//
// It decides nothing about which doors exist or what is in them: the server owns
// the list and the words (apps/economy/takescorez.exports_for), so a destination
// added there shows up here without a release, and the sentence a member reads
// is the one the server stands behind.
//
// What travels is the score and the coach's read, never audio — a take recorded
// in the coach was scored and not kept. The panel says so rather than letting
// "export" imply the recording goes too.

function Cost({ cost }) {
  if (!cost) return null;
  return cost.free_today
    ? <span className="text-emerald-300">free today</span>
    : <span className="text-mcz-ember">−{cost.amount} {PROMPTZ}</span>;
}

function Row({ t, labels, appKey }) {
  const [open, setOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [shareUrl, setShareUrl] = useState(t.share_url || "");
  const [human, setHuman] = useState(false);
  const [promo, setPromo] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoFor, setPromoFor] = useState("post");
  const [tags, setTags] = useRemembered("promo-hashtags", "");
  const read = t.read || {};
  // The promo post is a paid Sentence ConnectZ run, and no standalone shell has
  // that writer in its listing or its data-safety answers — so no shell offers it.
  const doors = (t.exports || []).filter((e) => shellHas(e.tab) && !(IN_SHELL && e.kind === "promo"));
  // "Share this score" is not a handoff to another screen: it asks the server for
  // the public link of THIS take (minted once, from what the coach said), then
  // opens the device's share sheet — or copies — with the link in it.
  async function shareIt() {
    setShareMsg("");
    try {
      const r = await api(`/api/${appKey}/take/${t.id}/share/`, { method: "POST" });
      setShareUrl(r.share_url);
      try { await declareHuman(r.share_url, human); } catch { /* shared without the claim */ }
      const how = await shareLink({ text: shareText({ score: t.overall, exact: t.exact, pb: t.pb }), url: r.share_url });
      setShareMsg(how === "shared" ? "Shared." : how === "copied" ? "Link copied — paste it anywhere." : "");
    } catch (e) { setShareMsg(e.message || "Couldn't make the link."); }
  }
  // "Write a promo post" is the share link (free) and then one paid writer run: the
  // link first so the declaration is on the card before the text points at it.
  async function promoIt(kind = "post") {
    if (promoBusy) return;
    setPromoBusy(true); setPromoMsg(""); setPromo(null); setPromoFor(kind);
    try {
      const sh = await api(`/api/${appKey}/take/${t.id}/share/`, { method: "POST" });
      setShareUrl(sh.share_url);
      try { await declareHuman(sh.share_url, human); } catch { /* the post is written without the claim */ }
      const r = await api(`/api/${appKey}/take/${t.id}/promo/`, { method: "POST", body: { kind, ...hashtagBody(tags) } });
      setPromo(r);
    } catch (e) { setPromoMsg(`${e.message || "Couldn't write it."} Nothing was charged.`); }
    finally { setPromoBusy(false); }
  }
  const [dlMsg, setDlMsg] = useState("");
  async function downloadIt(fmt) {
    setDlMsg("");
    try { saveText(await api(`/api/${appKey}/take/${t.id}/download/?format=${fmt}`)); }
    catch (e) { setDlMsg(e.message || "Couldn't make the file."); }
  }
  const go = (e) => (e.kind === "share" ? shareIt() : e.kind === "promo" ? promoIt(e.promo_kind) : e.kind === "download" ? downloadIt("txt") : openDoor(e));
  return (
    <li className="rounded-lg bg-white/5 text-[12px]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
        {open ? <ChevronDown size={13} className="text-white/40" /> : <ChevronRight size={13} className="text-white/40" />}
        <RatingNumber size="md" outOf value={t.overall} exact={t.exact} />
        {t.pb && <span className="rounded-full bg-mcz-gold/15 px-2 py-0.5 text-[10px] font-semibold text-mcz-gold">🏆 Personal best</span>}
        <span className="text-white/45">{new Date(t.at).toLocaleDateString()}</span>
        {t.genre && <span className="text-white/35">{t.genre}</span>}
        {t.difficulty && <span className="text-white/35">{t.difficulty}</span>}
        {t.range_class && <span className="text-white/35">{t.range_class}</span>}
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/[0.06] px-3 py-2">
          {t.file?.kept && t.file.url && (
            /^video\//.test(t.file.content_type || "")
              ? <video src={t.file.url} controls preload="none" className="w-full max-w-sm rounded-lg" />
              : <audio src={t.file.url} controls preload="none" className="w-full max-w-sm" />
          )}
          {t.file && !t.file.kept && <p className="text-[11px] text-white/40">{t.file.why}</p>}
                    {read.verdict && <p className="text-white/75">{read.verdict}</p>}
          <RatingGrid rows={Object.entries(t.scores || {}).filter(([k]) => labels[k]).map(([k, v]) => ({
            key: k, label: labels[k], value: v }))} />
          {read.strengths?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-300/80">What worked</p>
              {read.strengths.map((s, i) => <p key={i} className="text-white/65">· {s}</p>)}
            </div>
          )}
          {read.fixes?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-mcz-ember/80">Fix this</p>
              {read.fixes.map((s, i) => <p key={i} className="text-white/65">· {s}</p>)}
            </div>
          )}
          {read.practice?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-mcz-cyan/80">Practise this</p>
              {read.practice.map((p, i) => (
                <p key={i} className="text-white/65">
                  <b className="text-mcz-cyan">{p.what}</b>{p.why ? ` — ${p.why}` : ""}{p.how ? ` ${p.how}` : ""}
                </p>
              ))}
            </div>
          )}
          {!read.verdict && !read.fixes?.length && (
            <p className="text-white/40">This take was scored before the read was kept, so there is only the score to carry.</p>
          )}

          {t.open_in?.tab && shellHas(t.open_in.tab) && (
            <button onClick={() => goToSpot(t.open_in.tab, t.open_in.target)}
                    className="text-mcz-cyan hover:underline">Open where it came from</button>
          )}

          {doors.length > 0 && (
            <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Take it further</p>
              {doors.map((e) => (
                <div key={e.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  {(e.kind === "share" || e.kind === "promo") && <div className="basis-full"><DeclareHuman checked={human} onChange={setHuman} /></div>}
                  <button onClick={() => go(e)} data-door={e.key} disabled={(e.kind === "promo" && promoBusy)}
                          className="rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">
                    {e.label}
                  </button>
                  <Cost cost={e.cost} />
                  {e.kind === "promo" && <HashtagCount value={tags} onChange={setTags} />}
                  <span className="text-[11px] text-white/45">{e.note}</span>
                  {e.kind === "share" && shareUrl && (
                    <span className="flex flex-wrap gap-2 text-[11px]">
                      <a href={shareUrl} target="_blank" rel="noreferrer" className="text-white/55 underline">See the card</a>
                      <a href={`/api/economy/scores/${shareUrl.replace(/^\/s\//, "")}/card.png?format=story`} download="coach-score-story.png"
                         target="_blank" rel="noreferrer" className="text-white/55 underline">Story card (TikTok / Reels)</a>
                    </span>
                  )}
                  {e.kind === "share" && shareMsg && <span className="text-[11px] text-emerald-300">{shareMsg}</span>}
                  {e.kind === "promo" && promoBusy && promoFor === e.promo_kind && <span className="text-[11px] text-white/50">Writing…</span>}
                  {e.kind === "promo" && promoMsg && promoFor === e.promo_kind && <span className="text-[11px] text-mcz-ember">{promoMsg}</span>}
                  {e.kind === "promo" && promo && e.promo_kind === promoFor && <PromoPost key={`${promo.id}-${promoFor}`} promo={promo} onClose={() => setPromo(null)} />}
                  {e.kind === "download" && (<><button type="button" onClick={() => downloadIt("json")} className="text-[11px] text-white/55 underline">as JSON</button>{t.file?.kept && t.file.url && <a href={t.file.url} download className="text-[11px] text-mcz-cyan underline">Download the recording</a>}{dlMsg && <span className="text-[11px] text-mcz-ember">{dlMsg}</span>}</>)}
                </div>
              ))}
              <p className="text-[11px] text-white/35">
                The score and the coach's read travel; the recording doesn't — it was scored, not kept.
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function RecentTakes({ takes, dimensions, appKey, total, showingAll, onShowAll }) {
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [allMsg, setAllMsg] = useState("");
  // Any order but newest-first, and any filter, is only true over EVERY take — the ten
  // newest sorted by score are not the member's best ten — so asking for one loads the rest.
  useEffect(() => { if (needsAll(sort, filter) && !showingAll && onShowAll) onShowAll(); }, [sort, filter, showingAll, onShowAll]);
  const labels = Object.fromEntries((dimensions || []).map((d) => [d.key, d.label]));
  const list = useMemo(() => sortTakes(filterTakes(takes || [], filter), sort), [takes, sort, filter]);
  const genres = useMemo(() => genresOf(takes || []), [takes]);
  if (!takes?.length) return null;
  const loading = needsAll(sort, filter) && !showingAll;
  const downloadAll = async (fmt) => {
    setAllMsg("");
    try { saveText(await api(`/api/${appKey}/takes/export/?format=${fmt}`)); }
    catch (e) { setAllMsg(e.message || "Couldn't make the file."); }
  };
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/40">Recent takes</p>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]" data-take-controls>
        <label className="flex items-center gap-1.5 text-white/55">Sort by
          <select data-nomemo="true" value={sort.by} onChange={(e) => setSort((x) => ({ ...x, by: e.target.value }))}
                  className="neon-input !w-auto !py-0.5 text-[12px]">
            <option value="date">Date</option>
            <option value="overall">Overall score</option>
            {(dimensions || []).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </label>
        <button type="button" data-sort-dir onClick={() => setSort((x) => ({ ...x, dir: x.dir === "asc" ? "desc" : "asc" }))}
                className="rounded-md bg-white/10 px-2 py-0.5 text-white/70 hover:bg-white/15"
                title="Flip the order">
          {sort.by === "date" ? (sort.dir === "desc" ? "Newest first ↓" : "Oldest first ↑")
            : (sort.dir === "desc" ? "Highest first ↓" : "Lowest first ↑")}
        </button>
        <label className="flex items-center gap-1.5 text-white/55">
          <input type="checkbox" checked={filter.pbOnly} onChange={(e) => setFilter((f) => ({ ...f, pbOnly: e.target.checked }))} />
          🏆 Personal bests only
        </label>
        {genres.length > 1 && (
          <select data-nomemo="true" aria-label="Genre" value={filter.genre} onChange={(e) => setFilter((f) => ({ ...f, genre: e.target.value }))}
                  className="neon-input !w-auto !py-0.5 text-[12px]">
            <option value="">All genres</option>
            {genres.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        {!isDefault(sort, filter) && (
          <button type="button" onClick={() => { setSort(DEFAULT_SORT); setFilter(DEFAULT_FILTER); }} className="text-white/45 underline">Reset</button>
        )}
      </div>
      {loading && <p className="mb-1 text-[11px] text-white/45">Loading every take so the order is true across all of them…</p>}
      {!loading && list.length === 0 && <p className="text-[12px] text-white/50">No takes match that filter.</p>}
      <ul className="space-y-1">
        {list.map((t) => <Row key={t.id} t={t} labels={labels} appKey={appKey} />)}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" data-download-all>
        <span className="text-white/45">Download all {total ?? takes.length} takes:</span>
        <button type="button" onClick={() => downloadAll("csv")} className="text-mcz-cyan underline">spreadsheet (.csv)</button>
        <button type="button" onClick={() => downloadAll("json")} className="text-mcz-cyan underline">.json</button>
        {allMsg && <span className="text-mcz-ember">{allMsg}</span>}
      </div>
      {!showingAll && total > takes.length && onShowAll && (
        <button type="button" onClick={onShowAll} data-show-all
                className="mt-2 text-[12px] text-mcz-cyan underline">
          Show all {total} takes — {total - takes.length} older {total - takes.length === 1 ? "one is" : "ones are"} not listed
        </button>
      )}
      <p className="mt-2 text-[11px] text-white/35">
        Takes are listed with their score and the coach's read. The recording itself is only here when you ticked
        "Keep this take" or the take came from a post or journal entry — older takes were scored and not stored.
      </p>
    </div>
  );
}
