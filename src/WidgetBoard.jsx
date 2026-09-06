// WidgetZ — links open ON the screen, side by side, instead of taking the
// member off it.
//
// A profile link was `<a target="_blank">` and nothing else. That is the dead
// end the cross-pollination rule exists to close: the member leaves, whatever
// they were reading is behind a tab they now have to find again, and every
// door this app could have offered them next is on the screen they just left.
// Worse, they leave one at a time — comparing a member's three links meant
// three round trips out of the app and back.
//
// The board is the fix. Links open as tiles on one surface, as many as the
// screen can hold, and the screen decides how many rather than a breakpoint
// guessing (`useScreenShape.js` measures width, height, orientation and
// whether the pointer is a finger). Nothing is destroyed by opening a second
// one, so "which of these do I want" is a glance rather than a tab dance.
//
// **Three ways a link opens, and the server decides which** — see
// `apps/economy/widgetz.py`. A player (YouTube, Spotify, SoundCloud, …) frames
// a URL the SERVER built out of an id, so it is safe at every tier. One of our
// own addresses is not framed at all; it opens the real screen. Anything else
// is an arbitrary page inside our own chrome, which is StatZ and only for a
// link the malware scan cleared. A link that gets none of those still opens —
// in a tab, exactly as it does today. The tier buys where a link opens, never
// whether.
//
// **The dwell reward finally has an honest signal.** `/api/economy/link/click/`
// has paid +5 ⚡ for a genuine 30-second visit to another member's link since
// it was written, and no live screen ever called it: a `target="_blank"` hands
// the member to another tab and we never learn a thing about what happened
// there, so there was nothing honest to send. A widget is on our screen and we
// can see it — so the seconds are counted here, only while the tab is actually
// visible, and the gain is stated on the control before it is pressed.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import {
  ArrowLeftRight, ChevronDown, ChevronUp, ExternalLink, Loader2, Maximize2,
  Minimize2, X,
} from "lucide-react";
import { api } from "./api.js";
import { asList } from "./shape.js";
import { ENERGY } from "./resources.js";
import { goToSpot } from "./goto.js";
import { tabForSlug } from "./App.jsx";
import { useScreenShape } from "./useScreenShape.js";
import { widgetHint } from "./widgetz.js";

const WidgetCtx = createContext(null);

/** `open(url, { owner, label })` from anywhere that renders a link. */
export const useWidgets = () => useContext(WidgetCtx) || EMPTY;

// A component under no provider must not crash the tab it lives in — a link
// list is not worth an error boundary. It falls back to what a link did
// before the board existed.
const EMPTY = {
  policy: null,
  widgets: [],
  open: (url) => window.open(url, "_blank", "noopener,noreferrer"),
  close: () => {},
};

let nextId = 1;

// The board sits BETWEEN the app's two fixed surfaces rather than over them:
// the sticky header (tab, profile, log out) and the PickConnectZ dock. Covering
// either would mean a member with a widget open has to close it to go anywhere,
// which is the tab-switch problem this whole feature exists to end.
const HEADER_PX = 64;
const DOCK_PX = 76;

export function WidgetProvider({ children }) {
  const [widgets, setWidgets] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [minimized, setMinimized] = useState(false);

  // The policy — who may frame a page, and what a visit pays. Read once, so
  // no control has to retype a tier or a reward number. A failure leaves it
  // null and every control falls back to the plain link.
  useEffect(() => {
    api("/api/economy/widgetz/").then(setPolicy).catch(() => {});
  }, []);

  const close = useCallback((id) => {
    setWidgets((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const patch = useCallback((id, fields) => {
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...fields } : w)));
  }, []);

  // The updater passed to setWidgets must stay pure — React calls it twice in
  // development on purpose, so an updater that also reported something back to
  // its caller would report it twice and, in the "already open" case below,
  // decide twice. The current list is read off a ref instead.
  const live = useRef([]);
  useEffect(() => { live.current = widgets; }, [widgets]);

  const open = useCallback(async (url, { owner = "", label = "" } = {}) => {
    if (!url) return;
    // Already open: bring it forward rather than framing the same page twice.
    // Matched on what was ASKED for, not on `url`: the server completes a bare
    // "musicconnectz.net" to a scheme and hands that back, so a widget's own
    // url stops being the string the link carried the moment it resolves.
    if (live.current.some((w) => w.req === url)) {
      setWidgets((ws) => ws.map((w) => ({ ...w, focused: w.req === url })));
      setMinimized(false);
      return;
    }

    const id = nextId++;
    setWidgets((ws) => [...ws, { id, req: url, url, owner, label: label || url, state: "resolving", span: 1 }]);
    setMinimized(false);
    let spec;
    try {
      spec = await api("/api/economy/widgetz/open/", { method: "POST", body: { url, owner } });
    } catch (e) {
      // The real error, never a shrug. A widget that silently became a tab
      // would be the save-handler bug in a different costume.
      patch(id, { state: "error", reason: e?.message || "That link couldn't be opened here." });
      return;
    }
    if (spec?.mode === "internal") {
      // One of ours. A tile offering to open the screen would be a second
      // press for something the member already asked for, so the placeholder
      // goes and the real screen opens — the board is for links that would
      // otherwise have left the app, and this one never was going to.
      close(id);
      openOurOwn(spec.target);
      return;
    }
    // The member's own label for the link wins over the host the server fell
    // back to — they named it, and a row that renamed itself on opening would
    // be a different row than the one that was pressed.
    patch(id, { ...spec, label: label || spec?.label || url, state: "ready" });
  }, [patch, close]);

  const value = useMemo(
    () => ({ policy, widgets, open, close, minimized, setMinimized,
             setSpan: (id, span) => patch(id, { span }),
             focus: (id) => setWidgets((ws) => ws.map((w) => ({ ...w, focused: w.id === id }))),
             closeAll: () => setWidgets([]) }),
    [policy, widgets, open, close, minimized, patch],
  );

  return (
    <WidgetCtx.Provider value={value}>
      {children}
      <Board />
    </WidgetCtx.Provider>
  );
}

