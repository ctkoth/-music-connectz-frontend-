/* global __MCZ_VERSION__ */
// The version of THIS bundle, and the decision about whether a newer one exists.
// Pure on purpose (no DOM, no import.meta.env): it runs under plain node in
// version.test.mjs.
//
// `__MCZ_VERSION__` is injected by vite.version.mjs at build time. In `vite dev`
// and under node it is undefined, and the answer is an honest "dev" rather than
// a made-up number.

const injected = typeof __MCZ_VERSION__ !== "undefined" ? __MCZ_VERSION__ : null;

export const VERSION = injected || { version: "dev", build: null, commit: "dev", built: "" };

/** "v0.59.0 · a1b2c3d" — or "v0.59.0 · build 412 · a1b2c3d" when the clone had full history. */
export function versionLabel(v = VERSION) {
  if (!v || v.commit === "dev") return "dev build";
  return ["v" + v.version, v.build ? `build ${v.build}` : null, v.commit].filter(Boolean).join(" · ");
}

/**
 * Is the deployed build different from the one running? Compared by COMMIT, not
 * by semver: a deploy that did not bump the package version is still a newer
 * program. Returns null when there is nothing trustworthy to compare (a dev
 * build, a response that is not a version document — the SPA fallback answers
 * /version.json with index.html on a host that lacks the file — or the same
 * commit), so the screen says nothing rather than guessing.
 */
export function newerBuild(running, remote) {
  if (!running || running.commit === "dev") return null;
  if (!remote || typeof remote !== "object") return null;
  if (typeof remote.commit !== "string" || !/^[0-9a-f]{7}$/.test(remote.commit)) return null;
  if (remote.commit === running.commit) return null;
  return remote;
}
