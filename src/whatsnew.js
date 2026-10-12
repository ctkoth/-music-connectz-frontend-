// What changed, in plain words, newest first. Shown in the update banner so a member
// deciding whether to reload can see what they'd get. Each entry is a release (the
// package.json version it shipped under); `items` are sentences about what a member
// can now do or what stopped being wrong — never a commit message.
export const WHATS_NEW = [
  // { version: "0.60.0", items: ["…"] },
];

// Entries newer than `running` (semver compare by numeric parts), for the banner.
export function entriesSince(running) {
  const parts = (v) => String(v).split(".").map((n) => parseInt(n, 10) || 0);
  const newer = (a, b) => {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
    }
    return false;
  };
  if (running === "dev") return [];
  return WHATS_NEW.filter((e) => newer(e.version, running));
}
