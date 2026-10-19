// After `vite build --config vite.bodiez.config.js`: lay the standalone
// overlay (manifest, icons, logo) over the copied main public/, and drop the
// files that describe the MAIN site and would be wrong on another host — its
// sitemap and its push service worker.
import fs from "node:fs";

const out = "dist-bodiez";
fs.cpSync("standalone/bodiez/public", out, { recursive: true });
for (const f of ["sitemap.xml", "sw.js", "og-card.png", "partners.html", "_redirects"]) {
  fs.rmSync(`${out}/${f}`, { force: true });
}
// Account, not catalogue: keep search engines off the sign-in screen's host
// until somebody decides this should be found.
fs.writeFileSync(`${out}/robots.txt`, "User-agent: *\nDisallow: /\n");
console.log("dist-bodiez ready");
