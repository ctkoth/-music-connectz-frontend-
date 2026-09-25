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

// Best-effort device detection so Landing and Register — which show ONE
// download tile, not a list — offer the build that actually installs on the
// visitor's device instead of defaulting to Windows for everyone, Android
// included. navigator.userAgent is spoofable; that's fine here, since the
// worst case is a visitor sees the "wrong" tile and the full list in SpecZ
// still has every option regardless of what this guesses.
export function detectPlatform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/windows/i.test(ua)) return "win";
  return "other";
}

// The single tile Landing/Register lead with. Android on an Android visitor,
// the Windows installer for everyone else (iOS/Mac/Linux have no build yet,
// so Windows stays the fallback rather than showing nothing).
export function recommendedBuild() {
  return BUILDS.find((b) => b.key === detectPlatform()) || WINDOWS_EXE;
}
