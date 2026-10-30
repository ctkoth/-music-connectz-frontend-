// What a pasted reel or video link will do in the coach, said BEFORE the press.
// Labelling only, from the host (the same rule as widgetz.js): the server decides,
// and its sentences — `links` from GET /api/<key>/coach/ — are what is shown.

import { hostOf } from "./widgetz.js";

const APPS = [["YouTube", ["youtube.com", "youtu.be"]], ["Instagram", ["instagram.com", "instagr.am"]],
              ["Facebook", ["facebook.com", "fb.watch", "fb.com"]], ["TikTok", ["tiktok.com"]],
              ["Snapchat", ["snapchat.com"]], ["Threads", ["threads.net"]]];

/** {state: "empty" | "ok" | "no", label, text} for a pasted link. */
export function coachLinkVerdict(url, links) {
  const raw = String(url || "").trim();
  if (!raw) return { state: "empty", label: "", text: "" };
  const host = hostOf(raw.includes("://") ? raw : `https://${raw}`);
  const hit = host && APPS.find(([, hs]) => hs.some((h) => host === h || host.endsWith(`.${h}`)));
  const row = hit && (links?.apps || []).find((a) => a.label === hit[0]);
  if (!hit) return { state: "no", label: "", text: "Paste a YouTube video or Short — or attach the file." };
  if (hit[0] === "YouTube") return { state: "ok", label: "YouTube", text: row?.note || links?.note || "" };
  return { state: "no", label: hit[0], text: row?.why || `The coach can't open ${hit[0]} links — attach the reel file instead.` };
}
