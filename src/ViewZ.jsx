// ViewZ — 👁️ who is looking, drawn like a track in a DAW.
//
// Every page in this app could be looked at by a thousand people and say
// nothing about it. A creator had ratings (which need somebody to act) and
// comments (which need somebody to care) and no answer to the first question
// anybody asks: did anyone see it? Silence reads as "nobody", and "nobody" is
// why people stop posting.
//
// Two decisions worth keeping:
//
//   THE TIMELINE, NOT THE TOTAL. "128 views" is a receipt. Twenty-four lanes
//   across a day is a waveform: you can see the spike when it got shared, the
//   flat overnight stretch, whether the attention is still arriving or already
//   over. Every one of those is something a creator would act on, and none of
//   them is in the scalar. It is drawn as bars because this is a music app and
//   that is what a track looks like.
//
//   "WATCHING" IS THE ENGAGING NUMBER, NOT THE TOTAL. A total is a receipt for
//   something that already happened. "3 people are here right now" is an
//   invitation, and it is the half that changes what somebody does next.
//
// The server decides what a view IS (one viewer per day, never your own work,
// logged-out counted once per browser) and says so in `note`. This screen
// prints that sentence rather than inventing a claim of its own.
import { useEffect, useRef, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { api } from "./api.js";
import { asList } from "./shape.js";
import { useSwipeAway } from "./swipe.js";
import { goToSpot } from "./goto.js";

const VIEWER_KEY = "mcz_viewer_id";

/** A stable-per-browser id, so a logged-out viewer counts once and not once
 *  per refresh. Cleared with site data, which is why the server treats the
 *  logged-out count as a floor and says so. */
function viewerId() {
  try {
    let v = localStorage.getItem(VIEWER_KEY);
    if (!v) {
      v = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).slice(0, 64);
      localStorage.setItem(VIEWER_KEY, v);
    }
    return v;
  } catch {
    return "";                       // storage blocked → not counted, not faked
  }
}

/** Tell the server this browser is looking at `target`, and keep telling it. */
export function useViews(target, { beat = true } = {}) {
  const [state, setState] = useState(null);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!target) return;
    let live = true;
    let timer = null;
    const headers = { "X-MCZ-Viewer": viewerId() };

    const ping = () => {
      // A tab nobody is looking at is not a viewer. `hidden` is the browser's
      // own answer to that, and using it is the difference between "watching"
      // meaning watching and meaning "left a tab open".
      if (document.hidden) return schedule(30);
      api("/api/economy/viewz/", { method: "POST", body: { target: targetRef.current }, headers })
        .then((d) => {
          if (!live) return;
          setState(d);
          schedule(d.beat_seconds || 30);
        })
        .catch(() => schedule(120));   // a failed beat is not worth a retry storm
    };
    const schedule = (secs) => {
      if (!live) return;
      clearTimeout(timer);
      timer = setTimeout(ping, secs * 1000);
    };

    ping();
    const wake = () => { if (!document.hidden) ping(); };
    document.addEventListener("visibilitychange", wake);
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [target, beat]);

  return state;
}

/** Record one view of `target` and stop. No beat loop.
 *
 * Deliberately NOT what a feed card does on render. Thirty cards each holding
 * a heartbeat is thirty requests every half minute, and "it scrolled past on
 * your screen" is an impression, not a view — counting it would inflate the
 * one number a creator is going to trust. This fires when somebody DELIBERATELY
 * opens a thing: a public post page, or the ViewZ panel for one. */
export function recordView(target) {
  if (!target) return Promise.resolve(null);
  return api("/api/economy/viewz/", {
    method: "POST",
    body: { target },
    headers: { "X-MCZ-Viewer": viewerId() },
  }).catch(() => null);
}

/** A read-only 👁️ for a feed card: shows the count it was handed, opens the
 *  timeline, and beats at nothing. */
export function ViewsBadge({ target, views, className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Open ViewZ — when people looked, hour by hour"
        className={`pill !text-[11px] transition hover:!border-white/40 hover:!text-white active:scale-95 ${className}`}
      >
        👁️ {Number(views ?? 0).toLocaleString()}
      </button>
      {open && <ViewZPanel target={target} onClose={() => setOpen(false)} />}
    </>
  );
}

