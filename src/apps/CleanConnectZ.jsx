import { useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, HardDrive, Percent, Scale, ShieldCheck, Trash2, History as HistoryIcon } from "lucide-react";
import { IconImg } from "../App.jsx";
import { loadLimits } from "../limits.js";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { MODES, MODE_ORDER, dupeCopies, human, openModes, plan, sumBytes, targetBytes } from "../cleanPlan.js";

// Clean ConnectZ — free space on your own device. Pick a folder, say how much to free (a percent of it or a size),
// choose how files are ranked, and review exactly which files would go: untick any you want to keep. It runs in this
// browser, uploads nothing, and deletes nothing until you press the red button — and then only the files still ticked.
// open to every plan; the tier sets how many ways of choosing what goes are open (`clean_modes`).
//
// Every number on this screen is read or counted: files and bytes scanned, what the browser says it stores for this
// site, what you freed. Nothing is a made-up "junk" figure, and the scan shows files counted — never a percentage
// it cannot know. A page can only read a file's LAST-MODIFIED date, so "least used" means "oldest modified"; only a
// Chromium browser can delete from a picked folder. In the Windows app, window.mczFiles (desktop/files.cjs) reads real
// last-accessed times, finds byte-identical duplicates and moves files to the Recycle Bin instead of deleting for good.
const CAP = 50000;
const hasPicker = typeof window !== "undefined" && "showDirectoryPicker" in window;
// The Windows app hands our site a file bridge (desktop/files.cjs): real last-accessed times, duplicate finding and the
// Recycle Bin. Without it the page falls back to the browser's folder picker, which can do none of those.
const bridge = typeof window !== "undefined" && window.mczFiles && window.mczFiles.version >= 1 ? window.mczFiles : null;
const canPick = hasPicker || !!bridge;
const HKEY = "mcz_clean_history";
const UNITS = { MB: 1024 ** 2, GB: 1024 ** 3 };

const readHistory = () => { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; } };
const writeHistory = (h) => { try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 20))); } catch { /* not remembered */ } };

async function walk(dir, prefix, out, tick, stopped) {
  for await (const [name, h] of dir.entries()) {
    if (out.length >= CAP || stopped()) return;
    if (h.kind === "directory") await walk(h, `${prefix}${name}/`, out, tick, stopped);
    else {
      const f = await h.getFile();
      out.push({ path: `${prefix}${name}`, size: f.size, used: f.lastModified, parent: dir, name });
      tick(out);
    }
  }
}

// Grok's layout: glass cards on a radial purple field, a floating ghost, a big Clean Now button.
const card = "rounded-[20px] border border-white/10 bg-white/[0.07] backdrop-blur-xl";
const FLOAT = `@keyframes mczFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes mczSpin{to{transform:rotate(360deg)}}
@keyframes mczSweep{0%,100%{transform:translateX(-10px) rotate(-7deg)}50%{transform:translateX(10px) rotate(7deg)}}
@keyframes mczDust{0%{opacity:0;transform:translate(-30px,0) scale(.5)}20%{opacity:.9}100%{opacity:0;transform:translate(70px,-14px) scale(1.3)}}
@keyframes mczPop{0%{opacity:0;transform:translate(0,0) scale(.2)}30%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1) rotate(160deg)}}
@media (prefers-reduced-motion: reduce){.mcz-float,.mcz-spin,.mcz-fx,.mcz-fx *{animation:none!important}.mcz-fx{display:none}}`;
const DUST = [[8, 78, 0], [18, 84, .35], [4, 70, .7], [14, 90, 1.05], [10, 74, 1.4]];
const SPARK = [["-90px", "-70px", "✨"], ["90px", "-80px", "⭐"], ["-100px", "10px", "✦"], ["100px", "20px", "✨"], ["-40px", "-110px", "✦"], ["50px", "-110px", "⭐"]];

