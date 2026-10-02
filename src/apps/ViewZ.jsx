import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { goToTab } from "../goto.js";
import { IconImg } from "../App.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";

// ViewZ — who spent time on your posts and profile, laid out like a DAW:
// each viewer is a track, each visit a clip on the clock. Everything here is
// /api/economy/views/timeline/; the screen only draws it.

const KIND = {
  post: { color: "bg-mcz-cyan/70 border-mcz-cyan", label: "Post" },
  profile: { color: "bg-mcz-pink/70 border-mcz-pink", label: "Profile" },
  tab: { color: "bg-mcz-gold/70 border-mcz-gold", label: "App page" },
};
const RANGES = [["1h", "1 hour"], ["24h", "24 hours"], ["7d", "7 days"]];
const LANE_H = 38;

function dur(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function ticks(from, to, range) {
  const step = range === "1h" ? 10 * 60e3 : range === "24h" ? 3 * 3600e3 : 24 * 3600e3;
  const out = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) out.push(t);
  return out;
}

function tickLabel(t, range) {
  const d = new Date(t);
  return range === "7d" ? d.toLocaleDateString([], { weekday: "short", day: "numeric" })
    : d.toLocaleTimeString([], { hour: "numeric", minute: range === "1h" ? "2-digit" : undefined });
}

export default function ViewZ() {
  const navigate = useNavigate();
  const { s: trial } = useStatzTrial();
  const [range, setRange] = useState("24h");
  const [scope, setScope] = useState("mine");
  const [d, setD] = useState(null);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);
  // Open at the playhead, like a DAW following "now" — recent visits are
  // the right-hand end, which a phone would otherwise have scrolled away.
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, [d]);

  useEffect(() => {
    setBusy(true); setErr("");
    api(`/api/economy/views/timeline/?range=${range}&scope=${scope}`)
      .then((x) => { setD(x); setLocked(false); })
      .catch((e) => { if (e.status === 403 || /StatZ/.test(e.message)) setLocked(true); else setErr(e.message); })
      .finally(() => setBusy(false));
  }, [range, scope, trial?.active]);

  const span = useMemo(() => d ? [Date.parse(d.from), Date.parse(d.to)] : [0, 1], [d]);
  const pct = (t) => ((t - span[0]) / (span[1] - span[0])) * 100;

  function openClip(c) {
    const [kind, key] = c.target.split(":");
    if (kind === "post") navigate(`/p/${key}`);
    else if (kind === "profile") window.dispatchEvent(new CustomEvent("mcz-goto-profile", { detail: key }));
    else goToTab(key);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="viewz.png" alt="ViewZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">ViewZ</h2>
          <p className="text-sm text-white/60">Who spent time on your posts and profile — every viewer a track, every visit a clip.</p>
        </div>
      </header>

      {locked ? (
        <div className="neon-frame space-y-2 p-4">
          <StatzSample what="The ViewZ timeline" />
          <p className="text-xs text-white/45">Everyone can see the total views under each post and profile.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map(([k, l]) => (
              <button key={k} onClick={() => setRange(k)}
                className={`rounded-full border px-3 py-1 text-sm ${range === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{l}</button>
            ))}
            {d?.can_scope_all && (
              <button onClick={() => setScope(scope === "all" ? "mine" : "all")}
                className={`ml-auto rounded-full border px-3 py-1 text-sm ${scope === "all" ? "border-mcz-gold bg-mcz-gold/15" : "border-white/15 text-white/60"}`}>
                {scope === "all" ? "Everything (owner)" : "Mine"}
              </button>
            )}
            {busy && <Loader2 className="animate-spin text-white/40" size={16} />}
          </div>

          {d && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="pill"><Eye size={13} className="mr-1 inline" />{d.total_views} views</span>
              <span className="pill">{dur(d.total_seconds)} watched</span>
              <span className="pill">{d.lanes.length} {d.lanes.length === 1 ? "viewer" : "viewers"}</span>
            </div>
          )}

          {d && (d.lanes.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Nobody's viewed your posts or profile in this window yet. Share a post from{" "}
              <button className="re-link" onClick={() => goToTab("postz")}>PostZ</button> to fill the tracks.
            </p>
          ) : (
            <div className="neon-frame overflow-hidden p-0">
              <div className="flex">
                <div className="w-28 shrink-0 border-r border-white/10 bg-black/30 sm:w-36">
                  <div className="h-7 border-b border-white/10" />
                  {d.lanes.map((l) => (
                    <button key={l.viewer} disabled={!l.member}
                      onClick={() => window.dispatchEvent(new CustomEvent("mcz-goto-profile", { detail: l.viewer }))}
                      className="flex w-full flex-col justify-center border-b border-white/5 px-2 text-left hover:bg-white/5 disabled:hover:bg-transparent"
                      style={{ height: LANE_H }}>
                      <span className="truncate text-xs font-semibold">{l.member ? `@${l.viewer}` : "Visitors"}</span>
                      <span className="text-[10px] text-white/45">{dur(l.seconds)}</span>
                    </button>
                  ))}
                </div>
                <div ref={scroller} className="relative min-w-0 flex-1 overflow-x-auto">
                  <div className="relative" style={{ minWidth: range === "7d" ? 700 : 520 }}>
                    <div className="relative h-7 border-b border-white/10 bg-black/30">
                      {ticks(span[0], span[1], range).map((t) => (
                        <span key={t} className="absolute top-1 -translate-x-1/2 text-[10px] text-white/45" style={{ left: `${pct(t)}%` }}>
                          {tickLabel(t, range)}
                        </span>
                      ))}
                    </div>
                    {d.lanes.map((l, i) => (
                      <div key={l.viewer} className={`relative border-b border-white/5 ${i % 2 ? "bg-white/[0.02]" : ""}`} style={{ height: LANE_H }}>
                        {ticks(span[0], span[1], range).map((t) => (
                          <span key={t} className="absolute inset-y-0 w-px bg-white/5" style={{ left: `${pct(t)}%` }} />
                        ))}
                        {l.clips.map((c, j) => {
                          const kind = KIND[c.target.split(":")[0]] || KIND.tab;
                          const left = pct(Date.parse(c.start));
                          const width = Math.max(0.6, pct(Date.parse(c.end)) - left);
                          return (
                            <button key={j} onClick={() => openClip(c)}
                              title={`${kind.label}: ${c.label} — ${dur(c.seconds)} at ${new Date(c.start).toLocaleString()}`}
                              className={`absolute top-1.5 overflow-hidden truncate rounded border px-1 text-left text-[10px] font-semibold text-black ${kind.color}`}
                              style={{ left: `${left}%`, width: `${width}%`, height: LANE_H - 12 }}>
                              {width > 6 ? c.label : ""}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                    <span className="pointer-events-none absolute inset-y-0 right-0 w-0.5 bg-mcz-ember shadow-[0_0_8px_#ff5500]" title="now" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-3 text-[11px] text-white/50">
            {Object.entries(KIND).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1"><span className={`inline-block h-2.5 w-4 rounded border ${v.color}`} /> {v.label}</span>
            ))}
          </div>
          {d?.notice && <p className="text-[11px] text-white/40">{d.notice}</p>}
        </>
      )}
      {err && <p className="text-sm text-mcz-ember">{err}</p>}
    </div>
  );
}
