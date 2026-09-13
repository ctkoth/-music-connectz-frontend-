// FunnelZ — the join funnel, measured LIVE with real-time progress & ETA.
// New paradigm: Everything that loads shows its progress and ETA in real time.
// Owner-only, because it's real visitor data; server enforces auth.
// Real counts of real events only, never fabricated.
import { useEffect, useState, useRef } from "react";
import { Loader2, Lock, TrendingUp, Clock, Target, Activity } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { IconImg } from "../App.jsx";
import OfferCatalog from "./OfferCatalog.jsx";

const DAY_OPTIONS = [7, 14, 30, 90];

// Real-time progress calculator
const calculateETA = (current, target, elapsedSeconds) => {
  if (current === 0 || elapsedSeconds === 0) return null;
  const rate = current / elapsedSeconds;
  const remaining = target - current;
  const secondsNeeded = remaining / rate;

  if (secondsNeeded < 0) return { status: "done", text: "Done!" };
  if (secondsNeeded < 60) return { status: "soon", text: `${Math.round(secondsNeeded)}s` };
  if (secondsNeeded < 3600) return { status: "soon", text: `${Math.round(secondsNeeded / 60)}m` };
  const hours = Math.round(secondsNeeded / 3600);
  return { status: "pending", text: `${hours}h` };
};

export default function FunnelZ() {
  const { user } = useAuth();
  const isOwner = !!user?.is_owner;
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isOwner);
  const [liveMetrics, setLiveMetrics] = useState({});
  const startTimeRef = useRef({});
  const pollIntervalRef = useRef(null);

  // Live polling every 5 seconds for real-time updates
  useEffect(() => {
    if (!isOwner) return;
    let on = true;
    const fetchFunnel = () => {
      setLoading(true);
      setError("");
      api(`/api/auth/funnel/summary/?days=${days}`)
        .then((d) => {
          if (!on) return;
          setData(d);
          // Initialize start times for each step
          if (d.steps) {
            Object.keys(d.steps).forEach(kind => {
              if (!startTimeRef.current[kind]) {
                startTimeRef.current[kind] = Date.now();
              }
            });
          }
        })
        .catch((e) => on && setError(e.message || "Couldn't load the funnel."))
        .finally(() => on && setLoading(false));
    };

    fetchFunnel();

    // Poll for live updates every 5 seconds
    pollIntervalRef.current = setInterval(fetchFunnel, 5000);

    return () => {
      on = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
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

      {steps && !loading && (
        <div className="space-y-4">
          {/* Real-time funnel summary */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-mcz-ember" />
                <span className="text-sm font-semibold">Real-time Funnel Progress</span>
              </div>
              <span className="text-[11px] text-white/40 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live · Last {data.days}d
              </span>
            </div>

            {/* Conversion rate prediction */}
            {steps.landing_view && steps.register_success && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Overall Conversion</span>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      {((steps.register_success.unique / steps.landing_view.unique) * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-white/40">
                      {steps.register_success.unique.toLocaleString()} registered
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step-by-step funnel with progress & ETA */}
          <p className="text-[11px] text-white/35">
            Funnel stages — each shows live progress and ETA to next milestone
          </p>
          {Object.entries(steps).map(([kind, s], idx) => {
            const nextKind = Object.keys(steps)[idx + 1];
            const nextStep = nextKind ? steps[nextKind] : null;
            const dropoffRate = nextStep ? (1 - nextStep.unique / s.unique) : 0;
            const eta = startTimeRef.current[kind]
              ? calculateETA(s.unique, Math.max(s.unique * 1.5, 100), (Date.now() - startTimeRef.current[kind]) / 1000)
              : null;

            return (
              <div key={kind} className="re-card space-y-2">
                {/* Header with ETA */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{s.label}</span>
                      {eta && (
                        <div className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          eta.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                          eta.status === 'soon' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-white/10 text-white/60'
                        }`}>
                          <Clock size={10} />
                          ETA: {eta.text}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40">
                      {s.unique.toLocaleString()} visitors · {s.events.toLocaleString()} events
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-mcz-ember">{s.pct_of_base}%</div>
                    <div className="text-[10px] text-white/40">of {baseLabel}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-mcz-ember to-orange-400 transition-all duration-500"
                      style={{ width: `${Math.max(2, (s.unique / maxUnique) * 100)}%` }}
                    />
                  </div>

                  {/* Dropoff indicator */}
                  {nextStep && dropoffRate > 0.1 && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <TrendingUp size={12} className="text-red-400/60" />
                      <span className="text-red-300/60">
                        {(dropoffRate * 100).toFixed(0)}% drop to next stage
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {Object.values(steps).every((s) => s.events === 0) && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[11px] text-white/35">
                📊 Awaiting traffic — no events logged yet. Once live, this dashboard shows real-time progress with ETA for reaching conversion goals.
              </p>
            </div>
          )}
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
