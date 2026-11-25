// Clean ConnectZ's file bridge, the parts that decide things — pure or near-pure so they can be tested on
// Linux (src/desktopFiles.test.mjs). files.cjs wires them to Electron. The rule that matters most: the PAGE
// never names a path. It names a folder the member chose (a token) and files by their path RELATIVE to it,
// and `resolveInside` is what refuses anything that climbs out.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CAP = 50000;               // files read per scan, same ceiling as the browser version
const HEAD = 64 * 1024;          // first-pass fingerprint: size + the first 64KB, before reading a whole file

/** Absolute path of `rel` under `root`, or null if it is not strictly inside it. Never trusts `..` or absolute input. */
function resolveInside(root, rel) {
  if (typeof root !== "string" || typeof rel !== "string" || !root || !rel) return null;
  if (rel.includes("\0") || path.isAbsolute(rel)) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, rel);
  const within = path.relative(base, full);
  if (!within || within.startsWith("..") || path.isAbsolute(within)) return null;
  return full;
}

/** Last-used time. Where Windows doesn't update last-access (the default on many volumes) atime just equals a past
 *  write, so a file can never read as used LESS recently than it was modified. `trusted` says whether to believe it. */
function usedAt(st) {
  return Math.max(Number(st.atimeMs) || 0, Number(st.mtimeMs) || 0);
}

/** Walk `dir` without following symlinks or junctions (a link out of the folder is not the member's to clean). */
async function scan(root, { cap = CAP, stopped = () => false, tick = () => {} } = {}) {
  const out = [];
  async function walk(dir, prefix) {
    let d;
    try { d = await fs.promises.opendir(dir); } catch { return; }
    for await (const e of d) {
      if (out.length >= cap || stopped()) return;
      if (e.isSymbolicLink()) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { await walk(full, `${prefix}${e.name}/`); continue; }
      if (!e.isFile()) continue;
      try {
        const st = await fs.promises.stat(full);
        out.push({ path: `${prefix}${e.name}`, size: st.size, used: usedAt(st), modified: st.mtimeMs });
        if (out.length % 200 === 0) tick(out);
      } catch { /* vanished or locked — skipped, not an error */ }
    }
  }
  await walk(path.resolve(root), "");
  return out;
}

function hashFile(full, bytes = Infinity, stopped = () => false) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash("sha256");
    const s = fs.createReadStream(full, bytes === Infinity ? {} : { start: 0, end: bytes - 1 });
    s.on("data", (c) => { if (stopped()) { s.destroy(); resolve(null); } else h.update(c); });
    s.on("error", reject);
    s.on("close", () => resolve(h.digest("hex")));
  });
}

/** Byte-identical files, found the cheap way first: same size, then same first 64KB, and only then a full hash.
 *  Returns groups of 2+ — {size, files:[rel…]} — and never a "probably the same". */
async function findDuplicates(root, files, { stopped = () => false, tick = () => {} } = {}) {
  const bySize = new Map();
  for (const f of files) if (f.size > 0) (bySize.get(f.size) || bySize.set(f.size, []).get(f.size)).push(f);
  const groups = [];
  let done = 0;
  for (const [size, same] of bySize) {
    if (stopped()) break;
    if (same.length < 2) continue;
    const heads = new Map();
    for (const f of same) {
      const full = resolveInside(root, f.path);
      if (!full) continue;
      try { const k = await hashFile(full, HEAD, stopped); if (k) (heads.get(k) || heads.set(k, []).get(k)).push(f); } catch { /* unreadable */ }
    }
    for (const cand of heads.values()) {
      if (cand.length < 2) continue;
      const wholes = new Map();
      for (const f of cand) {
        try { const k = await hashFile(resolveInside(root, f.path), Infinity, stopped); if (k) (wholes.get(k) || wholes.set(k, []).get(k)).push(f); } catch { /* unreadable */ }
      }
      for (const g of wholes.values()) if (g.length > 1) groups.push({ size, files: g.map((f) => f.path) });
    }
    done += same.length; tick(done);
  }
  return groups;
}

/** `fsutil behavior query disablelastaccess`: even = Windows records last access, odd = it does not. null = can't tell. */
function lastAccessTracked(output) {
  const m = /(?:Ntfs)?DisableLastAccess(?:Update)?\s*=\s*(\d+)/i.exec(String(output || ""));
  if (!m) return null;
  return Number(m[1]) % 2 === 0;   // 0 and 2 (and 0x80000000) record it; 1 and 3 (and 0x80000001) don't
}

module.exports = { CAP, resolveInside, usedAt, scan, findDuplicates, hashFile, lastAccessTracked };
