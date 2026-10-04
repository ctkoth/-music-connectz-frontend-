import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import {
  disablePush, enablePush, pushState, pushSupport, savePushPrefs, subscribedHere, testPush,
} from "../push.js";

// Push to this device: on/off, which kinds, quiet hours, and a test.
//
// The server decides what each kind is and whether push exists at all
// (/api/economy/push/). A failed fetch or a platform with no keys renders
// nothing — a switch for a feature that isn't on is a dead button.

const hour = (h) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

export default function PushSettings({ compact = false }) {
  const [s, setS] = useState(null);
  const [here, setHere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const can = pushSupport();

  useEffect(() => {
    pushState().then(setS).catch(() => setS(null));
    subscribedHere().then(setHere).catch(() => setHere(false));
  }, []);

  if (!s?.enabled) return null;

  async function run(fn, after) {
    setBusy(true); setMsg("");
    try { const next = await fn(); if (next?.kinds) setS(next); if (after) after(next); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  const on = () => run(() => enablePush(s.public_key), () => { setHere(true); setMsg("Push is on for this device."); });
  const off = () => run(disablePush, () => setHere(false));
  const flip = (k, v) => run(() => savePushPrefs({ kinds: { [k]: v } }));
  const quiet = (f, v) => run(() => savePushPrefs({ [f]: Number(v) }));
  const test = () => run(testPush, (r) => setMsg(r?.reached ? "Sent — check this device." : "Nothing reached a device."));

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs" data-tour="push-settings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold text-white/80">
          <BellRing size={13} /> Push to this device
          <span className={here ? "text-emerald-300" : "text-white/40"}>{here ? "on" : "off"}</span>
        </span>
        {can.ok ? (
          <button className="re-btn !w-auto px-3 py-1 text-xs" disabled={busy} onClick={here ? off : on}>
            {busy ? <Loader2 className="animate-spin" size={12} /> : here ? "Turn off" : "Turn on"}
          </button>
        ) : null}
      </div>
      {!can.ok && <p className="text-white/55">{can.why}</p>}
      {!s.notifications_enabled && <p className="text-mcz-ember">Notifications are switched off in your preferences, so nothing will push.</p>}

      {here && !compact && (
        <>
          <p className="text-white/45">
            Only things about you, at most {s.daily_cap} a day, and never during quiet hours.
            Tap one and it opens the thing it's about.
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            {s.kinds.map((k) => (
              <label key={k.key} className="flex cursor-pointer items-center gap-2 text-white/70">
                <input type="checkbox" checked={k.on} disabled={busy} onChange={(e) => flip(k.key, e.target.checked)} />
                {k.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1 text-white/60">
            Quiet from
            <select className="neon-input !w-auto !py-0.5 text-xs" value={s.quiet.start} onChange={(e) => quiet("quiet_start", e.target.value)}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hour(h)}</option>)}
            </select>
            to
            <select className="neon-input !w-auto !py-0.5 text-xs" value={s.quiet.end} onChange={(e) => quiet("quiet_end", e.target.value)}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hour(h)}</option>)}
            </select>
            {s.quiet.tz && <span className="text-white/35">({s.quiet.tz})</span>}
            <button className="re-link ml-auto" onClick={test} disabled={busy}>Send me a test</button>
          </div>
        </>
      )}
      {msg && <p className="text-white/70">{msg}</p>}
    </div>
  );
}

/** The ask, at the moment it's worth something: right after posting. Shown
 *  once per browser until answered — a permission prompt asked on page load
 *  gets a reflexive "Block", and a browser never lets us ask again. */
export function PushAsk() {
  const [s, setS] = useState(null);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const KEY = "mcz_push_asked";

  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch { seen = true; }
    if (seen || !pushSupport().ok || Notification.permission !== "default") return;
    pushState().then((d) => { if (d?.enabled) { setS(d); setShow(true); } }).catch(() => {});
  }, []);

  if (!show) return msg ? <p className="text-xs text-emerald-300">{msg}</p> : null;
  const done = (m) => { try { localStorage.setItem(KEY, "1"); } catch { /* fine */ } setShow(false); setMsg(m || ""); };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mcz-cyan/40 bg-black/40 p-3 text-xs">
      <span className="text-white/75"><BellRing size={12} className="inline" /> Get a push when somebody rates it?</span>
      <span className="flex gap-2">
        <button className="re-link text-white/50" onClick={() => done("")}>Not now</button>
        <button className="neon-btn-primary !w-auto px-3 py-1 text-xs"
          onClick={() => enablePush(s.public_key).then(() => done("Push is on — you'll hear about ratings.")).catch((e) => done(e.message))}>
          Yes, tell me
        </button>
      </span>
    </div>
  );
}
