// PickConnectZ — the quick-nav dock.
//
// The tab bar lists every app; this dock is the curated shortcut row. It holds
// two kinds of slot: apps the member pinned themselves, and "AI picks", which
// are simply the apps they open most (tracked locally, never sent anywhere).
//
// Pin allowance follows the blueprint: Free pins 2 and lets the picks fill the
// rest, Premium and StatZ pin as many as they like.
import { useCallback, useEffect, useState } from "react";
import { Home, Pin, Settings2, Sparkles, X } from "lucide-react";
import { IconImg } from "./App.jsx";

const USAGE_KEY = "mcz_app_usage";
const PINS_KEY = "mcz_pinned_apps";
const AI_PICK_COUNT = 5;
const FREE_PIN_LIMIT = 2;

export const readStore = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};
export const writeStore = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode / quota — the dock just falls back to defaults */
  }
};

/** Premium and StatZ pin without limit; everyone else gets FREE_PIN_LIMIT. */
export function tierInfo(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return { label: "StatZ", limit: Infinity };
  if (t.includes("premium") || t.includes("pro") || t.includes("debug")) {
    return { label: "Premium", limit: Infinity };
  }
  return { label: "Free", limit: FREE_PIN_LIMIT };
}

export const isPremiumTier = (tier) => tierInfo(tier).limit === Infinity;

/**
 * Owns the dock's two pieces of local state: how often each app is opened, and
 * which apps are pinned. `currentKey` is the app on screen — each change counts
 * as one visit, which is what ranks the AI picks.
 */
export function usePickConnectZ(currentKey) {
  const [usage, setUsage] = useState(() => readStore(USAGE_KEY) || {});
  const [pins, setPins] = useState(() => readStore(PINS_KEY) || []);

  useEffect(() => {
    if (!currentKey) return;
    setUsage((u) => {
      const next = { ...u, [currentKey]: (u[currentKey] || 0) + 1 };
      writeStore(USAGE_KEY, next);
      return next;
    });
  }, [currentKey]);

  const togglePin = useCallback((key) => {
    setPins((p) => {
      const next = p.includes(key) ? p.filter((k) => k !== key) : [...p, key];
      writeStore(PINS_KEY, next);
      return next;
    });
  }, []);

  return { usage, pins, togglePin };
}

function DockButton({ app, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      title={app.label}
      className={`relative shrink-0 rounded-xl border p-1.5 transition ${
        active
          ? "border-mcz-ember bg-white/[0.08] shadow-neon"
          : "border-transparent hover:border-white/15 hover:bg-white/[0.06]"
      }`}
    >
      <IconImg icon={app.icon} alt={app.label} className="h-9 w-9 rounded-lg object-cover" />
      {badge}
    </button>
  );
}

export default function Dock({ apps, usage, pins, tier, current, onOpen, onTogglePin }) {
  const [editing, setEditing] = useState(false);
  const { label: tierLabel, limit } = tierInfo(tier);
  const byKey = Object.fromEntries(apps.map((a) => [a.key, a]));

  const pinnedApps = pins.map((k) => byKey[k]).filter(Boolean);
  const aiPicks = apps
    .filter((a) => !pins.includes(a.key) && (usage[a.key] || 0) > 0)
    .sort((a, b) => (usage[b.key] || 0) - (usage[a.key] || 0))
    .slice(0, AI_PICK_COUNT);
  const atLimit = pinnedApps.length >= limit;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-4xl p-2">
      {editing && (
        <div className="neon-frame mb-2 max-h-[45vh] overflow-y-auto bg-mcz-bg/95 p-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] text-white/55">
              {limit === Infinity
                ? `${tierLabel} · unlimited pins (${pinnedApps.length})`
                : `${tierLabel} · ${pinnedApps.length}/${limit} pinned`}
              {atLimit && limit !== Infinity && " · upgrade for more"}
            </span>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              title="Done"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {apps.map((a) => {
              const pinned = pins.includes(a.key);
              const disabled = !pinned && atLimit;
              return (
                <button
                  key={a.key}
                  onClick={() => !disabled && onTogglePin(a.key)}
                  disabled={disabled}
                  title={disabled ? `${tierLabel} pins ${limit} apps — upgrade for more` : a.label}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
                    pinned
                      ? "border-mcz-gold/70 bg-mcz-gold/10"
                      : disabled
                      ? "border-white/5 opacity-35"
                      : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <IconImg icon={a.icon} alt={a.label} className="h-8 w-8 rounded-lg object-cover" />
                  <span className="w-full truncate text-[9px] text-white/60">{a.label}</span>
                  {pinned && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-mcz-gold p-0.5 text-black">
                      <Pin size={9} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="neon-frame flex items-center gap-1.5 bg-mcz-bg/90 p-1.5 backdrop-blur">
        <button
          onClick={() => onOpen(apps[0]?.key)}
          title="PickConnectZ — home"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <IconImg icon="pickconz.png" alt="PickConnectZ" className="h-7 w-7 rounded-lg" />
          <Home size={13} className="hidden sm:block" />
        </button>

        <div className="h-8 w-px shrink-0 bg-white/10" />

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {aiPicks.length === 0 && pinnedApps.length === 0 ? (
            <span className="px-2 text-[11px] text-white/35">
              Open apps to build your quick nav, or tap ⚙ to pin →
            </span>
          ) : (
            <>
              {aiPicks.map((a) => (
                <DockButton
                  key={a.key}
                  app={a}
                  active={current === a.key}
                  onClick={() => onOpen(a.key)}
                  badge={
                    <span
                      className="absolute -right-0.5 -top-0.5 text-mcz-cyan"
                      title="AI pick — one of your most-opened apps"
                    >
                      <Sparkles size={9} />
                    </span>
                  }
                />
              ))}
              {aiPicks.length > 0 && pinnedApps.length > 0 && (
                <div className="h-8 w-px shrink-0 bg-white/10" />
              )}
              {pinnedApps.map((a) => (
                <DockButton
                  key={a.key}
                  app={a}
                  active={current === a.key}
                  onClick={() => onOpen(a.key)}
                  badge={
                    <span className="absolute -right-0.5 -top-0.5 text-mcz-gold" title="Pinned">
                      <Pin size={9} />
                    </span>
                  }
                />
              ))}
            </>
          )}
        </div>

        <button
          onClick={() => setEditing((v) => !v)}
          title="Customize your dock"
          className={`shrink-0 rounded-xl p-2 transition ${
            editing ? "bg-white/10 text-white shadow-neon" : "text-white/55 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Settings2 size={16} />
        </button>
      </div>
    </div>
  );
}
