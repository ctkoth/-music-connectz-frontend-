// VybeZ — find a person, filtered by what they've said about themselves.
//
// The member search this runs on (`GET /api/economy/members/`) has existed
// for a long time and **had no caller anywhere in this app.** Regions,
// genders, both zodiacs, sober, substances, five range gates and distance,
// all implemented, all reachable only by typing a URL. That is the same shape
// as the five trial coaches nothing linked to: built, working, invisible.
//
// So VybeZ is a screen before it is a feature. It gives that endpoint its
// surface, and PersonalitieZ is the filter it was missing.
//
// Cross-pollination: no card here is a dead end. Every one opens a profile,
// a message, or a collab — a grid of people you cannot do anything with is a
// contact sheet, not a connection app.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import { PersonalityFilter, personalityQuery } from "../PersonalitieZ.jsx";
import { ReligionFilter, religionQuery, useReligions } from "../ReligionZ.jsx";
import { LanguageFilter, languageQuery, useLanguages } from "../LanguageZ.jsx";
import { goToSpot } from "../goto.js";

// Age is the one range worth having on the front of this screen; the rest of
// the gates live behind "More filters" because a wall of sliders is how a
// search stops being used. Nothing here is a tier number or a limit — these
// are the searcher's own choices.
const AGE_FLOOR = 13;
const AGE_CEIL = 99;

function Chip({ on, children, ...rest }) {
  return (
    <button type="button" {...rest}
      className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
        on ? "border-mcz-pink/70 bg-mcz-pink/10 text-white shadow-neon"
           : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
      {children}
    </button>
  );
}

