// IconZ — the icon folder as a tree, and the audit of it.
//
// A PARENT is a file with no dot in its name (`battlez.png`); its CHILDREN are
// the files that name it first (`battlez.cypher.png`, `battlez.freestyle.png`).
// The tree is built from filenames by tools/build-icon-manifest.mjs, so a new
// child appears the day its file is committed — nothing here lists an icon by
// hand. SkillZ and DirectZ follow the alphabetical parents as their own
// parents; they have root art but no `skillz.<child>` / `directz.<child>` files
// yet, and say so rather than inventing children.
//
// Every row says one of five things about its file, because "does the art
// exist" and "does anything draw it" are different questions and a missing
// file falls back to the logo silently everywhere else in the app:
//
//   live      committed AND the default for its registry key
//   owed      has a place, but the file is only on Corey's machine
//   fallback  committed, and still what something draws today
//   unplaced  no tab, app or registry key uses it
//   duplicate the same icon under a second name
//
// Nothing is fetched. The manifest is a build-time fact about the repo, which
// is the point: it is what shipped, not what a server says.
import { useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { ICON_TREE, TAB_ICONS_WITHOUT_ART } from "../iconManifest.js";
import { goToTab } from "../goto.js";

const STATUS = {
  live: { label: "live", tone: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/30" },
  owed: { label: "not in git", tone: "text-amber-300 bg-amber-500/10 ring-amber-400/30" },
  fallback: { label: "backup art", tone: "text-mcz-cyan bg-mcz-cyan/10 ring-mcz-cyan/30" },
  unplaced: { label: "no place", tone: "text-white/55 bg-white/5 ring-white/15" },
  duplicate: { label: "duplicate", tone: "text-mcz-ember bg-mcz-ember/10 ring-mcz-ember/30" },
};

// A parent that IS a tab opens that tab. Only names verified against TABS in
// App.jsx: a button that does nothing is the dead end this exists to avoid.
const TAB_FOR = {
  battlez: "battlez", bodiez: "bodiez", bugz: "bugz", callz: "callz", collabz: "collabz",
  dawz: "dawz", directz: "directz", drumz: "drumz", gamez: "gamez", groupz: "groupz",
  labelz: "labelz", lilith: "lilith", logz: "logz", messagez: "messagez",
  opportunitiez: "opportunitiez", profilez: "profilez", rapz: "rapz", singz: "singz",
  socializez: "social", statsz: "statsz", toolz: "toolz",
};

const FILTERS = [["all", "All"], ["live", "Live"], ["owed", "Not in git"], ["unplaced", "No place"], ["duplicate", "Duplicates"]];

function Badge({ status }) {
  const s = STATUS[status] || STATUS.unplaced;
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] ring-1 ${s.tone}`}>{s.label}</span>;
}

/** The art, or an honest empty box — never an <img> for a file that is not committed. */
function Art({ art, size = "h-12 w-12", name }) {
  return art
    ? <img src={art} alt={name} className={`${size} flex-shrink-0 rounded-md object-cover`} loading="lazy" />
    : (
      <div className={`${size} flex flex-shrink-0 items-center justify-center rounded-md border border-dashed border-white/20 text-[9px] text-white/35`}
        title="This file is on your machine but not in the repo yet">
        no file
      </div>
    );
}

// Every status a parent holds, worst first — a parent with one owed child is
// not "live" just because its root art is.
const worst = (p) => {
  const all = [p.root?.status, ...p.children.map((c) => c.status)].filter(Boolean);
  return ["owed", "duplicate", "unplaced", "fallback", "live"].find((s) => all.includes(s)) || "unplaced";
};

function Row({ name, file, art, status, keyName, note, also = [] }) {
  return (
    <li className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <Art art={art} name={name} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/90">
          {name} <Badge status={status} />
        </p>
        <p className="truncate font-mono text-[11px] text-white/50">{file}</p>
        {keyName && <p className="text-[11px] text-white/40">registry key <span className="font-mono">{keyName}</span></p>}
        {note && <p className="mt-0.5 text-[11px] leading-snug text-white/45">{note}</p>}
        {also.map((a) => (
          <p key={a.file} className="mt-0.5 text-[11px] text-white/35">
            also <span className="font-mono">{a.file}</span> · <Badge status={a.status} />
          </p>
        ))}
      </div>
    </li>
  );
}

function ParentPanel({ p, onClose }) {
  const tab = TAB_FOR[p.parent];
  const noKids = p.children.length === 0;
  return (
    <div className="rounded-xl border border-white/15 bg-mcz-ink/60 p-4" data-tour={`iconz-${p.parent}`}>
      <div className="flex items-start gap-3">
        <Art art={p.root?.art} size="h-16 w-16" name={p.label} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">{p.label}</h3>
          <p className="text-[11px] text-white/45">
            {p.root ? <>parent <span className="font-mono">{p.root.file}</span></> : "no parent icon of its own — only children name it"}
            {" · "}{p.children.length} {p.children.length === 1 ? "child" : "children"}
          </p>
          {p.root && <div className="mt-1"><Badge status={p.root.status} /></div>}
          {p.root?.note && <p className="mt-1 text-[11px] text-white/45">{p.root.note}</p>}
        </div>
        {tab && (
          <button type="button" onClick={() => goToTab(tab)}
            className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10">
            Open {p.label} <ArrowRight size={12} />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-white/50 hover:bg-white/10">
          <X size={14} />
        </button>
      </div>

      {noKids ? (
        <p className="mt-3 text-[12px] text-white/50">
          No <span className="font-mono">{p.parent}.&lt;child&gt;</span> files in the folder yet. Name a file that way,
          commit it, and rebuild the manifest — it appears here as a child.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {p.children.map((c) => (
            <Row key={c.child} name={c.label} file={c.file} art={c.art} status={c.status} keyName={c.key} note={c.note} also={c.also} />
          ))}
        </ul>
      )}

      {p.extra.length > 0 && (
        <p className="mt-3 text-[11px] text-white/40">
          Other root files under this name: {p.extra.map((x) => x.file).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function IconZ() {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");

  const totals = useMemo(() => {
    const t = { parents: ICON_TREE.length, children: 0, live: 0, owed: 0, unplaced: 0, duplicate: 0, fallback: 0 };
    for (const p of ICON_TREE) {
      const rows = [...(p.root ? [p.root] : []), ...p.children];
      t.children += p.children.length;
      for (const r of rows) t[r.status] = (t[r.status] || 0) + 1;
    }
    return t;
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ICON_TREE.filter((p) => {
      if (needle && !`${p.parent} ${p.label} ${p.children.map((c) => c.file).join(" ")}`.toLowerCase().includes(needle)) return false;
      if (filter === "all") return true;
      return [p.root?.status, ...p.children.map((c) => c.status)].includes(filter);
    });
  }, [filter, q]);

  const active = open && ICON_TREE.find((p) => p.parent === open);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header>
        <h2 className="text-lg font-semibold text-white">IconZ</h2>
        <p className="text-[12px] text-white/50">
          {totals.parents} parents · {totals.children} children · read from filenames — <span className="font-mono">parent.child.png</span>.
          Your art leads; a generated glyph is only ever the backup.
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          <span className="text-emerald-300">{totals.live} live</span>
          <span className="text-amber-300">{totals.owed} not in git</span>
          <span className="text-mcz-cyan">{totals.fallback} backup</span>
          <span className="text-white/50">{totals.unplaced} no place</span>
          <span className="text-mcz-ember">{totals.duplicate} duplicates</span>
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-[12px] ring-1 ${filter === k ? "bg-white/15 text-white ring-white/30" : "text-white/55 ring-white/10 hover:bg-white/5"}`}>
            {l}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a parent or filename"
          className="ml-auto min-w-[10rem] rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[12px] text-white placeholder:text-white/30" />
      </div>

      {active && <ParentPanel p={active} onClose={() => setOpen(null)} />}

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {shown.map((p, i) => {
          const isTail = p.parent === "skillz" || p.parent === "directz";
          const startsTail = isTail && p.parent === "skillz";
          return (
            <li key={p.parent} className={startsTail ? "col-start-1" : ""}>
              <button type="button" onClick={() => setOpen(open === p.parent ? null : p.parent)}
                aria-expanded={open === p.parent}
                className={`flex w-full flex-col items-center gap-1 rounded-xl border p-2 text-center hover:bg-white/5 ${open === p.parent ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03]"}`}>
                <span className="text-[10px] text-white/30">{isTail ? "+" : i + 1}</span>
                <Art art={p.root?.art} size="h-14 w-14" name={p.label} />
                <span className="w-full truncate text-[12px] font-semibold text-white/90">{isTail ? "+" : ""}{p.label}</span>
                <span className="flex items-center gap-1 text-[10px] text-white/45">
                  {p.children.length} <Badge status={worst(p)} />
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="col-span-full text-[12px] text-white/45">Nothing matches.</li>}
      </ul>

      <section className="rounded-xl border border-white/10 p-3">
        <h3 className="text-[13px] font-semibold text-white/85">Asked for by a tab, supplied by nobody ({TAB_ICONS_WITHOUT_ART.length})</h3>
        <p className="mb-2 text-[11px] text-white/45">
          These tabs and apps name an icon no file in the folder covers, so they draw their generated glyph.
        </p>
        <p className="flex flex-wrap gap-1.5">
          {TAB_ICONS_WITHOUT_ART.map((k) => (
            <span key={k} className="rounded-full px-2 py-0.5 font-mono text-[11px] text-white/60 ring-1 ring-white/10">{k}</span>
          ))}
        </p>
      </section>
    </div>
  );
}
