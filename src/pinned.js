// Which post is pinned to my profile — read once, shared by every card, so a
// feed of 50 posts asks the server one time, not 50.
import { useEffect, useState } from "react";
import { api } from "./api.js";

let current;            // undefined = not loaded, null = nothing pinned
let loading = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f(current));

function load() {
  if (current !== undefined || loading) return;
  loading = api("/api/economy/profile/")
    .then((d) => { current = d?.pinned_post?.id ?? null; emit(); })
    .catch(() => { current = null; })
    .finally(() => { loading = null; });
}

export function usePinned() {
  const [id, setId] = useState(current ?? null);
  useEffect(() => { subs.add(setId); load(); return () => subs.delete(setId); }, []);
  return id;
}

/** Pin `postId` (or null to unpin). Throws the server's message on failure. */
export async function setPinned(postId) {
  await api("/api/economy/profile/", { method: "POST", body: { pinned_post_id: postId } });
  current = postId; emit();
}
