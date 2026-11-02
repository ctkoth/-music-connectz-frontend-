// GenreZ — find talent by the sound they make.
//
// Hip hop, metal and country are scenes, and a scene is how people look for each other. This is the
// member search (`GET /api/economy/members/`, the one CollabZ, BattleZ and VybeZ use) with ONE filter
// in front: `genres=`. The server decides who matches — a member passes if they DECLARED any chosen
// genre on their profile or on a skill ("singing · country"). Nothing is inferred from their takes.
//
// An empty grid has two causes (nobody matches, nobody has said), so the empty line says both
// rather than concluding there is nobody here. Every card opens the profile through MemberName,
// which also hands off to a message — a grid you cannot act on is a contact sheet.
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import MemberName from "../MemberName.jsx";
import { GENRE_GROUPS, genreLabel } from "../genres.js";
import { goToTab } from "../goto.js";

function Chip({ on, children, ...rest }) {
  return (
    <button type="button" aria-pressed={on} {...rest}
      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
        on ? "border-mcz-pink/70 bg-mcz-pink/10 text-white shadow-neon"
           : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
      {children}
    </button>
  );
}

export default function GenreZ() {
  const [picked, setPicked] = useState([]);
  // "Who has a U87?" — matches the gear and inventory members declared, by name fragment.
  const [gear, setGear] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (g) => setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  const query = useMemo(
    () => `${picked.length ? `genres=${encodeURIComponent(picked.join(","))}` : ""}${gear.trim() ? `&gear=${encodeURIComponent(gear.trim())}` : ""}`,
    [picked, gear]);

  // One delay for every change, like VybeZ: the member search is the heaviest read here.
  useEffect(() => {
    if (!picked.length && !gear.trim()) { setRows([]); setError(""); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      setLoading(true);
      api(`/api/economy/members/?${query}`)
        .then((d) => { if (live) { setRows(d.members || []); setError(""); } })
        .catch((e) => { if (live) setError(e?.message || "The search failed."); })
        .finally(() => { if (live) setLoading(false); });
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [query, picked.length, gear]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">GenreZ <span className="text-white/50">(of music)</span></h2>
        <p className="text-[12px] text-white/50">
          Pick the scenes you want. You see members who declared any of them on their profile or on a skill.
          Free to search.
        </p>
      </div>

      {GENRE_GROUPS.map((grp) => (
        <div key={grp.key} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{grp.emoji} {grp.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {grp.genres.map(([name]) => (
              <Chip key={name} on={picked.includes(name)} onClick={() => toggle(name)}>{genreLabel(name)}</Chip>
            ))}
          </div>
        </div>
      ))}

      <label className="block text-xs text-white/50">Has this gear <span className="text-white/30">(optional — a mic, a synth, a console…)</span>
        <input value={gear} onChange={(e) => setGear(e.target.value)} placeholder="U87, SSL, Moog…" maxLength={60}
               className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30" />
      </label>

      {!picked.length && !gear.trim() && <p className="text-[12px] text-white/40">Choose a genre to see who plays it.</p>}
      {loading && <Loader2 className="animate-spin text-white/50" size={16} />}
      {error && <p className="text-[12px] text-mcz-ember">{error}</p>}
      {(picked.length > 0 || gear.trim()) && !loading && !error && !rows.length && (
        <p className="text-[12px] text-white/50">
          Nobody matches yet — or nobody has said. Genres are what members declare, and this is new.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((m) => (
          <div key={m.username} className="re-card space-y-1.5">
            <MemberName username={m.username} />
            {!!(m.genres || []).length && (
              <p className="text-[11px] text-white/50">{m.genres.slice(0, 6).map(genreLabel).join(" · ")}</p>
            )}
            <button type="button" onClick={() => goToTab("collabz")}
              className="text-[11px] text-mcz-cyan hover:underline">Start a collab →</button>
          </div>
        ))}
      </div>
    </div>
  );
}
