import { useState, useEffect } from "react";
import { Flame, Zap, Trophy, Link as LinkIcon, TrendingUp, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { SPINAZ, ENERGY } from "../resources.js";
import { goToSpot } from "../goto.js";

/**
 * LeaderboardZ — real competition on real metrics.
 * Drives conversions by showing concrete earning proof and peer progression.
 * All leaderboards track substance (actual earnings/participation), not decoration.
 */
export default function LeaderboardZ({ period = "week" }) {
  const [leaderboards, setLeaderboards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetch_leaderboards() {
      try {
        setLoading(true);
        const data = await api(`/api/economy/leaderboardz/?period=${selectedPeriod}&limit=10`);
        setLeaderboards(data);
        setError("");
      } catch (err) {
        setError(err.message);
        console.error("Failed to load leaderboards:", err);
      } finally {
        setLoading(false);
      }
    }

    fetch_leaderboards();
  }, [selectedPeriod]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="inline animate-spin text-mcz-cyan" size={24} />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-mcz-pink p-4">{error}</div>;
  }

  if (!leaderboards) {
    return null;
  }

  const periodLabel = { week: "This Week", month: "This Month", all: "All Time" }[selectedPeriod];

  return (
    <div className="space-y-6">
      {/* Wraps at narrow widths. The title and the period toggle could not
          both fit on a 320px screen and neither would give, so the toggle
          hung 58px off the right edge — invisible, because the overflow is
          on the side with no scrollbar. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy size={20} className="text-mcz-gold" /> Leaderboards
        </h2>
        <div className="flex gap-2">
          {["week", "month", "all"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`text-xs px-3 py-1 rounded border transition ${
                selectedPeriod === p
                  ? "border-mcz-cyan bg-mcz-cyan/20 text-mcz-cyan"
                  : "border-white/20 text-white/50 hover:border-white/40"
              }`}
            >
              {p === "week" ? "Week" : p === "month" ? "Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Top SpinaZ Earners */}
        {leaderboards.spinaz_earners && (
          <LeaderboardCard
            title="Top Earners"
            icon={SPINAZ}
            rows={leaderboards.spinaz_earners}
            metric="spinaz_earned"
            suffix=" 🍥"
          />
        )}

        {/* Top Energy Earners */}
        {leaderboards.energy_earners && (
          <LeaderboardCard
            title="Energy Masters"
            icon={ENERGY}
            rows={leaderboards.energy_earners}
            metric="energy_earned"
            suffix=" ⚡"
          />
        )}

        {/* Top Raters */}
        {leaderboards.raters && (
          <LeaderboardCard
            title="Community Raters"
            icon="⭐"
            rows={leaderboards.raters}
            metric="ratings_count"
            suffix=" ratings"
          />
        )}

        {/* Top Referrers */}
        {leaderboards.referrers && (
          <LeaderboardCard
            title="Network Growth"
            icon="🎯"
            rows={leaderboards.referrers}
            metric="referral_count"
            suffix=" joins"
          />
        )}
      </div>

      {/* Instrument-specific leaderboards shown in SkillZ, inside each
          instrument's own tab — "SkillZ" is never one tab, so the honest
          fix is a door per instrument rather than a single guessed
          destination. `InstrumentLeaderboardCard` below could render one of
          these live, but that's 7 more API calls on a screen that already
          loads in one — a call this fix doesn't make for you. */}
      <div className="mt-6 space-y-1.5">
        <p className="text-xs text-white/40">
          💡 Each instrument has its own XP leaderboard — see your ranking:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries({
            singz: "🎤 SingZ", rapz: "🎙️ RapZ", guitarz: "🎸 GuitarZ",
            bassz: "🅱️ BassZ", keyz: "⌨️ KeyZ", drumz: "🥁 DrumZ", violinz: "🎻 ViolinZ",
          }).map(([key, label]) => (
            <button key={key} onClick={() => goToSpot(key, `${key}-drills`)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 transition hover:border-mcz-cyan/40 hover:text-mcz-cyan">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaderboardCard({ title, icon, rows, metric, suffix }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <span className="text-lg">{icon}</span> {title}
      </h3>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-mcz-gold font-bold w-5 text-right">#{row.rank}</span>
              <span className="text-white truncate">{row.username}</span>
            </div>
            <span className="text-emerald-300 font-medium whitespace-nowrap">
              {row[metric]}{suffix}
            </span>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-white/40 text-center py-2">No entries yet</p>
      )}
    </div>
  );
}

export function InstrumentLeaderboardCard({ appKey, limit = 5 }) {
  const [leaders, setLeaders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_instrument_leaders() {
      try {
        const data = await api(`/api/economy/leaderboardz/xp/${appKey}/?limit=${limit}`);
        setLeaders(data.leaders || []);
      } catch (err) {
        console.error(`Failed to load ${appKey} leaderboard:`, err);
      } finally {
        setLoading(false);
      }
    }

    fetch_instrument_leaders();
  }, [appKey, limit]);

  if (loading || !leaders) {
    return null;
  }

  const appNames = { singz: "Vocal", rapz: "Rap", guitarz: "Guitar", bassz: "Bass", drumz: "Drums" };
  const appName = appNames[appKey] || appKey;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Trophy size={16} className="text-mcz-gold" /> {appName} Masters
      </h3>

      <div className="space-y-2">
        {leaders.map((leader, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-mcz-gold font-bold w-5 text-right">#{leader.rank}</span>
              <span className="text-white truncate">{leader.username}</span>
              <span className="text-white/40">L{leader.level}</span>
            </div>
            <span className="text-mcz-gold font-medium">+{leader.xp_earned}⭐</span>
          </div>
        ))}
      </div>

      {leaders.length === 0 && (
        <p className="text-xs text-white/40 text-center py-2">No XP earned yet</p>
      )}
    </div>
  );
}
