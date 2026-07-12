import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Flame, Loader2, Star, Trophy, Zap } from "lucide-react";
import { api } from "../api.js";

export default function SkillZPanel({ basePath, accent = "#22e6ff" }) {
  const [profile, setProfile] = useState(null);
  const [drills, setDrills] = useState([]);
  const [badges, setBadges] = useState([]);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState("");
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    const [p, d, b, l] = await Promise.all([
      api(`${basePath}/skillz/profile/`),
      api(`${basePath}/skillz/drills/`),
      api(`${basePath}/skillz/badges/`),
      api(`${basePath}/skillz/leaderboard/?limit=10`),
    ]);
    setProfile(p);
    setDrills(d);
    setBadges(b);
    setBoard(l);
  }, [basePath]);

  useEffect(() => {
    let on = true;
    setLoading(true);
    load()
      .catch((e) => on && setFlash(e.message))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [load]);

  async function train(drill) {
    setTraining(drill.key);
    setFlash("");
    try {
      // score is a simple self-rated completion here (0-100). Wire to real
      // capture later; the backend caps the perf bonus.
      const res = await api(`${basePath}/skillz/complete/`, {
        method: "POST",
        body: { drill_key: drill.key, score: 80 },
      });
      setProfile(res);
      let msg = `+${res.xp_awarded} XP · ${drill.title}`;
      if (res.new_badges?.length) msg += ` · 🏅 ${res.new_badges.length} new badge!`;
      setFlash(msg);
      const [b, l] = await Promise.all([
        api(`${basePath}/skillz/badges/`),
        api(`${basePath}/skillz/leaderboard/?limit=10`),
      ]);
      setBadges(b);
      setBoard(l);
    } catch (e) {
      setFlash(e.message);
    } finally {
      setTraining("");
    }
  }

  const grouped = useMemo(() => {
    const g = {};
    for (const d of drills) (g[d.category || "general"] ||= []).push(d);
    return g;
  }, [drills]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/50">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading SkillZ…
      </div>
    );
  }

  const pct = profile
    ? Math.round((profile.xp_into_level / (profile.xp_into_level + profile.xp_to_next_level)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stat header */}
      <div className="neon-frame p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Stat icon={Star} label="Level" value={profile?.level ?? 0} accent={accent} />
          <Stat icon={Zap} label="XP" value={profile?.xp ?? 0} accent={accent} />
          <Stat icon={Flame} label="Streak" value={`${profile?.current_streak ?? 0}d`} accent="#ff7a2bff" />
          <Stat icon={Trophy} label="Best" value={`${profile?.longest_streak ?? 0}d`} accent="#ffcf3f" />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-white/50">
            <span>Level {profile?.level}</span>
            <span>{profile?.xp_to_next_level} XP to next</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/50">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, #ff2bd1)` }} />
          </div>
        </div>
        {flash && (
          <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-sm" style={{ color: accent }}>
            {flash}
          </p>
        )}
      </div>

      {/* Drills */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">
              {cat.replace(/_/g, " ")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((d) => (
                <div key={d.key} className="neon-frame flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{d.title}</p>
                    <p className="truncate text-xs text-white/55">{d.description}</p>
                    <span className="pill mt-2 inline-block">+{d.xp} XP</span>
                  </div>
                  <button
                    onClick={() => train(d)}
                    disabled={training === d.key}
                    className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                  >
                    {training === d.key ? <Loader2 className="animate-spin" size={14} /> : "Train"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Award size={14} /> Badges
        </h3>
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span
              key={b.code}
              title={b.description}
              className={`rounded-xl border px-3 py-2 text-xs ${
                b.earned
                  ? "border-mcz-gold/50 bg-mcz-gold/10 text-mcz-gold"
                  : "border-white/10 bg-black/30 text-white/35"
              }`}
            >
              {b.earned ? "🏅 " : "🔒 "}
              {b.name}
            </span>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
          <Trophy size={14} /> Leaderboard
        </h3>
        <div className="neon-frame divide-y divide-white/5">
          {board.length === 0 && <p className="p-4 text-sm text-white/45">Be the first to train.</p>}
          {board.map((row, i) => (
            <div key={row.username + i} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="flex items-center gap-3">
                <span className="w-5 text-white/40">{i + 1}</span>
                <span className="font-medium">{row.username}</span>
              </span>
              <span className="flex items-center gap-3 text-white/55">
                <span>Lv {row.level}</span>
                <span style={{ color: accent }}>{row.xp} XP</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={20} style={{ color: accent }} />
      <div>
        <p className="text-lg font-extrabold leading-none">{value}</p>
        <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      </div>
    </div>
  );
}
