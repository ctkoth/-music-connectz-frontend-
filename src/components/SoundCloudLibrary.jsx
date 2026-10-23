import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { LAST } from "../SoundCloudImport.jsx";
import { ENERGY } from "../resources.js";
import {
  LABEL, VISIBILITIES, alreadyAt, canApply, chunk, countsLine, mergeResults, orderedIds,
  pageFullySelected, previewText, resultLine, selectPage, toggleId, unselectPage,
} from "../soundcloudLibrary.js";

// "Your SoundCloud tracks": the manager for imported drafts. The import keeps
// no SoundCloud token, so choosing happens HERE, after the import. Every price,
// consent rule and sentence below is the server's; this screen decides nothing.
// Nothing here has run against SoundCloud itself.

const Cost = ({ cost }) => (cost && cost.amount > 0
  ? <span className="text-mcz-ember">−{cost.amount} {ENERGY}</span>
  : <span className="text-emerald-300">Free</span>);

export default function SoundCloudLibrary({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());
  const [order, setOrder] = useState([]);
  const [target, setTarget] = useState("public");
  const [consent, setConsent] = useState(false);
  const [pv, setPv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState("");
  const root = useRef(null);
  const [last, setLast] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(LAST) || "null"); } catch { return null; }
  });
  const dismissLast = () => { setLast(null); try { sessionStorage.removeItem(LAST); } catch { /* nothing */ } };

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (filter) qs.set("visibility", filter);
    if (q) qs.set("q", q);
    try { setData(await api(`/api/economy/soundcloud/library/?${qs}`)); setError(""); }
    catch (e) { setError(e.message || "Could not load your SoundCloud tracks."); }
  }, [page, filter, q]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const ids = orderedIds(sel, order.length ? order : (data?.rows || []).map((r) => r.id));

  // The preview is the server's, and is asked for before the button exists.
  useEffect(() => {
    setPv(null);
    if (!ids.length) return undefined;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const out = await api("/api/economy/soundcloud/library/preview/", {
          method: "POST", body: { ids, visibility: target, confirm_private_secret: consent } });
        if (live) setPv(out);
      } catch (e) { if (live) setError(e.message); }
    }, 250);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, target, consent, data?.counts?.total]);

  const card = last && (
    <div className="rounded-xl border border-mcz-cyan/30 bg-mcz-cyan/5 p-3 text-sm space-y-1" role="status">
      <p className="text-white/85">
        {last.imported} imported as private drafts · {last.already_here} already here
        {last.private_imported ? ` · ${last.private_imported} private on SoundCloud` : ""}
        {last.unplayable ? ` · ${last.unplayable} left out (no usable player)` : ""}
      </p>
      {last.detail && <p className="text-[11px] text-white/55">{last.detail}</p>}
      {last.more_may_remain && <p className="text-[11px] text-amber-300">There may be more: run the import again to carry on.</p>}
      <button className="underline text-[11px] text-white/50" onClick={() => { dismissLast(); root.current?.scrollIntoView?.({ behavior: "smooth" }); }}>Got it</button>
    </div>
  );

  if (!data) {
    return error ? <p className="text-sm text-mcz-ember">{error}</p> : null;
  }
  const c = data.counts;
  if (!c.total) {
    return (
      <>{card}<p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-white/45">
        No SoundCloud tracks imported yet. Importing (from your profile) adds each track as a private
        draft only you can see; you choose here which ones go public, restricted or stay private.
      </p></>
    );
  }

  async function selectEverything() {
    const qs = new URLSearchParams({ ids: "1" });
    if (filter) qs.set("visibility", filter);
    if (q) qs.set("q", q);
    try {
      const r = await api(`/api/economy/soundcloud/library/?${qs}`);
      setOrder(r.ids); setSel(new Set(r.ids));
    } catch (e) { setError(e.message); }
  }

  async function oneRow(row, vis) {
    if (row.private_on_sc && row.visibility === "private" && vis !== "private"
        && !window.confirm("This track is private on SoundCloud. Publishing shares its secret link with everyone who can see the post. Publish anyway?")) return;
    await run([row.id], vis, row.private_on_sc);
  }

  async function run(list, vis, consentFlag) {
    setBusy(true); setOutcome(null); setError("");
    const parts = [];
    try {
      const groups = chunk(list, data.max_per_call || 100);
      for (let i = 0; i < groups.length; i++) {
        setProg(groups.length > 1 ? `Batch ${i + 1} of ${groups.length}…` : "Working…");
        const part = await api("/api/economy/soundcloud/library/apply/", {
          method: "POST", body: { ids: groups[i], visibility: vis, confirm_private_secret: !!consentFlag } });
        parts.push(part);
        if (part.stopped) break;
      }
    } catch (e) {
      setError(e.message || "Something went wrong part way. Nothing after this point was changed.");
    }
    const m = mergeResults(parts);
    setOutcome(m);
    setSel(new Set()); setConsent(false);
    setBusy(false); setProg("");
    await load();   // never trust a stale list after a write
  }

  const rows = data.rows;
  const needs = pv?.needs_consent?.length || 0;
  const ready = canApply(pv, target, ids.length);

  return (
    <div ref={root} id="sc-library" className="space-y-3">
    {card}
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Your SoundCloud tracks</p>
      <p className="text-sm text-white/70">{countsLine(c)}{c.private_on_sc ? ` · ${c.private_on_sc} private on SoundCloud` : ""}</p>

      <ul className="space-y-1 text-[11px] leading-relaxed text-white/50">
        {VISIBILITIES.map((v) => <li key={v}><strong className="text-white/70">{LABEL[v]}</strong>: {data.explain[v]}</li>)}
      </ul>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select aria-label="Which tracks" className="neon-input !w-auto" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All</option>
          {VISIBILITIES.map((v) => <option key={v} value={v}>{LABEL[v]}</option>)}
        </select>
        <input className="neon-input !w-auto" placeholder="Search titles" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label className="flex items-center gap-1 text-white/60">
          <input type="checkbox" checked={pageFullySelected(sel, rows)}
            onChange={(e) => setSel(e.target.checked ? selectPage(sel, rows) : unselectPage(sel, rows))} />
          Select this page
        </label>
        {data.matching > rows.length && (
          <button className="underline text-mcz-cyan" onClick={selectEverything}>Select all {data.matching}</button>
        )}
        {sel.size > 0 && <button className="underline text-white/50" onClick={() => setSel(new Set())}>Clear ({sel.size})</button>}
      </div>

      <ul className="divide-y divide-white/5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-1.5">
            <input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel(toggleId(sel, r.id))} />
            {r.artwork
              ? <img src={r.artwork} alt="" className="h-9 w-9 rounded object-cover" loading="lazy" />
              : <div className="h-9 w-9 rounded bg-white/5" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white/85">{r.title}{r.private_on_sc && <span className="ml-1 text-[10px] text-amber-300">🔒 private on SoundCloud</span>}</p>
              <p className="text-[10px] text-white/35">
                {r.released_at ? `Released ${r.released_at.slice(0, 10)}` : `Imported ${r.imported_at.slice(0, 10)}`}
                {r.soundcloud_url && <> · <a className="underline" href={r.soundcloud_url} target="_blank" rel="noreferrer">SoundCloud</a></>}
              </p>
              {!r.can_publish && r.why_not && <p className="text-[10px] text-mcz-ember">{r.why_not}</p>}
            </div>
            <div className="flex gap-1">
              {VISIBILITIES.map((v) => (
                <button key={v} disabled={busy || r.visibility === v}
                  onClick={() => oneRow(r, v)}
                  className={`pill !px-1.5 !py-0 !text-[10px] ${r.visibility === v ? "!border-emerald-300/60 !text-emerald-300" : ""}`}>
                  {LABEL[v]}{r.visibility === "private" && v !== "private" && r.publish_cost.amount > 0 &&
                    <span className="ml-1 text-mcz-ember">−{r.publish_cost.amount} {ENERGY}</span>}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {data.pages > 1 && (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="underline">Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="underline">Next</button>
        </div>
      )}

      {ids.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/70">Set {ids.length} selected to:</span>
            {VISIBILITIES.map((v) => (
              <button key={v} onClick={() => { setTarget(v); setConsent(false); }}
                className={`pill !px-2 !py-0.5 ${target === v ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>{LABEL[v]}</button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-white/60">{data.explain[target]}</p>
          {target !== "private" && <p className="text-[11px] leading-relaxed text-white/45">{data.dating}</p>}
          {pv && <p className="text-sm text-white/85">{previewText(pv)}</p>}
          {needs > 0 && (
            <label className="flex items-start gap-2 text-[11px] text-amber-300">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Include the {needs} that are private on SoundCloud and share their secret link.
            </label>
          )}
          {pv && alreadyAt(rows, sel, target) > 0 && null}
          <div className="flex items-center gap-3">
            <button className="neon-btn !w-auto" disabled={busy || !ready} onClick={() => run(ids, target, consent)}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : null}
              {busy ? prog : `Set to ${LABEL[target]}`}
            </button>
            {pv && <span className="text-sm"><Cost cost={pv.cost} /></span>}
            <span className="text-[10px] text-white/40">A refused or stopped item is not charged.</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-mcz-ember">{error}</p>}
      {outcome && (
        <div className="rounded-lg border border-white/10 p-3 text-sm space-y-1" role="status">
          <p className="text-white/85">{resultLine(outcome)}.{outcome.charged > 0 && <> Charged <span className="text-mcz-ember">−{outcome.charged} {ENERGY}</span>.</>}</p>
          {outcome.stopped && <p className="text-mcz-ember">{outcome.stopped}</p>}
          {outcome.results.filter((r) => r.result === "skipped" || r.result === "not_attempted").slice(0, 5)
            .map((r) => <p key={r.id} className="text-[11px] text-white/50">{r.title || `#${r.id}`}: {r.reason}</p>)}
        </div>
      )}
    </div>
    </div>
  );
}
