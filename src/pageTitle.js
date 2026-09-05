// The browser tab, and the half of a link preview that JavaScript can fix.
//
// `index.html` carries one fixed <title> and one og:image, so every address in
// this app — a member's profile, a scored take, a playlist — said
// "Music ConnectZ — AI Vocal & Rap Coach, Collabs, Paid Gigs" in the tab and
// in the preview. The thing being shared was the one thing not mentioned.
//
// This fixes the TAB, and Google, which renders JavaScript before it indexes.
// It cannot fix a social card: Facebook, X, LinkedIn, iMessage, WhatsApp,
// Discord and Slack all read the static HTML and none of them run JS — they
// have left before React starts. That half is `apps/economy/sharecard.py`,
// server-rendered, and it needs one rewrite in vercel.json to be reachable at
// the address people actually share.
//
// Restores the site title on unmount, because a stale title on the next page
// is worse than the generic one: it names something the reader is no longer
// looking at.
import { useEffect } from "react";

const SITE = "Music ConnectZ";
const DEFAULT_TITLE = "Music ConnectZ — AI Vocal & Rap Coach, Collabs, Paid Gigs";

function setMeta(attr, key, value) {
  if (!value) return null;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  const created = !tag;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  const previous = tag.getAttribute("content");
  tag.setAttribute("content", value);
  return { tag, previous, created };
}

/**
 * Name this page after what is on it.
 *
 * @param title  the page's own name — "K-Oth", "Night Drive". The site name is
 *               appended here so no caller has to remember to.
 * @param description  one sentence about this page, for the tab's preview.
 */
export function usePageTitle(title, description) {
  useEffect(() => {
    if (!title) return undefined;
    const before = document.title;
    document.title = `${title} — ${SITE}`;
    const touched = [
      setMeta("name", "description", description),
      setMeta("property", "og:title", `${title} — ${SITE}`),
      setMeta("property", "og:description", description),
    ].filter(Boolean);
    return () => {
      document.title = before || DEFAULT_TITLE;
      for (const t of touched) {
        if (t.created) t.tag.remove();
        else if (t.previous !== null) t.tag.setAttribute("content", t.previous);
      }
    };
  }, [title, description]);
}
