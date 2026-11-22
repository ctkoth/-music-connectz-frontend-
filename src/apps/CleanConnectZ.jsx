import { useMemo, useState } from "react";
import { IconImg } from "../App.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import { MODES, human, order, plan, sumBytes, targetBytes } from "../cleanPlan.js";

// Clean ConnectZ — free space on your own device. You pick a folder, say how much to free (a percent of it or a
// size), and choose how files are ranked; the screen lists exactly which files would go, and you untick any you
// want to keep. It runs entirely in this browser: nothing is uploaded, and nothing is deleted until you press the
// red button, and then only the files still ticked. StatZ's (or the daily sample).
//
// Honest limits, said on screen: a page can only read a file's LAST-MODIFIED date, not when it was last opened, so
// "least used" means "oldest modified" here; and only a Chromium-based browser can delete from a picked folder.
const CAP = 50000;
const hasPicker = typeof window !== "undefined" && "showDirectoryPicker" in window;

async function walk(dir, prefix, out) {
  for await (const [name, h] of dir.entries()) {
    if (out.length >= CAP) return;
    if (h.kind === "directory") await walk(h, `${prefix}${name}/`, out);
    else {
      const f = await h.getFile();
      out.push({ path: `${prefix}${name}`, size: f.size, used: f.lastModified, parent: dir, name });
    }
  }
}

const UNITS = { MB: 1024 ** 2, GB: 1024 ** 3 };

export default function CleanConnectZ() {
  const { s: statz } = useStatzTrial();
  const allowed = !!(statz?.is_statz || statz?.active);
  const [files, setFiles] = useState(null);
  const [root, setRoot] = useState("");
  const [kind, setKind] = useState("percent");           // percent | size
  const [percent, setPercent] = useState(10);
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState("GB");
  const [mode, setMode] = useState("priority");
  const [kept, setKept] = useState(() => new Set());     // paths the member unticked
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function pick() {
    setMsg(""); setBusy("Reading the folder…");
    try {
      const dir = await window.showDirectoryPicker({ mode: "readwrite" });
      const out = [];
      await walk(dir, "", out);
      setFiles(out); setRoot(dir.name); setKept(new Set());
      if (out.length >= CAP) setMsg(`Only the first ${CAP.toLocaleString()} files were read — pick a smaller folder for a full picture.`);
    } catch (e) {
      if (e?.name !== "AbortError") setMsg("Couldn't open that folder: " + (e?.message || "refused"));
    } finally { setBusy(""); }
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
    let done = 0, failed = 0, bytes = 0;
    for (const f of ticked) {
      try { await f.parent.removeEntry(f.name); done++; bytes += f.size; } catch { failed++; }
    }
    setMsg(`Deleted ${done.toLocaleString()} files, freed ${human(bytes)}.${failed ? ` ${failed} couldn't be deleted (in use or read-only).` : ""} Pick the folder again to rescan.`);
    setFiles(null); setBusy("");
  }

  const pill = (on) => `rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-violet-400 bg-violet-500/20 text-violet-200" : "border-white/10 text-white/70"}`;
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <IconImg icon="cleanconnectz.png" alt="Clean ConnectZ" className="h-16 w-16 rounded-2xl" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-white">Clean ConnectZ 🧹</h2>
          <p className="text-[13px] text-white/60">Free space on your device by a target — you see every file before anything goes.</p>
        </div>
      </header>

      {!allowed ? <StatzSample what="Clean ConnectZ" /> : (
        <>
          <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-200">
            Free — runs in this browser. Nothing is uploaded, and nothing is deleted until you press the red button.
          </p>
          {!hasPicker && <p className="text-sm text-mcz-gold">This browser can't open a folder for cleaning. Use Chrome or Edge, or the Windows app.</p>}
          <button className="neon-btn-primary w-full" disabled={!hasPicker || !!busy} onClick={pick}>
            📁 {files ? "Pick another folder" : "Choose a folder to clean"}
          </button>
          {busy && <p className="text-sm text-white/60">{busy}</p>}
          {msg && <p role="status" className="text-sm text-white/80">{msg}</p>}

          {files && (
            <section className="space-y-3">
              <p className="text-[13px] text-white/70"><b className="text-white">{root}</b> — {files.length.toLocaleString()} files, {human(total)}</p>

              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Target">
                <button role="tab" aria-selected={kind === "percent"} className={pill(kind === "percent")} onClick={() => setKind("percent")}>❇️ Target Percent</button>
                <button role="tab" aria-selected={kind === "size"} className={pill(kind === "size")} onClick={() => setKind("size")}>⚖️ Target Size</button>
              </div>
              {kind === "percent" ? (
                <label className="flex items-center gap-2 text-sm">Free <input type="number" min="0" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} className="neon-input !w-24" /> % of this folder</label>
              ) : (
                <label className="flex items-center gap-2 text-sm">Free <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="neon-input !w-28" />
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
              <ul className="max-h-80 divide-y divide-white/10 overflow-y-auto rounded-xl border border-white/10 text-[12px]">
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
                className="w-full rounded-xl bg-mcz-ember px-4 py-3 font-bold text-black disabled:opacity-40">
                🗑️ Delete {ticked.length.toLocaleString()} files · frees {human(freed)}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
