// LogZ — what Music ConnectZ did.
//
// A balance says where you are. It cannot say how you got there, and until the
// ledger existed nothing else could either: SpinaZ and Energy were written
// straight to the wallet and the reason was discarded. "Did my referral pay?"
// had no answer short of watching a number and remembering its old value.
//
// Every row here is a real movement with its reason and its timestamp. The
// emoji and the signed amount come pre-rendered from the server so this screen
// cannot disagree with the ledger about what moved.
import { useEffect, useState } from "react";
import { Loader2, ScrollText, RefreshCw, ArrowUpRight } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { useOpenView } from "../openTo.js";

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function LogZ() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = (resource) => {
    setBusy(true);
    api(`/api/economy/logz/${resource ? `?resource=${resource}` : ""}`)
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load LogZ."))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(filter); }, [filter]);

  // The header's ⚡ and 🍥 pills land here already narrowed to the resource
  // they name. Opening the whole ledger and leaving the member to find the
  // filter is the tab-switch-and-good-luck this app has a rule against.
  useOpenView("logz", (view) => {
    const want = typeof view === "string" ? view : view?.resource;
    if (typeof want === "string") setFilter(want);
  });

  if (!data && !err) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading LogZ…</p>;
  }

  const entries = asList(data?.entries);
  const totals = asList(data?.totals).filter((t) => t.amount);
  const resources = asList(data?.resources);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="logz.png" alt="LogZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">LogZ</h2>
          <p className="text-xs text-white/45">What Music ConnectZ did — every move, and when.</p>
        </div>
        <button onClick={() => load(filter)} title="Refresh"
          className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white">
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
        </button>
      </header>

      {err && (
        <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>
      )}

      {/* Net movement per resource, across the whole ledger — not this page. */}
      {totals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {totals.map((t) => (
            <span key={t.resource} className="pill">
              {t.emoji}{" "}
              <span className={t.amount > 0 ? "font-bold text-emerald-300" : "font-bold text-mcz-ember"}>
                {t.amount > 0 ? "+" : ""}
                {t.resource === "money" ? (t.amount / 100).toFixed(2) : t.amount.toLocaleString()}
              </span>{" "}
              <span className="text-white/40">net</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("")}
          className={`pill text-[11px] ${!filter ? "!border-mcz-cyan/70 !text-white" : ""}`}>Everything</button>
        {resources.map((r) => (
          <button key={r.key} onClick={() => setFilter(r.key)}
            className={`pill text-[11px] ${filter === r.key ? "!border-mcz-cyan/70 !text-white" : ""}`}>
            {r.emoji} {r.label}
          </button>
        ))}
      </div>

      <div className="neon-frame divide-y divide-white/[0.06]">
        {entries.length === 0 && (
          <p className="flex items-center gap-2 p-4 text-sm text-white/45">
            <ScrollText size={15} />
            {filter ? "Nothing moved here yet." : "Nothing logged yet — earn or spend something and it shows up here."}
          </p>
        )}
        {entries.map((e) => <Row key={e.id} e={e} />)}
      </div>

      {data?.count > entries.length && (
        <p className="text-[11px] text-white/35">
          Showing the {entries.length} most recent of {data.count}.
        </p>
      )}

      {/* What this tier can see, and what it can't.
          LogZ used to answer a Free member with a 403 — "where did my SpinaZ
          go" met with an upsell. Everybody sees their ledger now and the tier
          buys how far back it goes, which is a "how much" and allowed. The
          rows outside the window are NAMED rather than silently absent: an
          empty screen reads as "nothing happened", which is a different and
          worse claim than "there is more, further back". */}
      {data?.history_label && (
        <p className="text-[11px] text-white/35">
          You're seeing {data.history_label}
          {data.hidden_by_tier > 0 && (
            <>
              {" — "}
              <button className="re-link" onClick={() => goToSpot("membershipz", "")}>
                {data.hidden_by_tier} older {data.hidden_by_tier === 1 ? "row is" : "rows are"} outside your window
              </button>
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}

/** One movement. Clickable when the writer recorded where it came from.
 *
 * Nothing is a dead end: a balance leads back to the action that changed it.
 * A row with no `open_in` stays a plain row rather than guessing a
 * destination from its note — a link to the wrong app is worse than no link. */
function Row({ e }) {
  const [tab, anchor] = String(e.open_in || "").split(":");
  const body = (
    <>
      <span className={`w-24 shrink-0 text-right font-bold tabular-nums ${
        e.amount > 0 ? "text-emerald-300" : "text-mcz-ember"}`}>
        {e.display}
      </span>
      <span className="flex-1 text-[12px] leading-relaxed text-white/70">{e.note || e.kind}</span>
      <span className="shrink-0 text-[11px] text-white/35" title={new Date(e.at).toLocaleString()}>
        {when(e.at)}
      </span>
    </>
  );
  if (!tab) {
    return <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>;
  }
  return (
    <button
      onClick={() => goToSpot(tab, anchor || "")}
      title={`Open where this came from — ${tab}`}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/[0.05]"
    >
      {body}
      <ArrowUpRight size={13} className="shrink-0 text-white/30" />
    </button>
  );
}
