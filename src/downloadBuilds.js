// Where the installed builds actually live — one place, so every screen that
// offers a download (SpecZ, the logged-out homepage) points at the same URL
// and can't drift apart.
//
// Both are built by CI on every push to main that touches `desktop/**` or
// `android/**` and published to a fixed release tag, so these links never go
// stale and never need a version in them.
const REPO = "https://github.com/ctkoth/-music-connectz-frontend-/releases/download";

export const BUILDS = [
  { key: "win", emoji: "🪟", label: "Windows installer (.exe)",
    href: `${REPO}/exe-latest/MusicConnectZ-Setup.exe`,
    note: "Puts Music ConnectZ on your desktop and in the Start menu." },
  { key: "win-portable", emoji: "🥾", label: "Windows, portable (.exe)",
    href: `${REPO}/exe-latest/MusicConnectZ.exe`,
    note: "One file, installs nothing — run it from anywhere." },
  { key: "android", emoji: "🤖", label: "Android (.apk)",
    href: `${REPO}/apk-latest/MusicConnectZ.apk`,
    note: "Sideload build. Play Store release is separate." },
];

export const WINDOWS_EXE = BUILDS[0];
