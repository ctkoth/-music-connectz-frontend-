// Clean ConnectZ's Windows file bridge: the desktop app's half. A web page can read a picked folder but not a file's
// real last-accessed time, can't find duplicates without reading everything into the tab, and can only delete for good.
// Here the main process does the reading and moves files to the Recycle Bin.
//
// The page never supplies a path. It gets a token for a folder the member chose in the OS dialog (granted here, in
// memory, for this run only), and refers to files by their path inside it; core.resolveInside refuses anything else.
const { ipcMain, dialog, shell, BrowserWindow } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const core = require("./files-core.cjs");

const grants = new Map();   // token -> absolute folder the member picked
let stop = false;
let access = undefined;     // cached: does Windows record last-access on this machine?

function tracked() {
  if (access !== undefined) return Promise.resolve(access);
  if (process.platform !== "win32") { access = true; return Promise.resolve(access); }
  return new Promise((res) => execFile("fsutil", ["behavior", "query", "disablelastaccess"], { windowsHide: true, timeout: 4000 },
    (err, out) => { access = err ? null : core.lastAccessTracked(out); res(access); }));
}

function setup() {
  ipcMain.handle("files:pick", async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const r = await dialog.showOpenDialog(win, { title: "Choose a folder to clean", properties: ["openDirectory"] });
    if (r.canceled || !r.filePaths[0]) return null;
    const token = crypto.randomBytes(12).toString("hex");
    grants.set(token, r.filePaths[0]);
    return { token, name: require("path").basename(r.filePaths[0]) || r.filePaths[0], lastAccess: await tracked() };
  });

  ipcMain.handle("files:scan", async (e, { token }) => {
    const root = grants.get(token);
    if (!root) return { error: "That folder isn't open any more — choose it again." };
    stop = false;
    const files = await core.scan(root, { stopped: () => stop, tick: (o) => e.sender.send("files:progress", { n: o.length }) });
    return stop ? { cancelled: true } : { files, capped: files.length >= core.CAP };
  });

  ipcMain.handle("files:dupes", async (e, { token, files }) => {
    const root = grants.get(token);
    if (!root) return { error: "That folder isn't open any more — choose it again." };
    stop = false;
    const list = Array.isArray(files) ? files.filter((f) => f && typeof f.path === "string" && Number.isFinite(f.size)) : [];
    const groups = await core.findDuplicates(root, list, { stopped: () => stop, tick: (n) => e.sender.send("files:progress", { n }) });
    return stop ? { cancelled: true } : { groups };
  });

  ipcMain.handle("files:cancel", () => { stop = true; });

  // Recycle Bin by default (recoverable; space is freed when it is emptied). `permanent` skips it.
  ipcMain.handle("files:remove", async (_e, { token, paths, permanent }) => {
    const root = grants.get(token);
    if (!root) return { error: "That folder isn't open any more — choose it again." };
    let ok = 0; const failed = [];
    for (const rel of Array.isArray(paths) ? paths.slice(0, core.CAP) : []) {
      const full = core.resolveInside(root, rel);
      if (!full) { failed.push({ path: String(rel), why: "outside the folder you chose" }); continue; }
      try {
        if (permanent) await fs.promises.rm(full, { force: false });
        else await shell.trashItem(full);
        ok++;
      } catch (err) { failed.push({ path: rel, why: err && err.code ? err.code : "couldn't be removed" }); }
    }
    return { ok, failed, recycled: !permanent };
  });
}

module.exports = { setup };
