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

const DAY_OPTIONS = [7, 14, 30, 90];

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
            The join funnel, measured — landing → trial → register, real events and real unique
            visitors, nothing modeled.
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
          {Object.values(steps).every((s) => s.events === 0) && (
            <p className="text-[11px] text-white/35">
              Nothing logged yet in this window — either there's no traffic, or the frontend build
              carrying the tracking calls hasn't reached everyone yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
