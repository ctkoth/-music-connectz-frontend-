import { useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, HardDrive, Percent, Scale, ShieldCheck, Trash2, History as HistoryIcon } from "lucide-react";
import { IconImg } from "../App.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import { MODES, human, plan, sumBytes, targetBytes } from "../cleanPlan.js";

// Clean ConnectZ — free space on your own device. Pick a folder, say how much to free (a percent of it or a size),
// choose how files are ranked, and review exactly which files would go: untick any you want to keep. It runs in this
// browser, uploads nothing, and deletes nothing until you press the red button — and then only the files still ticked.
// StatZ's (or the daily sample).
//
// Every number on this screen is read or counted: files and bytes scanned, what the browser says it stores for this
// site, what you freed. Nothing is a made-up "junk" figure, and the scan shows files counted — never a percentage
// it cannot know. A page can only read a file's LAST-MODIFIED date, so "least used" means "oldest modified"; only a
// Chromium browser can delete from a picked folder.
const CAP = 50000;
const hasPicker = typeof window !== "undefined" && "showDirectoryPicker" in window;
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

const card = "rounded-2xl border border-violet-400/25 bg-white/[0.05] backdrop-blur";

export default function CleanConnectZ() {
  const { s: statz } = useStatzTrial();
  const allowed = !!(statz?.is_statz || statz?.active);
  const [stage, setStage] = useState("home");                // home | scanning | plan | done
  const [files, setFiles] = useState(null);
  const [root, setRoot] = useState("");
  const [seen, setSeen] = useState({ n: 0, bytes: 0 });
  const [kind, setKind] = useState("percent");
  const [percent, setPercent] = useState(10);
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("GB");
  const [mode, setMode] = useState("priority");
  const [kept, setKept] = useState(() => new Set());
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [store, setStore] = useState(null);                  // what the browser says it holds for THIS site
  const stopRef = useRef(false);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setStore(e)).catch(() => {});
  }, []);

  async function pick(nextKind) {
    if (nextKind) setKind(nextKind);
    setMsg("");
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

  const total = useMemo(() => sumBytes(files || []), [files]);
  const target = useMemo(() => targetBytes(files || [], kind === "percent" ? { percent } : { bytes: Number(amount) * UNITS[unit] }), [files, kind, percent, amount, unit]);
  const result = useMemo(() => plan(files || [], mode, target), [files, mode, target]);
  const ticked = result.selected.filter((f) => !kept.has(f.path));
  const freed = sumBytes(ticked);

  async function remove() {
    if (!ticked.length) return;
    if (!window.confirm(`Delete ${ticked.length.toLocaleString()} files from "${root}", freeing ${human(freed)}? They are removed from your device and this can't be undone.`)) return;
    setBusy("Deleting…"); setMsg("");
    let ok = 0, failed = 0, bytes = 0;
    for (const f of ticked) {
      try { await f.parent.removeEntry(f.name); ok++; bytes += f.size; } catch { failed++; }
    }
    const result = { root, ok, failed, bytes, mode, at: Date.now() };
    const h = [result, ...history]; setHistory(h); writeHistory(h);
    setDone(result); setFiles(null); setBusy(""); setStage("done");
  }

  const pill = (on) => `rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-violet-300 bg-violet-500/30 text-white" : "border-white/10 text-white/70"}`;
  const Ghost = ({ size = "h-36 w-36" }) => (
    <span className={`relative inline-flex ${size} items-center justify-center rounded-full shadow-[0_0_40px_8px_rgba(139,92,246,0.45)] ring-4 ring-violet-400/60`}>
      <IconImg icon="cleanconnectz.png" alt="Clean ConnectZ" className="h-full w-full rounded-full object-cover" />
    </span>
  );

  return (
    <div className="space-y-4 rounded-3xl border border-violet-500/30 bg-gradient-to-b from-indigo-950 via-violet-950 to-slate-950 p-4">
      <header className="text-center">
        <h2 className="font-display text-3xl font-extrabold text-white">Clean <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">ConnectZ</span></h2>
        <p className="text-[13px] text-violet-200/80">Free space on your device — you see every file before anything goes.</p>
      </header>

      {!allowed ? <StatzSample what="Clean ConnectZ" /> : (
        <>
          {stage === "home" && (
            <>
              <div className="flex justify-center py-2"><Ghost /></div>
              <div className={`${card} flex items-center gap-3 p-3`}>
                <ShieldCheck className="shrink-0 text-emerald-300" size={34} />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-white">{history[0] ? `Last clean: freed ${human(history[0].bytes)}` : "Nothing cleaned yet"}</p>
                  <p className="text-[12px] text-white/65">{history[0] ? `${new Date(history[0].at).toLocaleDateString()} · from “${history[0].root}”` : "Pick a folder to see what is taking space."}</p>
                </div>
              </div>
              <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-200">Free — runs in this browser. Nothing is uploaded, and nothing is deleted until you press the red button.</p>
              {!hasPicker && <p className="text-sm text-mcz-gold">This browser can't open a folder for cleaning. Use Chrome or Edge, or the Windows app.</p>}
              {msg && <p role="status" className="text-sm text-white/80">{msg}</p>}

              <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest text-violet-300">⚡ Quick actions</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button disabled={!hasPicker} onClick={() => pick()} className={`${card} flex flex-col items-start gap-1 p-3 text-left disabled:opacity-40`}>
                  <FolderOpen className="text-sky-300" size={26} /><span className="font-bold text-white">Choose a folder</span><span className="text-[12px] text-white/60">Scan it, then set a target ›</span>
                </button>
                <button disabled={!hasPicker} onClick={() => pick("percent")} className={`${card} flex flex-col items-start gap-1 p-3 text-left disabled:opacity-40`}>
                  <Percent className="text-fuchsia-300" size={26} /><span className="font-bold text-white">Target Percent ❇️</span><span className="text-[12px] text-white/60">Free a share of a folder ›</span>
                </button>
                <button disabled={!hasPicker} onClick={() => pick("size")} className={`${card} flex flex-col items-start gap-1 p-3 text-left disabled:opacity-40`}>
                  <Scale className="text-amber-300" size={26} /><span className="font-bold text-white">Target Size ⚖️</span><span className="text-[12px] text-white/60">Free MB or GB ›</span>
                </button>
                <div className={`${card} flex flex-col items-start gap-1 p-3`}>
                  <HardDrive className="text-cyan-300" size={26} /><span className="font-bold text-white">This browser</span>
                  <span className="text-[12px] text-white/60">{store?.quota ? `${human(store.usage)} of ${human(store.quota)} · ${((store.usage / store.quota) * 100).toFixed(store.usage / store.quota < 0.1 ? 1 : 0)}%` : "not reported"}</span>
                </div>
              </div>

              {history.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest text-violet-300"><HistoryIcon size={13} /> History on this device</p>
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
              <div className="flex justify-center py-2"><Ghost size="h-32 w-32" /></div>
              <div className={`${card} space-y-2 p-4`}>
                <p className="text-[12px] font-bold uppercase tracking-widest text-violet-300">Scanning in progress</p>
                <span aria-hidden="true" className="block h-3 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-violet-500" />
                </span>
                <p className="text-[15px] font-bold text-white">{seen.n.toLocaleString()} files · {human(seen.bytes)}</p>
                <p className="text-[12px] text-white/60">Counting what is there — the total isn't known until it finishes.</p>
              </div>
              <button onClick={() => { stopRef.current = true; }} className={`${card} w-full px-4 py-3 font-semibold text-white`}>✕ Cancel scan</button>
            </div>
          )}

          {stage === "plan" && files && (
            <section className="space-y-3">
              <button onClick={() => { setStage("home"); setFiles(null); }} className="text-[13px] text-violet-300 underline">‹ Back</button>
              <div className={`${card} p-3`}>
                <p className="text-[15px] font-bold text-white">“{root}”</p>
                <p className="text-[13px] text-white/70">{files.length.toLocaleString()} files · {human(total)}</p>
              </div>
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
                {Object.entries(MODES).map(([k, m]) => (
                  <button key={k} role="tab" aria-selected={mode === k} className={pill(mode === k)} onClick={() => { setMode(k); setKept(new Set()); }}>{m.emoji} {m.label}</button>
                ))}
              </div>
              <p className="text-[12px] text-white/60">{MODES[mode].what} “Used” here is each file's last-modified date — the only one a browser can read.</p>
              <p className="text-[14px] text-white">
                Target {human(target)} · selected <b>{ticked.length.toLocaleString()}</b> files, frees <b className="text-emerald-300">{human(freed)}</b>
                {!result.reached && <span className="text-mcz-gold"> — this folder doesn't hold enough to reach the target.</span>}
              </p>
              <ul className={`${card} max-h-80 divide-y divide-white/10 overflow-y-auto text-[12px]`}>
                {result.selected.slice(0, 500).map((f) => (
                  <li key={f.path} className="flex items-center gap-2 px-2 py-1.5">
                    <input type="checkbox" checked={!kept.has(f.path)} aria-label={`Delete ${f.path}`}
                      onChange={() => setKept((k) => { const n = new Set(k); n.has(f.path) ? n.delete(f.path) : n.add(f.path); return n; })} />
                    <span className="min-w-0 flex-1 truncate text-white/85" title={f.path}>{f.path}</span>
                    <span className="shrink-0 text-white/55">{human(f.size)} · {new Date(f.used).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
              {result.selected.length > 500 && <p className="text-[11px] text-white/50">Showing the first 500 of {result.selected.length.toLocaleString()}.</p>}
              <button onClick={remove} disabled={!ticked.length || !!busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-mcz-ember px-4 py-3 font-bold text-black disabled:opacity-40">
                <Trash2 size={18} /> Delete {ticked.length.toLocaleString()} files · frees {human(freed)}
              </button>
              {busy && <p className="text-sm text-white/60">{busy}</p>}
            </section>
          )}

          {stage === "done" && done && (
            <div className="space-y-3 text-center">
              <p className="mx-auto w-fit rounded-full border border-violet-300/40 px-3 py-1 text-[13px] text-violet-100">✨ All cleaned up!</p>
              <div className="flex justify-center"><Ghost size="h-32 w-32" /></div>
              <p className="font-display text-6xl font-extrabold text-white drop-shadow-[0_0_18px_rgba(167,139,250,0.7)]">{human(done.bytes)}</p>
              <p className="font-display text-4xl font-extrabold text-violet-300">Freed</p>
              <ul className={`${card} divide-y divide-white/10 text-left text-[14px]`}>
                <li className="flex items-center justify-between px-3 py-2.5 text-white">🗑️ {done.ok.toLocaleString()} files deleted <span className="text-emerald-300">✔</span></li>
                <li className="flex items-center justify-between px-3 py-2.5 text-white">📁 From “{done.root}” <span className="text-emerald-300">✔</span></li>
                <li className="flex items-center justify-between px-3 py-2.5 text-white">{MODES[done.mode].emoji} Ranked by {MODES[done.mode].label} <span className="text-emerald-300">✔</span></li>
                {done.failed > 0 && <li className="px-3 py-2.5 text-mcz-gold">{done.failed} couldn't be deleted (in use or read-only).</li>}
              </ul>
              <button onClick={() => { setStage("home"); setDone(null); }} className="w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-lg font-bold text-white">Great job! 🎉</button>
              <p className="text-[12px] text-violet-200/80">Pick the folder again to rescan what is left.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
