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
  const hint = navigator.userAgentData?.platform || "";
  if (/android/i.test(ua) || /android/i.test(hint)) return "android";
  // Chrome's "Desktop site" on Android reports a Linux PC. A finger as the
  // PRIMARY pointer (the same test useScreenShape.js uses) is that phone; a
  // touchscreen Linux laptop still has a mouse as its primary pointer.
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (/linux/i.test(ua) && !/CrOS/.test(ua) && navigator.maxTouchPoints > 0 && coarse) return "android";
  if (/windows/i.test(ua) || /windows/i.test(hint)) return "win";
  return "other";
}

// The single tile Landing/Register lead with. Android on an Android visitor,
// the Windows installer for everyone else (iOS/Mac/Linux have no build yet,
// so Windows stays the fallback rather than showing nothing).
export function recommendedBuild() {
  return BUILDS.find((b) => b.key === detectPlatform()) || WINDOWS_EXE;
}

// When the device couldn't be identified the Windows tile is only a guess,
// so the Android build rides beside it rather than being hidden. An
// identified Android or Windows visitor sees exactly one build.
export function alternateBuild() {
  return detectPlatform() === "other" ? BUILDS.find((b) => b.key === "android") : null;
}
