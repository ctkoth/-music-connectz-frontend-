// PickConnectZ — the quick-nav dock.
//
// The tab bar lists every app; this dock is the curated shortcut row. It holds
// two kinds of slot: apps the member pinned themselves, and "AI picks", which
// are simply the apps they open most (tracked locally, never sent anywhere).
//
// Pin allowance follows the blueprint: Free pins 2 and lets the picks fill the
// rest, Premium and StatZ pin as many as they like.
import { useCallback, useEffect, useState } from "react";
import { Home, LayoutGrid, Pin, Search, Sparkles, X } from "lucide-react";
import { IconImg, slugFor } from "./App.jsx";
import { openable } from "./openable.js";
import { matchesApp, purposeOf } from "./appPurpose.js";

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
    <a
      {...openable(`/${slugFor(app.key)}`, onClick)}
      title={`${app.label} — ctrl/cmd-click for a new tab`}
      className={`relative shrink-0 rounded-xl border p-1.5 transition ${
        active
          ? "border-mcz-ember bg-white/[0.08] shadow-neon"
          : "border-transparent hover:border-white/15 hover:bg-white/[0.06]"
      }`}
    >
      <IconImg icon={app.icon} alt={app.label} className="h-9 w-9 rounded-lg object-cover" />
      {badge}
    </a>
  );
}

