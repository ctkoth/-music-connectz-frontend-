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

## Clean ConnectZ's file bridge (`window.mczFiles`)

`files.cjs` + `files-core.cjs`, exposed by `preload.cjs` to musicconnectz.net only. A web page can read a picked folder
but not a file's real last-accessed time, can't find duplicates without pulling every file into the tab, and can only
delete for good. The bridge adds all three:

- **The page never names a path.** `files:pick` opens the OS folder dialog and returns a token; every later call names
  files relative to that folder, and `resolveInside` refuses `..`, absolute paths and anything outside it. Tokens live in
  memory for the run.
- **Scan** skips symlinks/junctions, caps at 50,000 files and reports `used = max(atime, mtime)`. Windows often doesn't
  record last-access (a volume setting), so `fsutil behavior query disablelastaccess` is read and the screen says which
  date "used" really is.
- **Duplicates** are byte-identical only: same size, then same first 64 KB, then a full SHA-256. Empty files never count,
  and one copy (the oldest) is always kept, so a group can't be emptied.
- **Remove** goes to the Recycle Bin (`shell.trashItem`) by default; "skip the Bin" is an explicit tick. The screen says
  space comes back when the Bin is emptied.

Tested on Linux (`src/desktopFiles.test.mjs`). **Not yet run inside Electron on Windows**: `trashItem`, the folder dialog
and the `fsutil` read are the parts that need a real PC. Note `build.files` in `package.json` must list every `.cjs`
`main.cjs` requires, or the packaged app fails at launch (a test checks it).
