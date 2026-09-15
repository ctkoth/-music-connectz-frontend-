// FunnelZ — the join funnel, measured. Owner-only, because it's real visitor
// data and nobody but the owner needs to see it; the server enforces that
// (GET /api/auth/funnel/summary/ is IsAuthenticated + is_owner) and this
// component just doesn't bother calling it — or showing anything — for
// anyone else. See apps/economy/models.py FunnelEvent on the backend: real
// counts of real events only, never a fabricated number.
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { IconImg } from "../App.jsx";
import OfferCatalog from "./OfferCatalog.jsx";

const DAY_OPTIONS = [7, 14, 30, 90];

// The three rates the whole platform turns on, pinned above everything else.
//
// Eleven step rows are a detail tab: which of the three doors is shut is the
// decision, and reading it off the rows means doing arithmetic every time —
// which is how a funnel gets looked at once and never again. The server
// computes them (`headline`); this only renders.
function Headline({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((r) => (
        <div key={r.key} className="re-card space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-white/40">{r.label}</p>
          {/* `pct` is null when nobody reached the top of the step. A 0%
              against no visitors reads as a broken product; it is an empty
              measurement, and the two need opposite responses. */}
          <p className={`font-display text-3xl font-extrabold ${
            r.pct == null ? "text-white/25"
              : r.pct >= 35 ? "text-emerald-300"
                : r.pct >= 10 ? "text-mcz-gold" : "text-mcz-ember"}`}>
            {r.pct == null ? "—" : `${r.pct}%`}
          </p>
          {/* The denominator travels with the rate. 100% of two people is not
              a working funnel, and a bare percentage cannot say so. */}
          <p className="text-[11px] text-white/45">
            {r.to.toLocaleString()} of {r.from.toLocaleString()}
          </p>
          <p className="text-[11px] leading-relaxed text-white/35">{r.note}</p>
        </div>
      ))}
    </div>
  );
}