export default function CleanConnectZ() {
  // The tier says how MUCH of this you get, never whether: every plan can pick a folder, see every file and clear space.
  // `clean_modes` (server, /limits/) is how many ways of choosing what goes are open, and the duplicate finder opens with the 2nd.
  const [lim, setLim] = useState(null);
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  // Duplicate scans (Windows app) are open on every plan; the tier says how many a day (`/cleanconnectz/dupes/`, said before the press).
  const [dupes, setDupes] = useState(null);
  useEffect(() => { if (bridge) api("/api/economy/cleanconnectz/dupes/").then(setDupes).catch(() => {}); }, []);
  const modesN = lim && "clean_modes" in lim ? lim.clean_modes : undefined;
  const open = openModes(modesN);
  const [stage, setStage] = useState("home");                // home | scanning | plan | done
  const [files, setFiles] = useState(null);
  const [root, setRoot] = useState("");
  const [seen, setSeen] = useState({ n: 0, bytes: 0 });
  const [kind, setKind] = useState("percent");
  const [percent, setPercent] = useState(10);
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("GB");
  const [mode, setMode] = useState("size");
  const [kept, setKept] = useState(() => new Set());
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [store, setStore] = useState(null);                  // what the browser says it holds for THIS site
  const stopRef = useRef(false);
  const tokenRef = useRef(null);                              // the bridge's handle for the folder chosen (never a path)
  const [dupeMode, setDupeMode] = useState(false);
  const [lastAccess, setLastAccess] = useState(null);         // bridge: does Windows record last-access here? true | false | null
  const [permanent, setPermanent] = useState(false);          // bridge: skip the Recycle Bin

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setStore(e)).catch(() => {});
  }, []);

  async function pick(nextKind, { dupes = false } = {}) {
    if (nextKind) setKind(nextKind);
    setMsg(""); setDupeMode(false);
    if (bridge) return pickBridge(dupes);
    let dir;
    try { dir = await window.showDirectoryPicker({ mode: "readwrite" }); }
    catch (e) { if (e?.name !== "AbortError") setMsg("Couldn't open that folder: " + (e?.message || "refused")); return; }
    stopRef.current = false;
    setSeen({ n: 0, bytes: 0 }); setStage("scanning");
    const out = [];
    let last = 0;
    await walk(dir, "", out, (o) => { if (o.length - last >= 25) { last = o.length; setSeen({ n: o.length, bytes: sumBytes(o) }); } }, () => stopRef.current);
    if (stopRef.current) { setStage("home"); return; }
    setFiles(out); setRoot(dir.name); setKept(new Set()); setSeen({ n: out.length, bytes: sumBytes(out) });
    if (out.length >= CAP) setMsg(`Only the first ${CAP.toLocaleString()} files were read — pick a smaller folder for a full picture.`);
    setStage("plan");
  }

  async function pickBridge(wantDupes) {
    if (wantDupes && dupes && !dupes.can) { setMsg(`You've used today's ${dupes.limit} duplicate scans${dupes.next_limit === false ? "" : " — the next plan up allows " + (dupes.next_limit == null ? "any number" : dupes.next_limit)}. Nothing was charged.`); return; }
    let r;
    try { r = await bridge.pick(); } catch { setMsg("The Windows app couldn't open the folder dialog."); return; }
    if (!r) return;
    tokenRef.current = r.token; setLastAccess(r.lastAccess);
    stopRef.current = false;
    setSeen({ n: 0, bytes: 0 }); setStage("scanning");
    const off = bridge.onProgress((p) => setSeen((x) => ({ ...x, n: p.n })));
    try {
      const sc = await bridge.scan(r.token);
      if (sc.error || sc.cancelled) { if (sc.error) setMsg(sc.error); setStage("home"); return; }
      let list = sc.files;
      setSeen({ n: list.length, bytes: sumBytes(list) });
      if (wantDupes) {
        setSeen((x) => ({ ...x, n: 0 }));
        const d = await bridge.dupes(r.token, list);
        if (d.error || d.cancelled) { if (d.error) setMsg(d.error); setStage("home"); return; }
        // The scan finished, so it counts — recorded now, never for a cancelled or failed one. Refused means no results.
        try { const rec = await api("/api/economy/cleanconnectz/dupes/", { method: "POST", body: {} }); setDupes(rec.dupes); }
        catch (e) { setMsg(e.message || "That scan couldn't be counted."); setStage("home"); return; }
        list = dupeCopies(list, d.groups);
        setDupeMode(true); setKind("percent"); setPercent(100); setMode("size");
        setMsg(list.length ? "" : "No duplicates found — no two files in this folder are byte-for-byte the same.");
        if (!list.length) { setStage("home"); return; }
      } else if (sc.capped) setMsg(`Only the first ${CAP.toLocaleString()} files were read — pick a smaller folder for a full picture.`);
      setFiles(list); setRoot(r.name); setKept(new Set()); setSeen({ n: list.length, bytes: sumBytes(list) });
      setStage("plan");
    } catch { setMsg("The scan couldn't finish."); setStage("home"); }
    finally { off(); }
  }

  const total = useMemo(() => sumBytes(files || []), [files]);
  const target = useMemo(() => targetBytes(files || [], kind === "percent" ? { percent } : { bytes: Number(amount) * UNITS[unit] }), [files, kind, percent, amount, unit]);
  const useMode = open.includes(mode) ? mode : open[0];
  const result = useMemo(() => plan(files || [], useMode, target), [files, useMode, target]);
  const ticked = result.selected.filter((f) => !kept.has(f.path));
  const freed = sumBytes(ticked);

  async function remove() {
    if (!ticked.length) return;
    const gone = bridge && !permanent
      ? `Move ${ticked.length.toLocaleString()} files from "${root}" to the Recycle Bin? You can restore them from there; the ${human(freed)} is freed when the Bin is emptied.`
      : `Delete ${ticked.length.toLocaleString()} files from "${root}", freeing ${human(freed)}? They are removed from your device and this can't be undone.`;
    if (!window.confirm(gone)) return;
    setBusy("Deleting…"); setMsg("");
    let ok = 0, failed = 0, bytes = 0;
    let recycled = false;
    if (bridge) {
      const r = await bridge.remove(tokenRef.current, ticked.map((f) => f.path), permanent).catch(() => ({ error: "The Windows app didn't answer." }));
      if (r.error) { setBusy(""); setMsg(r.error); return; }
      const bad = new Set(r.failed.map((x) => x.path));
      for (const f of ticked) { if (bad.has(f.path)) failed++; else { ok++; bytes += f.size; } }
      recycled = r.recycled;
    } else {
      for (const f of ticked) {
        try { await f.parent.removeEntry(f.name); ok++; bytes += f.size; } catch { failed++; }
      }
    }
    // What was cleaned, by the folder it came from — read off the paths actually deleted.
    const by = new Map();
    for (const f of ticked) { /* only successes count toward the total above; the list mirrors the selection */
      const top = f.path.includes("/") ? f.path.split("/")[0] : "(top level)";
      by.set(top, (by.get(top) || 0) + f.size);
    }
    const parts = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, b]) => ({ name, bytes: b }));
    const result = { root, ok, failed, bytes, mode: dupeMode ? "dupes" : useMode, recycled, parts, at: Date.now() };
    const h = [result, ...history]; setHistory(h); writeHistory(h);
    setDone(result); setFiles(null); setBusy(""); setStage("done");
  }

  // What "used" means depends on where the folder was read: a browser sees only the modified date; the Windows app can
  // read the last-accessed time — but Windows often doesn't record it (a volume setting), so it says which it is.
  const usedNote = !bridge ? "“Used” here is each file's last-modified date — the only one a browser can read."
    : lastAccess === true ? "“Used” is each file's last-opened time, read by the Windows app."
    : lastAccess === false ? "“Used” is the last-modified date: this PC doesn't record when files are opened (a Windows setting), so a file you open but never save looks unused."
    : "“Used” is the newer of last-opened and last-modified; Windows couldn't say whether it records opens on this PC.";
  const pill = (on) => `rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-violet-300 bg-violet-500/30 text-white" : "border-white/10 text-white/70"}`;
  // fx: "idle" floats; "sweep" sways like a broom and kicks dust sideways (scanning); "burst" pops sparkles (done).
  const Ghost = ({ size = 200, fx = "idle" }) => (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="mcz-float h-full w-full" style={{ animation: fx === "sweep" ? "mczSweep 1.1s ease-in-out infinite" : "mczFloat 4.2s ease-in-out infinite", filter: "drop-shadow(0 8px 30px rgba(139,92,246,0.55))" }}>
        <IconImg icon="cleanconnectz.png" alt="Clean ConnectZ ghost" className="h-full w-full rounded-3xl object-cover" />
      </div>
      {fx === "sweep" && (
        <div aria-hidden="true" className="mcz-fx pointer-events-none absolute inset-0">
          {DUST.map(([l, t, d], i) => (
            <span key={i} className="absolute h-2.5 w-2.5 rounded-full bg-violet-200/80 blur-[1px]"
              style={{ left: `${l}%`, top: `${t}%`, animation: `mczDust 1.4s ease-out ${d}s infinite` }} />
          ))}
        </div>
      )}
      {fx === "burst" && (
        <div aria-hidden="true" className="mcz-fx pointer-events-none absolute inset-0 flex items-center justify-center">
          {SPARK.map(([dx, dy, ch], i) => (
            <span key={i} className="absolute text-xl text-violet-100" style={{ "--dx": dx, "--dy": dy, animation: `mczPop 1.6s ease-out ${i * 0.12}s 2 both` }}>{ch}</span>
          ))}
        </div>
      )}
    </div>
  );



  return (
    <div className="space-y-3 rounded-[28px] border border-white/10 p-5 text-white"
         style={{ background: "radial-gradient(ellipse at top, #2d1b69 0%, #150a2e 40%, #0a0418 100%)" }}>
      <style>{FLOAT}</style>
      <header className="flex items-center gap-2.5">
        <IconImg icon="cleanconnectz.png" alt="" className="h-10 w-10 rounded-full object-cover" />
        <div>
          <h2 className="bg-gradient-to-r from-white to-violet-200 bg-clip-text font-display text-[27px] font-bold leading-none tracking-tight text-transparent">Clean ConnectZ</h2>
          <p className="text-[13px] font-medium text-violet-300">Device cleaner — you see every file first.</p>
        </div>
      </header>

      {(
        <>
          {stage === "home" && (
            <>
              <div className="py-1"><Ghost /></div>
              <button disabled={!canPick} onClick={() => pick()}
                className="my-1 w-full rounded-[20px] px-4 py-[17px] text-[17px] font-semibold text-white shadow-[0_10px_28px_rgba(124,58,237,0.4)] disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>🧹 Clean Now</button>
              {!canPick && <p className="text-sm text-mcz-gold">This browser can't open a folder for cleaning. Use Chrome or Edge, or the Windows app.</p>}
              {bridge && <p className="text-center text-[12px] text-emerald-300">Windows app: real last-opened dates and the Recycle Bin{", plus the duplicate finder"}.</p>}
              {msg && <p role="status" className="text-sm text-white/80">{msg}</p>}
              <div className={`${card} flex items-center gap-3 p-4`}>
                <span className="text-[22px]">🛡️</span>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold">{history[0] ? `Last clean: freed ${human(history[0].bytes)}` : "Nothing cleaned yet"}</p>
                  <p className="mt-0.5 text-[13px] text-violet-300">{history[0] ? `${new Date(history[0].at).toLocaleDateString()} · from “${history[0].root}”` : "Pick a folder to see what is taking space."}</p>
                </div>
              </div>
              <p className="text-center text-[12px] text-violet-200/90">🔒 100% local · nothing is uploaded · nothing is deleted until you confirm</p>

              <p className="pt-1 text-[14px] font-semibold tracking-wide">QUICK ACTIONS</p>
              <div className="grid grid-cols-2 gap-2.5">
                {[["📁", "Choose a folder", "Scan it first", () => pick()],
                  ["❇️", "Target Percent", "Free a share", () => pick("percent")],
                  ["⚖️", "Target Size", "Free MB or GB", () => pick("size")]].map(([icon, t, sub, go]) => (
                  <button key={t} disabled={!canPick} onClick={go}
                    className="rounded-[18px] border border-violet-300/20 bg-white/[0.06] px-2.5 py-4 text-center backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-violet-500/20 disabled:opacity-40">
                    <div className="mb-1.5 text-2xl">{icon}</div><div className="text-[14px] font-semibold">{t}</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-violet-200">{sub}</div>
                  </button>
                ))}
                {bridge && (
                  <div className="col-span-2 space-y-1.5">
                  <button onClick={() => pick("percent", { dupes: true })}
                    className="w-full rounded-[18px] border border-violet-300/20 bg-white/[0.06] px-2.5 py-4 text-center backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-violet-500/20">
                    <div className="mb-1.5 text-2xl">♊</div><div className="text-[14px] font-semibold">Find duplicates</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-violet-200">Byte-identical copies · you keep one of each</div>
                    {dupes && <div className="mt-1 text-[12px] text-violet-200/80">{dupes.unlimited ? "Free · no limit on your plan" : `Free · ${dupes.left} of ${dupes.limit} scans left today`}</div>}
                  </button>
                  {/* Approaching the number (the server's `near`: one left or none) is when the upgrade is offered — never
                      before, and never on the top plan. The gain is stated beside it, from the server's next-plan number. */}
                  {dupes?.near && dupes.upgrade && (
                    <button onClick={() => goToSpot(dupes.upgrade.tab, dupes.upgrade.target)}
                      className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-emerald-300/30 bg-emerald-400/10 px-3 py-2.5 text-[13px] font-semibold text-white">
                      <span>{dupes.left === 0 ? "Out of scans today" : "1 scan left today"} — upgrade</span>
                      <span className="text-emerald-300">+{dupes.next_limit == null ? "unlimited" : `${dupes.next_limit} a day`}</span>
                    </button>
                  )}
                  </div>
                )}
                <div className="rounded-[18px] border border-violet-300/20 bg-white/[0.06] px-2.5 py-4 text-center backdrop-blur-xl">
                  <div className="mb-1.5 text-2xl">📊</div><div className="text-[14px] font-semibold">This browser</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-violet-200">{store?.quota ? `${human(store.usage)} · ${((store.usage / store.quota) * 100).toFixed(store.usage / store.quota < 0.1 ? 1 : 0)}%` : "not reported"}</div>
                </div>
              </div>

              {history.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="flex items-center gap-1.5 text-[14px] font-semibold tracking-wide"><HistoryIcon size={14} /> HISTORY</p>
                  <ul className={`${card} divide-y divide-white/10 text-[13px]`}>
                    {history.slice(0, 5).map((h) => (
                      <li key={h.at} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 truncate text-white/85">{h.root}</span>
                        <span className="shrink-0 text-white/60">{human(h.bytes)} · {new Date(h.at).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {stage === "scanning" && (
            <div className="space-y-3 text-center">
              <Ghost size={170} fx="sweep" />
              <h3 className="text-[22px] font-semibold">Scanning…</h3>
              <div className="relative mx-auto my-2 h-[190px] w-[190px]">
                <span aria-hidden="true" className="mcz-spin absolute inset-0 rounded-full"
                  style={{ background: "conic-gradient(#a78bfa 0% 28%, rgba(255,255,255,0.08) 28% 100%)", animation: "mczSpin 1.6s linear infinite" }} />
                <span className="absolute inset-[19px] flex flex-col items-center justify-center rounded-full" style={{ background: "#150a2e" }}>
                  <span className="bg-gradient-to-r from-white to-violet-200 bg-clip-text text-[36px] font-bold leading-none text-transparent">{seen.n.toLocaleString()}</span>
                  <span className="mt-1 text-[13px] text-violet-300">files · {human(seen.bytes)}</span>
                </span>
              </div>
              <p className="text-violet-200">Counting what is there — the total isn't known until it finishes.</p>
              <button onClick={() => { stopRef.current = true; bridge?.cancel(); }} className={`${card} w-full px-4 py-3 font-semibold`}>✕ Cancel scan</button>
            </div>
          )}

          {stage === "plan" && files && (
            <section className="space-y-3">
              <button onClick={() => { setStage("home"); setFiles(null); }} className="text-[13px] text-violet-300 underline">‹ Back</button>
              <div className={`${card} p-3`}>
                <p className="text-[15px] font-bold text-white">“{root}”</p>
                <p className="text-[13px] text-white/70">{files.length.toLocaleString()} files · {human(total)}</p>
              </div>
              {dupeMode ? (
                <p className="text-[13px] text-violet-200">Every file below is an exact copy (same bytes, checked) of one the app is keeping — the oldest in each group. Untick any you want to hold on to.</p>
              ) : (
                <>
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Target">
                <button role="tab" aria-selected={kind === "percent"} className={pill(kind === "percent")} onClick={() => setKind("percent")}>❇️ Target Percent</button>
                <button role="tab" aria-selected={kind === "size"} className={pill(kind === "size")} onClick={() => setKind("size")}>⚖️ Target Size</button>
              </div>
              {kind === "percent" ? (
                <label className="flex items-center gap-2 text-sm text-white">Free <input type="number" min="0" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} className="neon-input !w-24" /> % of this folder</label>
              ) : (
                <label className="flex items-center gap-2 text-sm text-white">Free <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="neon-input !w-28" />
                  <select data-nomemo="true" value={unit} onChange={(e) => setUnit(e.target.value)} className="neon-input !w-24"><option>MB</option><option>GB</option></select></label>
              )}
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Order">
                {MODE_ORDER.map((k) => {
                  const m = MODES[k], on = open.includes(k);
                  return (
                    <button key={k} role="tab" aria-selected={useMode === k} disabled={!on} title={on ? m.what : "Opens on a higher plan"}
                      className={`${pill(useMode === k)} ${on ? "" : "opacity-50"}`} onClick={() => { setMode(k); setKept(new Set()); }}>
                      {on ? m.emoji : "🔒"} {m.label}
                    </button>
                  );
                })}
              </div>
              {open.length < MODE_ORDER.length && (
                <p className="text-[12px] text-white/60">
                  Your plan opens {open.length} of {MODE_ORDER.length} ways to choose what goes{lim?.tier === "free" && lim?.tiers?.premium?.clean_modes ? `; Premium opens ${lim.tiers.premium.clean_modes}, and the duplicate finder starts with the second` : ""}{lim?.tier === "free" || lim?.tier === "premium" ? "; StatZ opens them all" : ""}. Everything else here is the same on every plan.
                </p>
              )}
              <p className="text-[12px] text-white/60">{MODES[useMode].what} {usedNote}</p>
                </>
              )}
              <p className="text-[14px] text-white">
                {dupeMode ? "Copies found" : `Target ${human(target)}`} · selected <b>{ticked.length.toLocaleString()}</b> files, frees <b className="text-emerald-300">{human(freed)}</b>
                {!result.reached && <span className="text-mcz-gold"> — this folder doesn't hold enough to reach the target.</span>}
              </p>
              <ul className={`${card} max-h-80 divide-y divide-white/10 overflow-y-auto text-[12px]`}>
                {result.selected.slice(0, 500).map((f) => (
                  <li key={f.path} className="flex items-center gap-2 px-2 py-1.5">
                    <input type="checkbox" checked={!kept.has(f.path)} aria-label={`Delete ${f.path}`}
                      onChange={() => setKept((k) => { const n = new Set(k); n.has(f.path) ? n.delete(f.path) : n.add(f.path); return n; })} />
                    <span className="min-w-0 flex-1 truncate text-white/85" title={f.path}>{f.path}</span>
                    <span className="shrink-0 text-white/55">{human(f.size)} · {dupeMode ? `copy of ${f.dupeOf.split("/").pop()}` : new Date(f.used).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
              {result.selected.length > 500 && <p className="text-[11px] text-white/50">Showing the first 500 of {result.selected.length.toLocaleString()}.</p>}
              <button onClick={remove} disabled={!ticked.length || !!busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-mcz-ember px-4 py-3 font-bold text-black disabled:opacity-40">
                <Trash2 size={18} /> {bridge && !permanent ? "Move" : "Delete"} {ticked.length.toLocaleString()} files {bridge && !permanent ? "to the Recycle Bin" : "for good"} · {human(freed)}
              </button>
              {bridge && (
                <label className="flex items-start gap-2 text-[12px] text-white/70">
                  <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} className="mt-0.5" />
                  <span>Skip the Recycle Bin — frees the space now, can't be undone.</span>
                </label>
              )}
              {busy && <p className="text-sm text-white/60">{busy}</p>}
            </section>
          )}

          {stage === "done" && done && (
            <div className="space-y-3 text-center">
              <p className="mx-auto w-fit rounded-full bg-violet-400/20 px-4 py-2 text-[14px] backdrop-blur">✨ All Cleaned Up</p>
              <Ghost size={170} fx="burst" />
              <p className="bg-gradient-to-r from-white to-violet-200 bg-clip-text text-[46px] font-bold leading-none tracking-tight text-transparent">{human(done.bytes)}</p>
              <p className="text-[22px] font-semibold text-violet-200">{done.recycled ? "Moved to the Recycle Bin" : "Freed"}</p>
              {done.recycled && <p className="text-[12px] text-violet-200/80">The space comes back when you empty the Bin. Until then you can restore any of it.</p>}
              <div className={`${card} p-4 text-left`}>
                <p className="mb-1.5 font-semibold">Cleaned items</p>
                {(done.parts || []).map((x) => (
                  <div key={x.name} className="flex justify-between border-b border-white/10 py-3 text-[15px]"><span>📁 {x.name}</span><span>{human(x.bytes)} ✓</span></div>
                ))}
                <div className="flex justify-between py-3 text-[15px] text-white/80"><span>🗑️ {done.ok.toLocaleString()} files from “{done.root}”</span><span>{done.mode === "dupes" ? "♊ Duplicates" : `${MODES[done.mode].emoji} ${MODES[done.mode].label}`}</span></div>
                {done.failed > 0 && <p className="text-mcz-gold text-[13px]">{done.failed} couldn't be deleted (in use or read-only).</p>}
              </div>
              <button onClick={() => { setStage("home"); setDone(null); }} className="w-full rounded-[18px] px-4 py-4 text-[16px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>Done</button>
              <p className="text-[12px] text-violet-200/80">Pick the folder again to rescan what is left.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