export default function Dock({ apps, usage, pins, tier, current, onOpen, onTogglePin }) {
  const [drawer, setDrawer] = useState(false);
  // Thirty apps with invented names, listed as a grid of artwork. Finding one
  // meant remembering it existed and then recognising its picture — recall
  // twice over, which `Interaction Design` (Rogers/Sharp/Preece) names as the
  // learnability failure and Nielsen states directly as "recognition rather
  // than recall". Searching by WHAT YOU WANT TO DO is the fix: "record" finds
  // SingZ, "where did my money go" finds LogZ. See appPurpose.js.
  const [q, setQ] = useState("");
  const { label: tierLabel, limit } = tierInfo(tier);
  const byKey = Object.fromEntries(apps.map((a) => [a.key, a]));

  const pinnedApps = pins.map((k) => byKey[k]).filter(Boolean);
  const aiPicks = apps
    .filter((a) => !pins.includes(a.key) && (usage[a.key] || 0) > 0)
    .sort((a, b) => (usage[b.key] || 0) - (usage[a.key] || 0))
    .slice(0, AI_PICK_COUNT);
  const atLimit = pinnedApps.length >= limit;
  const shown = apps.filter((a) => matchesApp(a, q));

  // Escape closes it. ITS340's events chapter is blunt about this and so is
  // every keyboard user: an overlay you can only dismiss by finding and
  // clicking a small X is an overlay somebody is trapped in. The listener is
  // bound only while the drawer is open, so it never competes with a shortcut
  // anywhere else in the app.
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") { setDrawer(false); setQ(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-4xl p-2">
      {/* The drawer is the full app list — this is how every app stays
          reachable now that the header tab bar is gone. Tapping a tile opens
          the app; the corner pin button adds it to the dock instead. */}
      {drawer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All apps"
          className="neon-frame mb-2 max-h-[55vh] overflow-y-auto bg-mcz-bg/95 p-3 backdrop-blur"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] text-white/55">
              All apps ·{" "}
              {limit === Infinity
                ? `${tierLabel} · unlimited pins (${pinnedApps.length})`
                : `${tierLabel} · ${pinnedApps.length}/${limit} pinned`}
              {atLimit && limit !== Infinity && " · upgrade for more"}
            </span>
            <button
              onClick={() => setDrawer(false)}
              className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              title="Close"
              aria-label="Close the app list"
            >
              <X size={16} />
            </button>
          </div>
          <label className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
            <Search size={14} className="shrink-0 text-white/40" />
            {/* A placeholder is not a label: it disappears the moment you type
                and screen readers are inconsistent about announcing it. The
                visible text stays a placeholder because the magnifier already
                says what the box is to a sighted user; the aria-label is what
                everybody else gets. */}
            <input
              autoFocus
              type="search"
              aria-label="Search apps by what you want to do"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What do you want to do? record, get paid, translate…"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} className="shrink-0 text-white/40 hover:text-white">
                <X size={13} />
              </button>
            )}
          </label>

          {/* Announced, not just drawn. A filter that silently changes what is
              on screen tells a screen-reader user nothing happened. */}
          <p className="sr-only" role="status" aria-live="polite">
            {q ? `${shown.length} app${shown.length === 1 ? "" : "s"} match ${q}` : ""}
          </p>

          {shown.length === 0 && (
            <p className="py-6 text-center text-[13px] text-white/40">
              Nothing matches "{q}". Try what you want to do rather than the app's name.
            </p>
          )}

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {shown.map((a) => {
              const pinned = pins.includes(a.key);
              const pinDisabled = !pinned && atLimit;
              return (
                <div key={a.key} className="relative">
                  <a
                    {...openable(`/${slugFor(a.key)}`, () => { onOpen(a.key); setDrawer(false); })}
                    // The purpose is in the tooltip AND printed below, because
                    // a tooltip does not exist on a phone and this grid is
                    // mostly read on one.
                    title={`${a.label} — ${purposeOf(a.key) || "open it"}. Ctrl/cmd-click for a new tab.`}
                    className={`flex w-full flex-col items-center gap-1 rounded-xl border p-2 transition ${
                      current === a.key
                        ? "border-mcz-ember bg-white/[0.08] shadow-neon"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <IconImg icon={a.icon} alt={a.label} className="h-8 w-8 rounded-lg object-cover" />
                    <span className="w-full truncate text-[9px] text-white/60">{a.label}</span>
                    {/* What it DOES, under what it is called. The names here
                        are invented — SpinaZ, MimeZ, OmviardZ — so the label
                        alone tells a new member nothing, and a picture tells
                        them less. */}
                    <span className="line-clamp-2 w-full text-center text-[8px] leading-tight text-white/35">
                      {purposeOf(a.key)}
                    </span>
                  </a>
                  <button
                    onClick={() => !pinDisabled && onTogglePin(a.key)}
                    disabled={pinDisabled}
                    aria-label={pinned ? `Unpin ${a.label}` : `Pin ${a.label} to the dock`}
                    aria-pressed={pinned}
                    title={
                      pinDisabled
                        ? `${tierLabel} pins ${limit} apps — upgrade for more`
                        : pinned ? `Unpin ${a.label}` : `Pin ${a.label} to the dock`
                    }
                    className={`absolute -right-1 -top-1 rounded-full p-1 transition ${
                      pinned
                        ? "bg-mcz-gold text-black"
                        : pinDisabled
                        ? "bg-white/5 text-white/20"
                        : "bg-black/70 text-white/45 hover:text-white"
                    }`}
                  >
                    <Pin size={9} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="neon-frame flex items-center gap-1.5 bg-mcz-bg/90 p-1.5 backdrop-blur">
        <a
          {...openable(`/${slugFor(apps[0]?.key || "postz")}`, () => onOpen(apps[0]?.key))}
          title="PickConnectZ — home · ctrl/cmd-click for a new tab"
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <IconImg icon="pickconz.png" alt="PickConnectZ" className="h-7 w-7 rounded-lg" />
          <Home size={13} className="hidden sm:block" />
        </a>

        <div className="h-8 w-px shrink-0 bg-white/10" />

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {aiPicks.length === 0 && pinnedApps.length === 0 ? (
            <span className="px-2 text-[11px] text-white/35">
              Tap ⊞ for every app — your most-used ones land here →
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
          onClick={() => setDrawer((v) => !v)}
          title="All apps"
          className={`shrink-0 rounded-xl p-2 transition ${
            drawer ? "bg-white/10 text-white shadow-neon" : "text-white/55 hover:bg-white/10 hover:text-white"
          }`}
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  );
}
