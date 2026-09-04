# Music ConnectZ on the desktop

A thin Electron shell around the live site — the same approach `capacitor.config.json`
takes on Android, and for the same reason: the desktop app is always whatever
production is serving, so it can never be a version behind the web app it mirrors.
There is nothing to keep in sync and nothing to re-ship when the frontend deploys.

## What you get

Two Windows builds, from the same code:

| Command | Output | What it does |
|---|---|---|
| `npm run dist` | `dist/MusicConnectZ-Setup.exe` | Installer. Puts **Music ConnectZ** on the desktop and in the Start menu, and appears in Add/Remove Programs. |
| `npm run dist:portable` | `dist/MusicConnectZ.exe` | One file. Runs from wherever it is — a USB stick, the Downloads folder — and installs nothing. |

The desktop shortcut is `"createDesktopShortcut": "always"` rather than the
default, which is `true`-ish and can be skipped by the installer's own logic.
"Always" is the setting that means the icon is on the desktop when the installer
closes, which is the whole point of shipping an installer rather than a zip.

## You do not have to build it

`.github/workflows/windows-exe.yml` already does, on a Windows runner, on every
push to `main` that touches `desktop/**` — and publishes both files to the
`exe-latest` GitHub Release, which is what OnboardZ's "Download for Windows"
button points at. So the shipping route for a change in here is the same as for
everything else in this repo: merge to `main`.

The build has to run **on Windows**; electron-builder needs the platform's own
NSIS toolchain, and a Linux box cannot produce the installer. That is the whole
reason the workflow exists rather than a local script somebody has to remember.

To build one by hand on a Windows machine:

```bash
cd desktop
npm install
npm run dist            # → dist/MusicConnectZ-Setup.exe
npm run dist:portable   # → dist/MusicConnectZ.exe
```

`npm start` runs it locally on any platform without building anything, which is
the fast way to check a change to `main.cjs`.

## The icon

`build/icon.png` is what both builds use. electron-builder wants **at least
256×256** — below that it refuses the build rather than shipping a blurry
shortcut, which is the correct trade and worth knowing before a release.

## Unsigned builds

Neither output is code-signed, so Windows SmartScreen shows "unrecognised app"
on first run — **More info → Run anyway**. Signing needs a paid certificate;
until there is one, say this in the download copy rather than letting members
discover it at the warning, which is the same rule the rest of this app follows
about prices.
