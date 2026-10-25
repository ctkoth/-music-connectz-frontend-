import { useState } from "react";
import { api } from "../api.js";

// "I made this myself." The card a member shares says so only if THEY say so — a
// declaration, not a detection (nothing here can hear whether audio is
// AI-generated), and it is worded that way on the card too. It is the human half of
// the promotion: people share a score because a real person earned it.
//
// `token` is the share token ("/s/<token>" → "<token>"). The choice is sent before
// the link is shared, so the card the follower opens already carries it.
export const tokenOf = (url) => String(url || "").replace(/^\/?s\//, "");

export async function declareHuman(url, declared) {
  const token = tokenOf(url);
  if (!token) return;
  await api(`/api/economy/scores/${encodeURIComponent(token)}/human/`, { method: "POST", body: { declared } });
}

export default function DeclareHuman({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-white/60">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        I made this myself — my own performance, no AI-generated vocals or audio.
        <span className="block text-white/40">
          Your card then says "Human-made — declared by you". It's your word, so it only goes on if you tick it.
        </span>
      </span>
    </label>
  );
}

// "Let people hear it." The card is public by link, so the recording reaching it is
// the member's choice per card — never a default — and only possible when the take's
// recording was kept. The server refuses (with the reason) when there is nothing to play.
export async function playOnCard(url, play) {
  const token = tokenOf(url);
  if (!token) return null;
  return api(`/api/economy/scores/${encodeURIComponent(token)}/media/`, { method: "POST", body: { play } });
}

export function PlayOnCard({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-white/60">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Let people hear it — the card plays your recording.
        <span className="block text-white/40">
          Anyone with the link can play it. Untick and share again to take it off the card.
        </span>
      </span>
    </label>
  );
}