function MemberCard({ m, religionLabel, languageLabel }) {
  return (
    <div className="re-card space-y-2">
      <div className="flex items-center gap-3">
        {m.avatar
          ? <img src={m.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
          : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
              <UserRound size={18} className="text-white/40" />
            </div>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{m.display_name}</p>
          <p className="truncate text-[11px] text-white/45">
            {m.age ? `${m.age}` : ""}
            {m.distance_km != null ? `${m.age ? " · " : ""}${Math.round(m.distance_km)}km` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {/* The declaration, worn. Four letters and nothing else — no type
            nickname, no description of what somebody is "like": this is what
            they told us, not a theory about them. */}
        {m.personality && (
          <span className="pill !border-mcz-cyan/40 !text-mcz-cyan">🧭 {m.personality}</span>
        )}
        {m.sign && <span className="pill">{m.sign}</span>}
        {m.sign_cn?.animal && <span className="pill">{m.sign_cn.emoji} {m.sign_cn.animal}</span>}
        {m.sober && <span className="pill !border-emerald-300/40 !text-emerald-300">sober</span>}
        {/* The label comes from the SAME lookup the filter builds, off the
            server's own list — never re-derived from the key by guessing at
            a title case, which is the second place this list would live. */}
        {m.religion && religionLabel[m.religion] && (
          <span className="pill">🕊️ {religionLabel[m.religion]}</span>
        )}
        {Object.entries(m.languages || {}).slice(0, 3).map(([key, level]) => (
          languageLabel[key] && (
            <span key={key} className="pill">🗣️ {languageLabel[key]} · {level}</span>
          )
        ))}
        {(m.regions || []).slice(0, 2).map((r) => <span key={r} className="pill">{r}</span>)}
      </div>

      {/* Nothing is a dead end — and the handoff is `MemberName`'s, not one
          invented here. It opens the profile modal and hands MessageZ the
          person (`messagez-compose`, prefilled), which is a landing on the
          control rather than a tab switch wearing a handoff's clothes. A
          second implementation of "open this member" would be the thing that
          drifts from it. */}
      <div className="pt-1">
        <MemberName username={m.username} />
      </div>
    </div>
  );
}

export default function VybeZ() {
  const [personality, setPersonality] = useState({});
  const [religions, setReligions] = useState([]);
  const [langFilter, setLangFilter] = useState([]);
  const [genders, setGenders] = useState([]);
  const [soberOnly, setSoberOnly] = useState(false);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [more, setMore] = useState(false);

  const [rows, setRows] = useState([]);
  const [note, setNote] = useState("");
  const [originShared, setOriginShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetched ONCE at the screen level and handed down as a lookup, never
  // per-card — a card component calling this hook itself would mean up to
  // a hundred cards on one page each firing their own request, the exact
  // per-row cost this app has already paid for once (see the feed/member
  // search N+1 writeup in CLAUDE.md).
  const religionList = useReligions();
  const religionLabel = useMemo(
    () => Object.fromEntries(religionList.map((r) => [r.key, r.label])),
    [religionList],
  );
  const languageList = useLanguages();
  const languageLabel = useMemo(
    () => Object.fromEntries(languageList.map((l) => [l.key, l.label])),
    [languageList],
  );

  const search = useCallback(() => {
    const parts = [];
    const p = personalityQuery(personality);
    if (p) parts.push(p);
    const rq = religionQuery(religions);
    if (rq) parts.push(rq);
    const lq = languageQuery(langFilter);
    if (lq) parts.push(lq);
    if (genders.length) parts.push(`genders=${genders.join(",")}`);
    if (soberOnly) parts.push("sober=1");
    if (ageMin) parts.push(`age_min=${ageMin}`);
    if (ageMax) parts.push(`age_max=${ageMax}`);
    if (maxKm) parts.push(`max_km=${maxKm}`);
    setLoading(true);
    setError("");
    return api(`/api/economy/members/${parts.length ? `?${parts.join("&")}` : ""}`)
      .then((d) => {
        setRows(d.members || []);
        // The server's own line about who it hid and why. Never reworded here
        // — an empty grid has two completely different causes (nobody
        // matches, or nobody has said) and only the server knows which.
        setNote(d.personality_note || "");
        setOriginShared(!!d.origin_shared);
      })
      // The real error. A search that quietly returns nothing on a 500 is the
      // worst bug class in this app, and it has shipped twice.
      .catch((e) => setError(e.message || "Couldn't run that search."))
      .finally(() => setLoading(false));
  }, [personality, religions, langFilter, genders, soberOnly, ageMin, ageMax, maxKm]);

  // Debounced, because three of these filters are TEXT INPUTS and `search`
  // is in the effect's deps. Typing "25" into age-min fired two full member
  // searches; filling all three numeric fields fired seven or eight. That
  // search is the heaviest read on the platform (regions, genders, both
  // zodiacs, sober, substances, five range gates and distance), so a
  // keystroke was never an acceptable trigger for it.
  //
  // One delay for every filter rather than a special case for the text ones:
  // a toggle answering 300ms later is imperceptible, and two code paths into
  // one search is how the two come to disagree about what was asked.
  useEffect(() => {
    const t = setTimeout(search, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="vybez.png" alt="VybeZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">VybeZ</h2>
          <p className="text-xs text-white/45">
            Find people by what they've actually said about themselves — four personality axes,
            plus everything else on their profile. Free, and nothing here costs a resource:
            searching spends nothing.
          </p>
        </div>
      </header>

      <div className="neon-frame space-y-4 p-4">
        <PersonalityFilter value={personality} onChange={setPersonality} note={note} />

        <div className="flex flex-wrap items-center gap-2">
          {["man", "woman", "nonbinary"].map((g) => (
            <Chip key={g} on={genders.includes(g)}
                  onClick={() => setGenders((v) => v.includes(g) ? v.filter((x) => x !== g) : [...v, g])}>
              {g}
            </Chip>
          ))}
          <Chip on={soberOnly} onClick={() => setSoberOnly((v) => !v)}>sober by choice</Chip>
          <button type="button" onClick={() => setMore((v) => !v)}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-white">
            <SlidersHorizontal size={13} /> {more ? "Fewer filters" : "More filters"}
          </button>
        </div>

        {more && (
          <div className="space-y-4">
            <ReligionFilter value={religions} onChange={setReligions} />
            <LanguageFilter value={langFilter} onChange={setLangFilter} />
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-[11px] text-white/50">
                Age from
                <input type="number" min={AGE_FLOOR} max={AGE_CEIL} value={ageMin}
                       onChange={(e) => setAgeMin(e.target.value)} className="neon-input !py-2 text-xs" />
              </label>
              <label className="text-[11px] text-white/50">
                Age to
                <input type="number" min={AGE_FLOOR} max={AGE_CEIL} value={ageMax}
                       onChange={(e) => setAgeMax(e.target.value)} className="neon-input !py-2 text-xs" />
              </label>
              <label className="text-[11px] text-white/50">
                Within (km)
                <input type="number" min={1} value={maxKm} disabled={!originShared}
                       onChange={(e) => setMaxKm(e.target.value)} className="neon-input !py-2 text-xs" />
                {/* A distance filter with no origin silently matches nobody, so
                    it says why rather than looking broken. */}
                {!originShared && (
                  <span className="mt-1 block text-[10px] text-white/35">
                    Turn on location sharing to search by distance —{" "}
                    <button className="re-link" onClick={() => goToSpot("profilez", "visibility")}>ProfileZ</button>
                  </span>
                )}
              </label>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Searching…
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-sm text-mcz-ember">
          {error}
        </p>
      )}

      {!loading && !error && (
        rows.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((m) => (
              <MemberCard key={m.username} m={m} religionLabel={religionLabel} languageLabel={languageLabel} />
            ))}
          </div>
        ) : (
          <div className="re-card space-y-1 text-center">
            <Search size={18} className="mx-auto text-white/25" />
            <p className="text-sm text-white/60">Nobody matched that.</p>
            {/* `note` already says when the cause is "nobody has said" rather
                than "nobody matches". Without it, the two look identical and
                the wrong one is the one people believe. */}
            <p className="text-[11px] text-white/40">
              {note || "Loosen a filter — every axis you add is an AND, not an OR."}
            </p>
          </div>
        )
      )}
    </div>
  );
}
