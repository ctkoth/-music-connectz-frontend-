// Which build this is — computed once at build time, shared by every Vite config.
//
// A member on a tab opened last week and a member on today's deploy are on
// different programs that look identical. This puts a number on that: the
// package version, the commit it was built from, and the date, shown in the app
// and written to /version.json so a running tab can ask "is there a newer one?"
// (src/components/UpdateNotice.jsx) instead of finding out when a lazy chunk
// 404s (see chunkError.js).
//
// The commit is read from the host's own variable first (Vercel, Cloudflare
// Pages, GitHub Actions) because those build from a SHALLOW clone where
// `git rev-list --count` is a lie; the build number is only reported when the
// clone is full, and is otherwise left out rather than invented.
import { execSync } from "node:child_process";
import fs from "node:fs";

const git = (cmd) => {
  try { return execSync(`git ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return ""; }
};

export function versionInfo() {
  const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA
    || process.env.GITHUB_SHA || git("rev-parse HEAD")).slice(0, 7);
  const shallow = git("rev-parse --is-shallow-repository") !== "false";
  const count = shallow ? "" : git("rev-list --count HEAD");
  return {
    version: pkg.version,
    build: count ? Number(count) : null,
    commit: sha || "dev",
    built: new Date().toISOString().slice(0, 10),
  };
}

// Emits version.json beside the bundle: the same object the app was built with.
export function versionPlugin(info = versionInfo()) {
  return {
    name: "mcz-version",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(info) });
    },
  };
}