// One breakdown of the funnel by one ambient fact about a visit — the channel
// it came from, or the screen it happened on. Both answer the same shape of
// question, so they are one component: a table of buckets against the steps
// that decide anything.
function Breakdown({ title, blurb, rows, field, note, steps }) {
  // The steps worth carrying across. A per-channel table of all eleven is a
  // spreadsheet; these three are what change a decision.
  const COLS = [
    ["landing_view", "Landed"],
    ["try_view", "Opened trial"],
    ["try_scored", "Scored"],
    ["register_success", "Joined"],
  ].filter(([k]) => steps?.[k]);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{title}</p>
      <p className="text-[11px] leading-relaxed text-white/35">{blurb}</p>
      {rows?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[12px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/35">
                <th className="py-1 pr-3 font-semibold">{field}</th>
                {COLS.map(([k, l]) => (
                  <th key={k} className="py-1 pr-3 text-right font-semibold">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[field]} className="border-t border-white/[0.06]">
                  <td className="py-1.5 pr-3 font-semibold text-white">{r[field]}</td>
                  {COLS.map(([k]) => (
                    <td key={k} className={`py-1.5 pr-3 text-right ${r[k] ? "text-white/75" : "text-white/20"}`}>
                      {r[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // An empty table has to say WHICH nothing it is. "No traffic" and
        // "nothing tagged" are different problems and look identical here.
        <p className="text-[11px] text-white/35">{note}</p>
      )}
    </div>
  );
}

// Who actually joined. Not part of the funnel rows above and that is the
// point: a funnel row is a browser with no account, so it has no age and no
// gender to report, and attaching either would break the promise that nothing
// there is ever joined back to a person.
function WhoJoined({ members }) {
  if (!members) return null;
  const { total, genders = [], ages = [] } = members;
  const bar = (n) => `${Math.max(2, total ? (n / total) * 100 : 0)}%`;
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
        Who joined · {total.toLocaleString()} {total === 1 ? "account" : "accounts"}
      </p>
      <p className="text-[11px] leading-relaxed text-white/35">{members.note}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {[["Gender", genders, "gender"], ["Age", ages, "band"]].map(([label, rows, key]) => (
          <div key={label} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-white/35">{label}</p>
            {rows.filter((r) => r.members > 0 || r[key] === "unset").map((r) => (
              <div key={r[key]} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className={r[key] === "unset" ? "text-white/40" : "text-white/80"}>
                    {r[key]}
                  </span>
                  <span className="text-white/45">{r.members}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${r[key] === "unset" ? "bg-white/20" : "bg-mcz-cyan"}`}
                       style={{ width: bar(r.members) }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Pairs where the first CANNOT outnumber the second, because reaching the
// first requires passing through the second. A violation is not a surprising
// result, it is the instrument disagreeing with itself.
const IMPOSSIBLE = [
  ["try_scored", "try_send"],
  ["try_send", "try_view"],
  ["try_record", "try_view"],
  ["register_success", "landing_view"],
];

export default function FunnelZ() {
  const { user } = useAuth();
  const isOwner = !!user?.is_owner;
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isOwner);

  useEffect(() => {
    if (!isOwner) return;
    let on = true;
    setLoading(true);
    setError("");
    api(`/api/auth/funnel/summary/?days=${days}`)
      .then((d) => on && setData(d))
      // The real error, not "couldn't load" — a 403 here means the account
      // isn't actually the owner server-side even though the client thought
      // it was, and that's worth seeing plainly, not papering over.
      .catch((e) => on && setError(e.message || "Couldn't load the funnel."))
      .finally(() => on && setLoading(false));
    return () => { on = false; };
  }, [isOwner, days]);

  if (!isOwner) {
    return (
      <div className="neon-frame flex items-center gap-3 p-5 text-sm text-white/60">
        <Lock size={18} className="shrink-0 text-white/40" />
        Only the platform owner sees FunnelZ.
      </div>
    );
  }

  const steps = data?.steps;
  const baseKind = data?.base_kind;
  const baseLabel = steps?.[baseKind]?.label || baseKind;
  const maxUnique = steps ? Math.max(1, ...Object.values(steps).map((s) => s.unique)) : 1;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="funnelz.png" alt="FunnelZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">FunnelZ</h2>
          <p className="text-xs text-white/45">
            Both halves of the funnel: the join path measured — landing → trial → register,
            real events and real unique visitors, nothing modeled — and every offer the
            platform springs on a member, with the reason it exists.
          </p>
        </div>
      </header>

      <div className="flex gap-2">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`pill ${days === d ? "!border-mcz-ember/50 !text-mcz-ember" : "hover:text-white"}`}
          >
            {d}d
          </button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-sm text-mcz-ember">
          {error}
        </p>
      )}

      {steps && !loading && <Headline rows={data.headline} />}

      {steps && !loading && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/35">
            Last {data.days} days · percentages are unique visitors relative to{" "}
            <span className="text-white/55">{baseLabel}</span>
          </p>
          {Object.entries(steps).map(([kind, s]) => (
            <div key={kind} className="re-card space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">{s.label}</span>
                <span className="text-white/45">
                  {s.unique.toLocaleString()} people · {s.events.toLocaleString()} events
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-mcz-ember transition-all"
                  style={{ width: `${Math.max(2, (s.unique / maxUnique) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-white/40">{s.pct_of_base}% of {baseLabel}</p>
            </div>
          ))}
          {/* A step cannot have more people than the step it is reached
              THROUGH. When it does, the instrument changed mid-window and
              these rows are two different instruments averaged together —
              which is worth saying loudly, because every decision below is
              read off them. Checked here rather than served, because it is
              arithmetic on rows the screen already has.

              It happens for a good reason: each of these kinds was ADDED at
              some point, so any window spanning that date has real events
              before it and real events after, and no way to tell them
              apart. */}
          {IMPOSSIBLE.map(([after, before]) => {
            const a = steps[after], b = steps[before];
            if (!a || !b || a.unique <= b.unique) return null;
            return (
              <p key={after} className="re-card text-[11px] leading-relaxed text-mcz-ember">
                <strong>{a.label}</strong> counts {a.unique} people and{" "}
                <strong>{b.label}</strong> counts {b.unique} — which cannot happen,
                since nobody reaches the first without the second. This window spans
                a change to what gets logged, so these rows mix two different
                instruments. Trust a window that starts after the change.
              </p>
            );
          })}
          {Object.values(steps).every((s) => s.events === 0) && (
            <p className="text-[11px] text-white/35">
              Nothing logged yet in this window — either there's no traffic, or the frontend build
              carrying the tracking calls hasn't reached everyone yet.
            </p>
          )}
        </div>
      )}

      {steps && !loading && (
        <div className="space-y-5 border-t border-white/10 pt-5">
          <Breakdown
            title="Where they came from"
            blurb="Add ?src=<channel> to any link you post. A channel with arrivals and no scores is sending the wrong people; one with scores and no joins is a door problem — and those need opposite fixes."
            rows={data.sources} field="src" steps={steps} note={data.sources_note}
          />
          {/* Measured, never sniffed. The trial's first move is a browser mic
              dialog, and a permission cliff on a phone is not a cliff on a
              laptop — one number covering both hides whichever is real. */}
          <Breakdown
            title="What screen they were on"
            blurb="Phone, tablet or desktop, measured from the screen itself. The trial opens with a mic permission prompt, which is a different obstacle on a handset than on a laptop."
            rows={data.devices} field="dev" steps={steps} note={data.devices_note}
          />
          <WhoJoined members={data.members} />
        </div>
      )}

      {/* The other half. Measurement says where people stop; the catalogue
          says what the platform does about it, and the two belong on one
          screen because split across two tabs nobody ever looks at both —
          which is the only way either number means anything. */}
      <div className="border-t border-white/10 pt-5">
        <OfferCatalog />
      </div>
    </div>
  );
}
