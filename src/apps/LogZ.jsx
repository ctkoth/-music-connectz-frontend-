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
import { ChevronDown, Loader2, ScrollText, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { goToSpot } from "../goto.js";
import { handOff } from "../handoff.js";
import { shellHas } from "../standalone.js";
import { RatingGrid, RatingNumber, RatingRow } from "../components/Rating.jsx";

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// A rating is a number AND the reason for it, side by side. Large beside the
// title so it is the first thing the eye lands on; each dimension's own number
// carries what the coach heard behind it, so none of them stands alone.
function Outcome({ o }) {
  if (!o) return null;
  const r = o.rating, rep = o.report || {};
  return (
    <div className="space-y-3 px-4 pb-3 pl-[7.5rem] text-[12px]">
      {r && (
        <div className="space-y-2">
          <RatingRow size="xl" outOf value={r.score} exact={r.exact} label="Overall"
                     detail={rep.verdict || "The rating this spend bought."} className="sm:max-w-md" />
          <RatingGrid rows={[
            ...(r.dimensions || []).map((d) => ({
              key: d.key, label: d.label, value: d.value,
              detail: d.detail ? `${d.at ? `${d.at} · ` : ""}${d.detail}` : "No moment was filed under this one." })),
            ...(r.hook != null ? [{ key: "hook", label: "HookZ 🪝", value: r.hook, detail: "The chorus, counted in the overall." }] : []),
            ...(r.feelz != null ? [{ key: "feelz", label: "FeelZ 💗", value: r.feelz, detail: "How it moves a listener, counted in the overall." }] : []),
          ]} />
        </div>
      )}
      {rep.strengths?.length > 0 && <p className="text-white/60"><b className="text-emerald-300">Worked:</b> {rep.strengths.join(" · ")}</p>}
      {rep.fixes?.length > 0 && <p className="text-white/60"><b className="text-mcz-ember">Fix:</b> {rep.fixes.join(" · ")}</p>}
      {rep.practice?.length > 0 && (
        <p className="text-white/60"><b className="text-mcz-cyan">Practise:</b> {rep.practice.map((p) => p.what).join(" · ")}</p>
      )}
      {rep.items?.length > 0 && rep.items.map((i, n) => <p key={n} className="text-white/70">· {i.line}</p>)}
      <p className="text-white/50">
        <b className="text-white/70">File:</b>{" "}
        {o.file?.kept
          ? (o.file.url ? <a className="text-mcz-cyan underline" href={o.file.url} target="_blank" rel="noreferrer">{o.file.name}</a> : (o.file.why || o.file.name))
          : (o.file?.why || "Not kept.")}
      </p>
      <p className="flex flex-wrap gap-3">
        {o.share_url && <a className="text-mcz-cyan underline" href={o.share_url} target="_blank" rel="noreferrer">Shared card</a>}
        {o.open_in?.tab && shellHas(o.open_in.tab) && (
          <button className="text-mcz-cyan underline" onClick={() => goToSpot(o.open_in.tab, o.open_in.target)}>Open it</button>
        )}
      </p>
    </div>
  );
}

// A row, and the doors out of it.
//
// LogZ is the app that makes every other balance leadable-back-to, and it was
// the most read-only surface in the app: you could read "+300 🍥 referral
// (referrer)" and do nothing with it. The doors are the server's
// (`crosspost.log_destinations`) so this screen and a post's destinations are
// the same list rendered the same way, and neither can grow a door the other
// does not know about.
function Row({ e, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const doors = asList(e.destinations);

  const take = async (d) => {
    // "Open it where it came from" is a jump, not a call. Only offered when
    // the writer recorded an origin — a guessed one lands on the wrong screen.
    if (d.action === "open") return goToSpot(d.app, d.target || "");
    setBusy(true);
    try {
      if (d.app === "messagez") {
        const who = window.prompt("Send this line to which member? (@handle)");
        if (!who) { setBusy(false); return; }
        const r = await api("/api/economy/logz/export/", {
          method: "POST",
          body: { ids: [e.id], to: "messagez", to_username: who.replace(/^@/, "") },
        });
        onDone(r.detail || "Sent.");
      } else if (d.app === "journalz") {
        const r = await api("/api/economy/logz/export/", {
          method: "POST", body: { ids: [e.id], to: "journalz" },
        });
        onDone(r.detail || "Kept in today's entry.");
      } else {
        // PostZ is SEEDED, never created here — a post has a price, and
        // spending it from a screen that never showed the cost is the one
        // thing the paradigm forbids. The composer opens with the line in it.
        const r = await api("/api/economy/logz/export/", {
          method: "POST", body: { ids: [e.id], to: "postz" },
        });
        // handOff parks the line and jumps in one call — the composer picks
        // it up on mount, so the jump does not arrive empty-handed.
        handOff("postz", d.target || "post-compose", { text: r.text });
      }
    } catch (err) {
      // The real error. A door that quietly does nothing is worse than one
      // that says why it couldn't.
      onDone(err.message || "That didn't work.");
    }
    setBusy(false);
  };

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.02]"
        title="What you can do with this"
      >
        <span className={`w-24 shrink-0 text-right font-bold tabular-nums ${
          e.amount > 0 ? "text-emerald-300" : "text-mcz-ember"}`}>
          {e.display}
        </span>
        {e.outcome?.rating && (
          <span className="shrink-0" title="The rating this spend bought">
            <RatingNumber size="lg" value={e.outcome.rating.score} exact={e.outcome.rating.exact} />
          </span>
        )}
        <span className="flex-1 text-[12px] leading-relaxed text-white/70">{e.note || e.kind}</span>
        <span className="shrink-0 text-[11px] text-white/35" title={new Date(e.at).toLocaleString()}>
          {when(e.at)}
        </span>
        <ChevronDown size={13} className={`shrink-0 text-white/25 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <Outcome o={e.outcome} />}

      {open && doors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pl-[7.5rem]">
          {doors.map((d) => (
            <button
              key={d.app + d.action}
              onClick={() => take(d)}
              disabled={busy}
              title={d.what}
              className="pill text-[11px] hover:!text-mcz-cyan disabled:opacity-50"
            >
              {busy ? <Loader2 size={11} className="mr-1 inline animate-spin" /> : null}
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LogZ() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = (resource) => {
    setBusy(true);
    api(`/api/economy/logz/${resource ? `?resource=${resource}` : ""}`)
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load LogZ."))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(filter); }, [filter]);

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

      {msg && <p className="text-[12px] text-mcz-cyan">{msg}</p>}

      <div className="neon-frame divide-y divide-white/[0.06]">
        {entries.length === 0 && (
          <p className="flex items-center gap-2 p-4 text-sm text-white/45">
            <ScrollText size={15} />
            {filter ? "Nothing moved here yet." : "Nothing logged yet — earn or spend something and it shows up here."}
          </p>
        )}
        {entries.map((e) => (
          <Row key={e.id} e={e} onDone={setMsg} />
        ))}
      </div>

      {data?.count > entries.length && (
        <p className="text-[11px] text-white/35">
          Showing the {entries.length} most recent of {data.count}.
        </p>
      )}
    </div>
  );
}