/** The control that opens a link on the screen, with what it does — and what
 *  it pays — said before it is pressed. */
export function OpenAsWidget({ url, owner, label, className = "" }) {
  const { open, policy } = useWidgets();
  const hint = widgetHint(url, !!policy?.page_widgets?.allowed);
  const reward = policy?.reward;
  // The gain, up front. Only another member's link pays, so only another
  // member's link says so — a "+5 ⚡" on your own link would be a lie you
  // find out about by earning nothing.
  const pays = !!owner && !!reward?.energy;

  if (hint.kind === "outside") {
    // Honest before the press: this one is going to open in a tab. The reason
    // travels with it so the button is not just a quieter version of the same
    // control beside it.
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`pill hover:!text-mcz-cyan ${className}`}
        title={policy?.page_widgets?.allowed === false
          ? `Outside pages open as widgets on ${policy?.page_widgets?.needs_tier || "StatZ"}. This one opens in a new tab.`
          : "Opens in a new tab"}
      >
        {label || hint.host || url}
        <ExternalLink size={11} className="ml-1 inline opacity-50" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open(url, { owner, label })}
      className={`pill hover:!text-mcz-cyan ${className}`}
      title={hint.kind === "internal" ? "Opens here" : "Opens as a widget on this screen"}
    >
      {label || hint.host || url}
      {pays && (
        <span className="ml-1.5 text-emerald-300">
          +{reward.energy} {ENERGY}
        </span>
      )}
    </button>
  );
}

// ---- The board -------------------------------------------------------------

