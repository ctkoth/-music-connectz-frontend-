// What your diary actually contains — and not one number that scores it.
//
// Every count here is a thing that happened: days kept, entries, moods used,
// tags, the people you wrote about, the places. There is no "depth", no
// word-count badge, no writing grade. A score on somebody's diary would be the
// exact failure `directz_ai_rating` is remembered for, with the added problem
// that a diary is the one place in this app nobody is performing.
//
// And every row is a door, because a list of facts with nowhere to go is the
// read-only surface this codebase treats as unfinished: a person opens their
// profile, a tag opens that search, a mood filters the entries.
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { openMember } from "../member.js";

function Row({ label, count, onClick, title }) {
  const body = (
    <>
      <span className="flex-1 truncate">{label}</span>
      <span className="shrink-0 tabular-nums text-white/40">{count}</span>
    </>
  );
  if (!onClick) {
    return <div className="flex items-center gap-2 px-2 py-1 text-[12px] text-white/60">{body}</div>;
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-white/70 transition hover:bg-white/[0.05] hover:text-white"
    >
      {body}
    </button>
  );
}

export default function JournalInsights({ onFilter }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let on = true;
    api("/api/economy/journalz/insights/").then((d) => on && setData(d)).catch(() => {});
    return () => { on = false; };
  }, []);

  if (!data) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-white/40">
        <Loader2 className="animate-spin" size={13} /> Counting…
      </p>
    );
  }

  const cols = [
    ["Moods", asList(data.moods).map((m) => ({
      label: m.label, count: m.count,
      onClick: () => onFilter?.(m.filter), title: `Only ${m.label} days`,
    }))],
    ["Tags", asList(data.tags).map((t) => ({
      label: `#${t.tag}`, count: t.count,
      onClick: () => onFilter?.(t.filter), title: `Entries tagged #${t.tag}`,
    }))],
    ["People", asList(data.people).map((p) => ({
      label: `@${p.username}`, count: p.count,
      onClick: () => openMember(p.username), title: `Open @${p.username}`,
    }))],
    ["Places", asList(data.places).map((p) => ({ label: p.place, count: p.count }))],
  ];

  return (
    <div className="re-card space-y-4">
      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="pill !text-mcz-gold">🔥 {data.streak} now</span>
        <span className="pill">🏅 {data.longest_streak} best run</span>
        <span className="pill">{data.days_kept} days kept</span>
        <span className="pill">{data.entries} entries</span>
        <span className="pill">🔒 {data.private} private</span>
        {data.shared > 0 && <span className="pill">{data.shared} shared</span>}
        {data.with_attachments > 0 && <span className="pill">{data.with_attachments} with media</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cols.map(([title, rows]) => (
          <div key={title}>
            <p className="re-label mb-1">{title}</p>
            {rows.length === 0
              ? <p className="px-2 text-[11px] text-white/25">Nothing yet.</p>
              : rows.map((r, i) => <Row key={i} {...r} />)}
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-white/30">{data.note}</p>
    </div>
  );
}
