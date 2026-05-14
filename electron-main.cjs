/**
 * Music ConnectZ — Electron main process
 *
 * Wraps the React app as a desktop application for Windows/Mac/Linux.
 * Built React app served from `dist/` (Vite build output) or loaded from
 * `https://musicconnectz.net` in production for auto-updates.
 *
 * BUILD: npm run dist:electron  → outputs to release/ folder
 *   - Windows: Music ConnectZ Setup x.x.x.exe (NSIS installer)
 *   - macOS: Music ConnectZ-x.x.x.dmg
 *   - Linux: music-connectz_x.x.x_amd64.AppImage
 */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// Live URL vs local build — toggle via env var
const USE_PRODUCTION_URL = process.env.MCZ_USE_PROD === '1';
const APP_URL = USE_PRODUCTION_URL ? 'https://musicconnectz.net' : null;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Music ConnectZ',
    backgroundColor: '#0a0118',  // matches app theme
    titleBarStyle: 'hiddenInset',  // macOS frosted look
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/icons/logo.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load from live URL or local Vite build
  if (APP_URL) {
    mainWindow.loadURL(APP_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // External links open in default browser (not inside the app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Allow our domain to open in-app, everything else in browser
      const isOwnDomain = url.includes('musicconnectz.net') || url.includes('localhost');
      if (!isOwnDomain) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Hide menu bar on Windows/Linux but keep ctrl+shift+i for devtools
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security: prevent new window creation outside our control
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e, url) => {
    const isOwnDomain = url.includes('musicconnectz.net') || url.includes('localhost') || url.startsWith('file://');
    if (!isOwnDomain) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
});
