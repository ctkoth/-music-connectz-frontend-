// The desktop app's side of VST3: starts mcz-vsthost (the native host, desktop/vsthost) and turns the
// page's requests into its line protocol. Audio and plugin settings travel as bytes through temp files
// the host reads and writes, never through the page's own disk.
const { app, ipcMain } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

let host = null;
let queue = [];      // pending { resolve, reject } in order — the host answers one line per command
let buffer = "";

function hostPath() {
  const name = process.platform === "win32" ? "mcz-vsthost.exe" : "mcz-vsthost";
  const packed = path.join(process.resourcesPath || "", "vsthost", name);
  if (fs.existsSync(packed)) return packed;
  return path.join(__dirname, "vsthost", "bin", name);   // a dev run of `electron .`
}

function start() {
  if (host) return host;
  const exe = hostPath();
  if (!fs.existsSync(exe)) return null;
  host = spawn(exe, [], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
  host.stdout.setEncoding("utf8");
  host.stdout.on("data", (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      if (msg.ready) continue;
      const q = queue.shift();
      if (q) q.resolve(msg);
    }
  });
  const gone = () => { host = null; queue.splice(0).forEach((q) => q.resolve({ ok: false, error: "The plugin host stopped (a plugin may have crashed it). Try again." })); };
  host.on("exit", gone);
  host.on("error", gone);
  return host;
}

function ask(fields) {
  const h = start();
  if (!h) return Promise.resolve({ ok: false, error: "The VST host isn't installed with this copy of the app — update the Windows app." });
  // Tabs and newlines are the protocol's separators, so no field may carry one.
  const line = fields.map((f) => String(f ?? "-").replace(/[\t\r\n]/g, " ")).join("\t");
  return new Promise((resolve) => { queue.push({ resolve }); h.stdin.write(line + "\n"); });
}

const tmp = (ext) => path.join(os.tmpdir(), `mcz-vst-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
const writeB64 = (b64) => { if (!b64) return "-"; const f = tmp("state"); fs.writeFileSync(f, Buffer.from(b64, "base64")); return f; };
const readB64 = (f) => { try { return fs.readFileSync(f).toString("base64"); } catch { return ""; } finally { try { fs.unlinkSync(f); } catch { /* gone */ } } };
const drop = (...fs2) => fs2.forEach((f) => { if (f && f !== "-") try { fs.unlinkSync(f); } catch { /* gone */ } });

function setup() {
  ipcMain.handle("vst:scan", () => ask(["scan"]));
  ipcMain.handle("vst:params", (_e, { file, uid, state }) => { const s = writeB64(state); return ask(["params", file, uid, s]).finally(() => drop(s)); });
  ipcMain.handle("vst:render", async (_e, { file, uid, wav, state, params }) => {
    const inF = tmp("wav"), outF = tmp("wav"), sIn = writeB64(state), sOut = tmp("state");
    fs.writeFileSync(inF, Buffer.from(wav));
    const set = Object.entries(params || {}).map(([id, v]) => `${Number(id)}=${Number(v)}`).join(",");
    const r = await ask(["render", file, uid, inF, outF, sIn, sOut, set || "-"]);
    let out = null;
    if (r.ok) { try { out = fs.readFileSync(outF); } catch { /* reported below */ } }
    drop(inF, outF, sIn);
    return r.ok && out ? { ok: true, wav: out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), state: readB64(sOut), tail: r.tail } : { ok: false, error: r.error || "The render didn't come back." };
  });
  ipcMain.handle("vst:editor", async (_e, { file, uid, state }) => {
    const sIn = writeB64(state), sOut = tmp("state");
    const r = await ask(["editor", file, uid, sIn, sOut]);
    drop(sIn);
    return r.ok ? { ok: true, state: readB64(sOut) } : { ok: false, error: r.error };
  });
  app.on("before-quit", () => { try { host?.stdin.write("quit\n"); } catch { /* gone */ } });
}

module.exports = { setup };