function Board() {
  const { widgets, minimized, setMinimized, closeAll } = useWidgets();
  const shape = useScreenShape();

  // Escape gets the page back. A surface this size that can only be dismissed
  // by finding its own button is one people close by reloading.
  useEffect(() => {
    if (!widgets.length || minimized) return undefined;
    const h = (e) => { if (e.key === "Escape") setMinimized(true); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [widgets.length, minimized, setMinimized]);

  if (!widgets.length) return null;

  if (minimized) {
    return (
      <div className="fixed inset-x-0 z-[130] px-3" style={{ bottom: DOCK_PX + 8 }}>
        <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-xl border border-white/10 bg-mcz-panel/95 px-3 py-2 backdrop-blur">
          <button
            onClick={() => setMinimized(false)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left text-[12px] text-white/70 hover:text-white"
          >
            <ChevronUp size={14} className="shrink-0" />
            <span className="truncate">
              {widgets.length} widget{widgets.length === 1 ? "" : "s"} open
            </span>
          </button>
          <button onClick={closeAll} className="rounded p-1 text-white/40 hover:text-mcz-ember" title="Close all">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // One lane is a stack, and a stack of frames is a scroll marathon — so only
  // the focused widget is expanded there and the rest collapse to their bars.
  const focusedId = widgets.find((w) => w.focused)?.id ?? widgets[widgets.length - 1].id;

  return (
    <div
      // z above the member-card modal (110) and below the tour (200): a widget
      // opened FROM the member card has to be visible without closing it, and
      // minimising the board puts the card back exactly as it was.
      className="fixed inset-x-0 z-[120] flex flex-col bg-mcz-bg/95 backdrop-blur"
      style={{ top: HEADER_PX, bottom: DOCK_PX }}
      role="region"
      aria-label="WidgetZ board"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="font-display text-[13px] font-bold text-white/80">WidgetZ</span>
        <span className="text-[11px] text-white/35">
          {widgets.length} open · {shape.lanes} lane{shape.lanes === 1 ? "" : "s"} ·{" "}
          {shape.w}×{shape.h}
          {shape.coarse ? " touch" : ""}
        </span>
        <span className="flex-1" />
        <button onClick={() => setMinimized(true)} className="rounded p-1.5 text-white/50 hover:text-white" title="Minimise the board">
          <ChevronDown size={16} />
        </button>
        <button onClick={closeAll} className="rounded p-1.5 text-white/50 hover:text-mcz-ember" title="Close all">
          <X size={16} />
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${shape.lanes}, minmax(0, 1fr))`,
          gap: 12,
          alignContent: "start",
        }}
      >
        {widgets.map((w) => (
          <Widget
            key={w.id}
            w={w}
            shape={shape}
            collapsed={shape.stacked && w.id !== focusedId}
          />
        ))}
      </div>
    </div>
  );
}

function Widget({ w, shape, collapsed }) {
  const { close, setSpan, focus } = useWidgets();
  const span = Math.min(w.span || 1, shape.lanes);
  const title = w.label || w.host || w.url;

  return (
    <section
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-mcz-panel/80"
      style={{ gridColumn: `span ${span} / span ${span}` }}
    >
      <header className="flex items-center gap-1.5 border-b border-white/[0.08] px-2 py-1.5">
        <button
          onClick={() => focus(w.id)}
          className="min-w-0 flex-1 truncate text-left text-[11px] text-white/70 hover:text-white"
          title={w.url}
        >
          {title}
          {w.host && <span className="ml-1.5 text-white/30">{w.host}</span>}
        </button>
        {shape.lanes > 1 && !collapsed && (
          <button
            onClick={() => setSpan(w.id, span >= shape.lanes ? 1 : span + 1)}
            className="rounded p-1 text-white/40 hover:text-mcz-cyan"
            title={span >= shape.lanes ? "Narrower" : "Wider"}
          >
            {span >= shape.lanes ? <Minimize2 size={13} /> : <ArrowLeftRight size={13} />}
          </button>
        )}
        <a
          href={w.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-1 text-white/40 hover:text-mcz-gold"
          title="Open in a new tab instead"
        >
          <ExternalLink size={13} />
        </a>
        <button onClick={() => close(w.id)} className="rounded p-1 text-white/40 hover:text-mcz-ember" title="Close">
          <X size={13} />
        </button>
      </header>

      {!collapsed && (
        <div className="min-h-0 flex-1">
          <WidgetBody w={w} shape={shape} />
        </div>
      )}
      {collapsed && (
        <button
          onClick={() => focus(w.id)}
          className="px-2 py-2 text-left text-[11px] text-white/35 hover:text-white/70"
        >
          Tap to bring this one forward
        </button>
      )}
    </section>
  );
}

function WidgetBody({ w, shape }) {
  // The dwell that earns. Counted only while this widget is on screen AND the
  // browser tab is visible, because a widget behind a switched-away tab is not
  // a visit — and a reward that pays for a backgrounded frame is a reward
  // somebody will leave running overnight.
  const reward = useDwellReward(w);

  if (w.state === "resolving") {
    return (
      <div className="flex h-40 items-center justify-center text-white/40">
        <Loader2 size={16} className="mr-2 animate-spin" /> Opening…
      </div>
    );
  }

  if (w.state === "error" || w.mode === "refused") {
    return (
      <Note tone="ember">{w.reason || "That link couldn't be opened here."}</Note>
    );
  }

  if (w.mode === "internal") {
    // `open()` acts on this before a tile is ever drawn. The branch stays as
    // the fallback for a widget restored or resolved by any other path — a
    // mode the server can return must have somewhere to render.
    return (
      <div className="space-y-2 p-3">
        <p className="text-[12px] text-white/60">{w.reason}</p>
        <button className="re-btn !py-2 !text-[12px]" onClick={() => openOurOwn(w.target)}>
          Open it here
        </button>
      </div>
    );
  }

  if (w.mode === "outside") {
    return (
      <div className="space-y-2 p-3">
        <Note tone={w.gate === "unsafe" ? "ember" : "muted"}>{w.reason}</Note>
        <a
          href={w.url}
          target="_blank"
          rel="noopener noreferrer"
          className="re-btn !py-2 !text-[12px]"
        >
          <ExternalLink size={13} /> Open in a new tab
        </a>
      </div>
    );
  }

  // A framed thing: a provider's player, or a whole page on StatZ.
  const style = w.aspect
    ? { aspectRatio: w.aspect.replace("/", " / "), maxHeight: shape.maxTile }
    : { height: Math.min(w.height || 320, shape.maxTile) };

  return (
    <div className="space-y-1">
      <div className="w-full bg-black" style={style}>
        <iframe
          title={w.label || w.host || "widget"}
          src={w.src}
          className="h-full w-full border-0"
          loading="lazy"
          // The server decides both of these. A page widget is sandboxed
          // without `allow-same-origin`, which is what stops a framed site
          // reaching back out of its box; a player gets the permissions its
          // own embed needs and nothing wider.
          sandbox={w.mode === "page" ? w.sandbox : undefined}
          allow={w.allow || undefined}
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      {w.may_refuse && (
        // Whether a site permits framing is the site's call, and a refused
        // frame looks exactly like a slow one from in here — there is no way
        // to detect it and no honest way to pretend otherwise. So the way out
        // stays on screen rather than the member being left staring at white.
        <p className="px-2 pb-1 text-[10px] text-white/30">
          Some sites refuse to be shown inside another page. If this stays
          blank,{" "}
          <a href={w.url} target="_blank" rel="noopener noreferrer" className="text-mcz-cyan underline">
            open it in a tab
          </a>.
        </p>
      )}
      {reward.line && (
        <p className="px-2 pb-1.5 text-[10px] text-emerald-300">{reward.line}</p>
      )}
    </div>
  );
}

function Note({ children, tone = "muted" }) {
  const cls = tone === "ember" ? "text-mcz-ember" : "text-white/50";
  return <p className={`p-3 text-[12px] leading-relaxed ${cls}`}>{children}</p>;
}

/** Our own addresses are screens, not frames. */
function openOurOwn(target) {
  if (!target) return;
  if (target.kind === "member") {
    window.dispatchEvent(new CustomEvent("mcz-goto-profile", { detail: target.key }));
    return;
  }
  if (target.kind === "post") return goToSpot("social", "social-feed");
  if (target.kind === "playlist") return goToSpot("playlistz");
  // A tab address carries a SLUG (`/post`), and `goToSpot` wants the tab KEY
  // (`postz`). Translating through the app's own `tabForSlug` rather than
  // guessing at the "drop the z" rule keeps one definition of that mapping —
  // a second one here would drift the first time a tab is renamed.
  const tab = tabForSlug(target.key);
  if (tab) goToSpot(tab.key);
}

/** Count the seconds a widget is genuinely being looked at, and bank the ⚡
 *  the server already offers for a real visit to another member's link.
 *
 *  The seconds are the honest part. `document.visibilityState` gates the
 *  counter, so a backgrounded tab accrues nothing; the server still applies
 *  its own floor, its once-per-link-per-day rule and its daily cap, so this
 *  cannot pay itself — it can only stop under-reporting a visit that happened. */
function useDwellReward(w) {
  const { policy } = useWidgets();
  const [line, setLine] = useState("");
  const seconds = useRef(0);
  const sent = useRef(false);

  const framed = w.mode === "player" || w.mode === "page";
  const need = policy?.reward?.after_seconds || 30;
  const pays = framed && !!w.owner && !!policy?.reward?.energy;

  useEffect(() => {
    if (!pays || sent.current) return undefined;
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seconds.current += 1;
      if (seconds.current < need) {
        setLine(`+${policy.reward.energy} ${ENERGY} after ${need - seconds.current}s here`);
        return;
      }
      if (sent.current) return;
      sent.current = true;
      clearInterval(tick);
      api("/api/economy/link/click/", {
        method: "POST",
        body: { url: w.url, owner: w.owner, active_seconds: seconds.current },
      })
        .then((r) => {
          // The server decides — its daily cap, its once-per-day-per-link rule
          // and its Safe Browsing verdict all outrank anything counted here.
          // So the line reports what was ACTUALLY paid, never what we hoped.
          setLine(r?.rewarded ? `+${r.reward_energy} ${ENERGY} earned — a real visit` : "");
        })
        .catch(() => setLine(""));
    }, 1000);
    return () => clearInterval(tick);
  }, [pays, need, w.url, w.owner, policy]);

  return { line };
}

/** A member's links, rendered as controls that open on the screen.
 *  One component so the member card, the public post and anything else that
 *  grows links cannot drift into three different behaviours. */
export function LinkList({ links, owner, className = "" }) {
  const rows = asList(links);
  if (!rows.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {rows.map((l, i) => {
        const url = typeof l === "string" ? l : l?.url;
        if (!url) return null;
        const label = typeof l === "string" ? "" : l?.label;
        return <OpenAsWidget key={i} url={url} owner={owner} label={label || url} />;
      })}
    </div>
  );
}
