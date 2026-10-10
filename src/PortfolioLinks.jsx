import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "./api.js";
import { goToSpot } from "./goto.js";
import { useTierLadder } from "./limits.js";
import { widgetHint } from "./widgetz.js";
import { LinkList } from "./WidgetBoard.jsx";
import { labelFor, moveRow, normalizeUrl, parsePasted, pasteSummary, planAdd } from "./portfolio.js";

// Your portfolio: the links that say who you are — tracks, videos, pages, shops.
//
// Links have been rendered on the member card, the public profile and the widget
// board for as long as those exist, and nothing in the mounted app let a member
// MAKE one: the writer was an endpoint, and the only editor lived in `src/mcz2/`,
// which is not mounted. So the whole portfolio side of the platform — widgets
// included — had nothing to show. This is the editor.
//
// It decides nothing. The ceiling (`links_limit`) and the next tier's number come
// from the server; what is KEPT (web and email links, nothing that can run code) is
// the server's too, and it tells the member what it dropped rather than answering
// "saved". Past a ceiling the server REFUSES with its own sentence — it used to cut
// the list at 50 and say nothing — and that sentence is shown unreworded.
//
// The ceiling is stated BEFORE anything is added, in the unit a member can check,
// with what the next tier holds beside it: the cost/gain rule for a limit.
export default function PortfolioLinks() {
  const { tiers } = useTierLadder();
  const [rows, setRows] = useState(null);       // what is on screen
  const [saved, setSaved] = useState([]);       // what the server holds
  const [limit, setLimit] = useState(null);     // what they may hold NOW
  const [tierCap, setTierCap] = useState(null); // their tier's own number
  const [tier, setTier] = useState("free");
  const [policy, setPolicy] = useState(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [pasting, setPasting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const take = (d) => {
    const list = Array.isArray(d?.links) ? d.links.map((l) => ({ label: l.label || "", url: l.url || "" })) : [];
    setRows(list);
    setSaved(list);
    if (d?.links_limit != null) setLimit(d.links_limit);
    if (d?.links_tier_cap != null) setTierCap(d.links_tier_cap);
  };

  useEffect(() => {
    api("/api/economy/profile/").then(take).catch((e) => setErr(e.message));
    api("/api/economy/limits/").then((l) => setTier(l?.tier || "free")).catch(() => {});
    api("/api/economy/widgetz/").then(setPolicy).catch(() => {});
  }, []);

  if (rows === null) {
    return err ? <p role="alert" className="text-xs text-mcz-ember">{err}</p> : null;
  }

  // An older API sends no ceiling. Say nothing about one rather than invent it,
  // and let the server refuse if it has a view.
  const known = limit != null;
  const full = known && rows.length >= limit;
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
  const over = known && tierCap != null && saved.length > tierCap;
  const up = tier === "free" ? "premium" : tier === "premium" ? "statz" : null;
  const upN = up && tiers?.[up]?.profile_links;
  const nudge = known && up && upN && rows.length >= limit * 0.8;

  const how = (u) => {
    if (!policy) return "";
    const h = widgetHint(u, !!policy.page_widgets?.allowed);
    return h.kind === "player" ? "plays here" : h.kind === "internal" ? "opens here" : h.kind === "page" ? "opens here" : "opens in a tab";
  };

  const edit = (i, patch) => { setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r))); setNote(""); };

  function addOne() {
    const u = normalizeUrl(url);
    if (!u) return;
    const plan = planAdd(rows, [{ label: label.trim() || labelFor(u), url: u }], known ? limit : Infinity);
    if (plan.duplicates.length) { setNote("That link is already on your list."); return; }
    if (plan.overLimit.length) { setNote(`Your list holds ${limit}.`); return; }
    setRows(plan.rows);
    setLabel(""); setUrl(""); setNote(""); setErr("");
  }

  function addPasted() {
    const { rows: incoming, invalid } = parsePasted(paste);
    const plan = planAdd(rows, incoming, known ? limit : Infinity);
    setRows(plan.rows);
    setNote(pasteSummary(plan, invalid, limit));
    setErr("");
    if (!plan.overLimit.length && !invalid.length) { setPaste(""); setPasting(false); }
  }

  async function save() {
    setBusy(true); setErr(""); setNote("");
    try {
      const sent = rows.length;
      const d = await api("/api/economy/profile/", { method: "POST", body: { links: rows.map(({ label: l, url: u }) => ({ label: l, url: u })) } });
      take(d);
      const kept = Array.isArray(d?.links) ? d.links.length : sent;
      setNote(kept < sent
        ? `Saved ${kept}. ${sent - kept} weren't kept — only web and email links are, and nothing that could run code.`
        : `Saved ${kept}.`);
    } catch (e) {
      setErr(e.message || "That didn't save.");   // the server's own sentence, ceiling included
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3" data-tour="portfolio-links">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
          <Link2 size={12} className="mr-1 inline" /> Your portfolio — links that say who you are
        </p>
        {known && (
          <span className={`text-[11px] ${full ? "text-mcz-ember" : "text-white/45"}`}>
            {rows.length} / {limit} links
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/45">
        Tracks, videos, your site, your shop. They show on your profile, and visitors can open them right on
        the screen instead of leaving it.
      </p>

      {over && (
        <p className="text-[11px] text-mcz-gold">
          You hold {saved.length}, more than your plan's {tierCap}. You keep every one — you can reorder and remove
          them, and add more once you are under {tierCap}.
        </p>
      )}
      {nudge && (
        <p className="text-[11px] text-mcz-cyan">
          {up === "premium" ? "Premium" : "StatZ"} holds {upN}{" "}
          <button className="font-semibold underline" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Upgrade</button>
        </p>
      )}

      {rows.length === 0 && <p className="text-xs text-white/55">Nothing here yet. Add the first one below.</p>}
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <input className="neon-input !py-1.5 min-w-0 flex-1 basis-32 text-sm" aria-label={`Link ${i + 1} label`}
                   maxLength={80} value={r.label} onChange={(e) => edit(i, { label: e.target.value })} />
            <input className="neon-input !py-1.5 min-w-0 flex-[2] basis-48 text-sm" aria-label={`Link ${i + 1} address`}
                   maxLength={500} value={r.url} onChange={(e) => edit(i, { url: e.target.value })} />
            {how(r.url) && <span className="text-[10px] text-white/40">{how(r.url)}</span>}
            <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-20" aria-label={`Move link ${i + 1} up`}
                    disabled={i === 0} onClick={() => setRows(moveRow(rows, i, -1))}><ArrowUp size={14} /></button>
            <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white disabled:opacity-20" aria-label={`Move link ${i + 1} down`}
                    disabled={i === rows.length - 1} onClick={() => setRows(moveRow(rows, i, 1))}><ArrowDown size={14} /></button>
            <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-mcz-ember" aria-label={`Remove link ${i + 1}`}
                    onClick={() => setRows(rows.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <input className="neon-input !py-1.5 min-w-0 flex-1 basis-28 text-sm" aria-label="New link label" placeholder="Label (optional)"
               maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="neon-input !py-1.5 min-w-0 flex-[2] basis-48 text-sm" aria-label="New link address" placeholder="https://…"
               maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOne(); } }} />
        <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" disabled={!url.trim() || full} onClick={addOne}>
          <Plus size={13} /> Add
        </button>
      </div>
      {full && <p className="text-[11px] text-mcz-ember">Your list is full — remove one to add another.</p>}

      <div>
        <button className="text-[11px] text-mcz-cyan hover:underline" onClick={() => setPasting(!pasting)}>
          {pasting ? "Hide" : "Paste several at once"}
        </button>
        {pasting && (
          <div className="mt-2 space-y-2">
            <textarea className="neon-input min-h-24 w-full text-sm" aria-label="Paste links, one per line"
                      placeholder={"One per line. A bare link, or  Label | link"} value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" disabled={!paste.trim()} onClick={addPasted}>Add these</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40" disabled={!dirty || busy} onClick={save}>
          {busy ? <Loader2 className="animate-spin" size={13} /> : "Save links"}
        </button>
        {dirty && !busy && <span className="text-[11px] text-white/45">Not saved yet.</span>}
      </div>
      {note && <p role="status" className="text-[11px] text-white/65">{note}</p>}
      {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}

      {saved.length > 0 && !dirty && (
        <details className="text-xs">
          <summary className="cursor-pointer text-white/55">How visitors open these</summary>
          <div className="mt-2"><LinkList links={saved} owner="" /></div>
        </details>
      )}
    </div>
  );
}
