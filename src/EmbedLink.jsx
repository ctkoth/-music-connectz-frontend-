// One link on a post, rendered the way its platform deserves: an inline
// player for the platforms that publish an embeddable one (SoundCloud,
// Spotify, YouTube, Apple Music) so a track gets played, rated and commented
// on right here instead of just linked away from — everything else falls
// back to a plain link.
//
// The plain-link path calls apps/economy/links.py's click endpoint, which
// existed with a real +5⚡ genuine-visit reward and a Safe Browsing scan but
// had no caller anywhere in the mounted app — a click on a member's link
// paid nobody and never got scanned in practice.
import { useEffect, useRef, useState } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { api } from "./api.js";
import { serviceFor } from "./socialServices.jsx";

/** The iframe src for a platform that publishes one, given the member's
 * own share link — or null when this platform has no simple embed (the
 * link still renders, just not inline). */
function embedSrcFor(service, url) {
  try {
    const u = new URL(url);
    if (service === "soundcloud") {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&show_comments=false&show_user=true&visual=false`;
    }
    if (service === "spotify") {
      const parts = u.pathname.split("/").filter(Boolean); // [type, id]
      if (parts.length < 2) return null;
      return `https://open.spotify.com/embed/${parts.join("/")}`;
    }
    if (service === "youtube") {
      let id = u.searchParams.get("v");
      if (!id && u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
      if (!id && u.pathname.startsWith("/embed/")) id = u.pathname.slice(7);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (service === "apple_music") {
      return url.replace("music.apple.com", "embed.music.apple.com");
    }
    return null;
  } catch {
    return null;
  }
}

const EMBED_HEIGHT = { soundcloud: 166, spotify: 152, youtube: 200, apple_music: 175 };

/** A plain link that reports a genuine visit for the +5⚡ click reward and a
 * best-effort safety scan — dwell-timed the same way SHARE tracking already
 * is elsewhere in this app (active seconds, not just a click). */
function PlainLink({ url, label, owner }) {
  const [flag, setFlag] = useState(null); // {safe, threat} once scanned
  const start = useRef(null);
  const sent = useRef(false);

  function onEnter() { start.current = Date.now(); }
  function report() {
    if (sent.current || !start.current) return;
    sent.current = true;
    const active = Math.round((Date.now() - start.current) / 1000);
    api("/api/economy/link/click/", { method: "POST", body: { url, owner, active_seconds: active } })
      .then((r) => setFlag({ safe: r.safe, threat: r.threat }))
      .catch(() => {});
  }
  useEffect(() => () => report(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <a href={url} target="_blank" rel="noreferrer"
       onMouseDown={onEnter} onClick={report}
       className="flex items-center gap-1.5 text-[12px] text-mcz-cyan hover:underline">
      <ExternalLink size={12} /> {label}
      {flag && !flag.safe && (
        <span className="flex items-center gap-0.5 text-mcz-ember" title={`Flagged: ${flag.threat}`}>
          <ShieldAlert size={11} /> flagged
        </span>
      )}
    </a>
  );
}

/** `link` = {url, label, service}. `owner` = the post/profile author's
 * username, so a click-through can credit the right person. */
export default function EmbedLink({ link, owner }) {
  const svc = serviceFor(link.service);
  const src = embedSrcFor(link.service, link.url);
  if (!src) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <svc.Icon size={14} color={svc.color} />
        <PlainLink url={link.url} label={link.label || svc.label} owner={owner} />
      </div>
    );
  }
  return (
    <iframe
      title={link.label || svc.label}
      src={src}
      className="mt-3 w-full rounded-lg border-0"
      height={EMBED_HEIGHT[link.service] || 180}
      allow="autoplay; encrypted-media"
      loading="lazy"
    />
  );
}
