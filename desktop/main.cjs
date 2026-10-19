// Music ConnectZ desktop — a thin Electron shell that loads the live site
// (mirrors the Capacitor `server.url` approach), so the desktop app always
// matches production. External links open in the system browser.
//
// Sign-in: Google treats Electron as an embedded browser and refuses it, and
// a popup opened here goes to the system browser with nothing to report back
// to. So every provider runs in the SYSTEM browser and comes back through the
// net.musicconnectz.app:// protocol registered below — the Windows twin of
// the Android deep link (src/externalAuth.js has the whole round trip). The
// "MCZDesktop/2" UA marker is how the page knows this build can take a
// sign-in back; an older .exe without it keeps the in-window behaviour.
const { app, BrowserWindow, shell } = require("electron");

const SITE = "https://musicconnectz.net";
const SCHEME = "net.musicconnectz.app";
let win = null;

// A sign-in link handed to us by Windows: net.musicconnectz.app://oauth/callback?...
function openCallback(link) {
  if (!link || !win) return;
  let u;
  try { u = new URL(link); } catch { return; }
  if (u.protocol !== `${SCHEME}:` || u.host !== "oauth") return;
  // Only the query crosses over; it lands on the site's own callback page,
  // where the state check (against this window's sessionStorage) runs.
  win.loadURL(`${SITE}/oauth/callback${u.search}`);
  if (win.isMinimized()) win.restore();
  win.focus();
}
const linkIn = (argv) => (argv || []).find((a) => typeof a === "string" && a.startsWith(`${SCHEME}://`));

if (!app.requestSingleInstanceLock()) {
  // The system browser launched a second copy to deliver the link; the first
  // copy receives it in "second-instance" and this one leaves.
  app.quit();
} else {
  app.setAsDefaultProtocolClient(SCHEME);

  app.on("second-instance", (_e, argv) => openCallback(linkIn(argv)));

  function createWindow() {
    win = new BrowserWindow({
      width: 1280,
      height: 860,
      backgroundColor: "#07060d",
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    win.webContents.setUserAgent(`${win.webContents.getUserAgent()} MCZDesktop/2`);
    win.loadURL(SITE);
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    // Launched BY a sign-in link (the app was closed when the browser finished).
    const first = linkIn(process.argv);
    if (first) win.webContents.once("did-finish-load", () => openCallback(first));
  }

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
