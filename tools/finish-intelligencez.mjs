// After `vite build --config vite.intelligencez.config.js`: lay the standalone
// overlay (manifest, icons, logo, assetlinks) over the copied main public/, and
// drop the files that describe the MAIN site and would be wrong on another host
// — its sitemap and its push service worker.
import fs from "node:fs";

const out = "dist-intelligencez";
fs.cpSync("standalone/intelligencez/public", out, { recursive: true });
for (const f of ["sitemap.xml", "sw.js", "og-card.png", "partners.html", "_redirects"]) {
  fs.rmSync(`${out}/${f}`, { force: true });
}
// Account, not catalogue: keep search engines off the sign-in screen's host
// until somebody decides this should be found.
fs.writeFileSync(`${out}/robots.txt`, "User-agent: *\nDisallow: /\n");
// The overlay's assetlinks.json is what Chrome checks this host against. The
// main site's own copy sits in the same path and would claim the wrong package,
// so say loudly if the overlay did not replace it.
const links = JSON.parse(fs.readFileSync(`${out}/.well-known/assetlinks.json`, "utf8"));
if (!links.some((l) => l?.target?.package_name === "net.musicconnectz.intelligencez")) {
  throw new Error("dist-intelligencez/.well-known/assetlinks.json does not name net.musicconnectz.intelligencez");
}
console.log("dist-intelligencez ready");
