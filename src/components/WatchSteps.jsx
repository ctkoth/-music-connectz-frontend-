// Steps from the member's phone and watch, via Health Connect — the card under StepZ's own count.
//
// Everything stated here is the server's (`/api/economy/health/`): whether a phone is linked, the days, and the sentence
// saying what the number is and that it pays nothing. A web page cannot read a watch, so linking happens in the Android app:
// this card shows a short code and opens the app's native screen. It is kept apart from the steps a member logs by hand —
// a device's count and a typed one are different things and are never added together.
//
// What Unlink does is stated on the button before it is pressed: it deletes every day held here.
import { useEffect, useState } from "react";
import { Watch } from "lucide-react";
import { api } from "../api.js";
import { STANDALONE } from "../standalone.js";
import { bars, dayLabel, launchHref, onAndroid } from "../healthSteps.js";

export default function WatchSteps() {
  const [st, setSt] = useState(null);     // null = not asked / failed: the card renders nothing rather than a broken panel
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => api("/api/economy/health/").then(setSt).catch(() => {});
  useEffect(() => { load(); }, []);
  // After the app syncs, the member comes back to this screen: ask again when it is shown.
  useEffect(() => {
    const on = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  if (!st) return null;

  const pair = async () => {
    setBusy(true); setErr("");
    try { setCode(await api("/api/economy/health/pair/", { method: "POST", body: {} })); }
    catch (e) { setErr(e.message || "Couldn't make a code."); }
    finally { setBusy(false); }
  };
  const unlink = async () => {
    if (!window.confirm("Unlink and delete every step day held here? Your phone's own Health Connect data is not touched.")) return;
    setBusy(true); setErr("");
    try { setSt(await api("/api/economy/health/", { method: "DELETE" })); setCode(null); }
    catch (e) { setErr(e.message || "Couldn't unlink."); }
    finally { setBusy(false); }
  };

  const android = onAndroid(typeof navigator !== "undefined" ? navigator.userAgent : "");
  const rows = bars(st.days);

  return (
    <div className="re-card" data-tour="watch-steps">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-semibold"><Watch size={16} className="text-mcz-cyan" /> From your phone and watch</span>
        {st.linked && <span className="text-xs text-emerald-300">Linked{st.last_sync_at ? ` · last sent ${new Date(st.last_sync_at).toLocaleString()}` : ""}</span>}
      </div>
      <p className="mt-2 text-xs text-white/60">{st.note}</p>

      {!st.linked && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-white/80">{st.needs}</p>
          {!code ? (
            <button type="button" className="neon-btn" disabled={busy} onClick={pair}>Get a link code</button>
          ) : (
            <div className="space-y-2">
              <p className="text-3xl font-extrabold tracking-[0.3em] text-mcz-cyan">{code.code}</p>
              <p className="text-xs text-white/60">{code.how} Good for {code.minutes} minutes, once.</p>
              {android
                ? <a className="neon-btn inline-block" href={launchHref(STANDALONE)}>Open the Android app</a>
                : <p className="text-xs text-amber-300">Open this on your Android phone to continue — a computer can't read Health Connect.</p>}
              <div><button type="button" className="pill" onClick={load}>I've linked it — check</button></div>
            </div>
          )}
        </div>
      )}

      {st.linked && (
        <div className="mt-3 space-y-2">
          {rows.length === 0
            ? <p className="text-sm text-white/70">Linked, nothing sent yet. In the Android app, press Send steps now.</p>
            : rows.map((r) => (
              <div key={r.day} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-white/60">{dayLabel(r.day)}</span>
                <div className="h-2 min-w-0 flex-1 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-mcz-cyan to-emerald-400" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right font-semibold text-emerald-300">{r.steps.toLocaleString()}</span>
              </div>
            ))}
          <button type="button" className="pill !border-mcz-ember !text-mcz-ember" disabled={busy} onClick={unlink}>
            Unlink · deletes these {rows.length || ""} days from your account
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