/** 👁️ 128 · 3 watching — and it opens the timeline. Nothing is a dead end. */
export function ViewsPill({ target, className = "" }) {
  const live = useViews(target);
  const [open, setOpen] = useState(false);
  if (!live) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open ViewZ — when people looked, hour by hour"
        className={`pill transition hover:!border-white/40 hover:!text-white active:scale-95 ${className}`}
      >
        👁️ {Number(live.views || 0).toLocaleString()}
        {live.watching > 1 && (
          <span className="ml-1 text-emerald-300">· {live.watching} here now</span>
        )}
      </button>
      {open && <ViewZPanel target={target} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The DAW lane. */
export default function ViewZPanel({ target, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const sheet = useSwipeAway(onClose);

  useEffect(() => {
    let on = true;
    api(`/api/economy/viewz/?target=${encodeURIComponent(target)}`)
      .then((d) => on && setData(d))
      .catch((e) => on && setErr(e.message || "Couldn't load ViewZ."));
    return () => { on = false; };
  }, [target]);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const lanes = asList(data?.lanes);
  const hourOf = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.getHours();
  };

  return (
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="ViewZ"
    >
      <div ref={sheet} className="neon-frame w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">👁️</span>
          <div className="flex-1">
            <h3 className="font-display text-xl font-extrabold">ViewZ</h3>
            <p className="text-[11px] text-white/45">{target}</p>
          </div>
          <button onClick={onClose} className="re-link text-xs" aria-label="Close ViewZ">Close</button>
        </div>

        {err && <p className="text-[12px] text-mcz-ember">{err}</p>}
        {!data && !err && (
          <p className="flex items-center gap-2 text-white/50">
            <Loader2 className="animate-spin" size={15} /> Loading…
          </p>
        )}

        {data && (
          <>
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <span className="pill">👁️ {data.views?.toLocaleString()} views</span>
              <span className="pill">{data.viewers?.toLocaleString()} people</span>
              <span className={`pill ${data.watching ? "!border-emerald-400/40 !text-emerald-300" : ""}`}>
                {data.watching ? (
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                ) : null}
                {data.watching} here now
              </span>
            </div>

            {/* The lane. Bars, floor-aligned, one an hour — the quiet hours
                are drawn as empty rather than skipped, because a timeline
                with the silence removed lies about the shape of the day. */}
            <div className="rounded-lg border border-white/[0.08] bg-black/40 p-3">
              <div className="flex h-24 items-end gap-[2px]" role="img"
                   aria-label={`Views by hour over the last ${data.hours} hours, peak ${data.peak}`}>
                {lanes.map((l) => (
                  <div
                    key={l.at}
                    title={`${new Date(l.at).toLocaleString()} — ${l.views} view${l.views === 1 ? "" : "s"}`}
                    className="flex-1 rounded-t-sm bg-mcz-cyan/70"
                    style={{
                      // A bar for zero is still drawn, 2px tall, so the lane
                      // reads as a timeline rather than as gaps.
                      height: l.views ? `${Math.max(6, l.level * 100)}%` : "2px",
                      opacity: l.views ? 1 : 0.35,
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-white/35">
                <span>{lanes[0] ? `${hourOf(lanes[0].at)}:00` : ""}</span>
                <span>peak {data.peak}/hr</span>
                <span>now</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-white/40">{data.note}</p>

            <MineList />
          </>
        )}
      </div>
    </div>
  );
}


/** Which of MY posts is moving, right now.
 *
 * A creator with five posts should not open five screens to find out which one
 * is running. The endpoint that answers this existed with nothing calling it,
 * which is exactly how the member directory ended up rendering six invented
 * people — an endpoint with no caller is a feature nobody has.
 *
 * A post with no views is still listed. Silence is the answer, not the absence
 * of one, and hiding the quiet ones would make this a leaderboard instead of
 * a report.
 */
function MineList() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || rows) return;
    api("/api/economy/viewz/mine/")
      .then((d) => setRows(asList(d.items)))
      .catch(() => setRows([]));       // logged out, or nothing of yours yet
  }, [open, rows]);

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <button className="re-link text-[12px]" onClick={() => setOpen((v) => !v)}
              aria-expanded={open}>
        {open ? "Hide" : "Which of my posts is moving?"}
      </button>
      {open && rows === null && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-white/45">
          <Loader2 className="animate-spin" size={13} /> Looking…
        </p>
      )}
      {open && rows?.length === 0 && (
        <p className="mt-2 text-[12px] text-white/45">Nothing of yours yet — post something.</p>
      )}
      {open && rows?.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li key={r.target}>
              <button
                onClick={() => goToSpot(r.open_in, "")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition hover:bg-white/[0.05]"
              >
                <span className="w-16 shrink-0 tabular-nums text-white/70">👁️ {r.views}</span>
                {r.watching > 0 && (
                  <span className="shrink-0 text-emerald-300">{r.watching} now</span>
                )}
                <span className="flex-1 truncate text-white/60">{r.title || "(untitled)"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
