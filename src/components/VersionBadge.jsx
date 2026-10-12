import { useEffect, useState } from "react";
import { api } from "../api.js";
import { VERSION, versionLabel } from "../version.js";

// The running version, small, wherever a member would look to answer "do I have the
// newest one?" — the ToolZ footer and the policy links of every standalone app.
//
// Two facts, because the app and the server deploy separately: this bundle's own
// build, and the server's commit (/api/economy/version/). The title says what the
// parts mean, since "a1b2c3d" alone is just noise. A failed server lookup shows only
// the app's half — never a made-up server version.
export default function VersionBadge({ className = "" }) {
  const [server, setServer] = useState("");
  useEffect(() => {
    let dead = false;
    api("/api/economy/version/", { auth: false })
      .then((d) => { if (!dead && d?.commit) setServer(d.commit); })
      .catch(() => {});
    return () => { dead = true; };
  }, []);
  const app = VERSION.commit === "dev"
    ? "A development build."
    : `App version ${VERSION.version}${VERSION.build ? `, build ${VERSION.build}` : ""}, built from commit ${VERSION.commit}${VERSION.built ? ` on ${VERSION.built}` : ""}.`;
  const title = server ? `${app} Server build: commit ${server}.` : app;
  return (
    <span className={`font-mono text-[11px] text-white/40 ${className}`} title={title}>
      {versionLabel()}{server && server !== "dev" ? ` · server ${server}` : ""}
    </span>
  );
}
