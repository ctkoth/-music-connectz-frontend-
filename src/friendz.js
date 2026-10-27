// The order FriendZ lists friends in. Pure, so it runs under plain node
// (friendz.test.mjs) — FriendZ.jsx imports App.jsx, which node cannot.
import { asList } from "./shape.js";

/** Partners first, then whoever is closest to being one, then the rest by name.
 *  `almost` is the server's [{username, works, needs}]; an older API sends none. */
export function arrange(friends, partners, almost) {
  const partner = new Set(asList(partners).map((m) => String(m).toLowerCase()));
  const close = new Map(asList(almost).map((a) => [String(a.username).toLowerCase(), a]));
  const rank = (m) => {
    const k = m.toLowerCase();
    if (partner.has(k)) return [0, 0];
    const a = close.get(k);
    return a ? [1, a.needs] : [2, 0];
  };
  return asList(friends)
    .map((m) => ({ name: m, partner: partner.has(m.toLowerCase()), almost: close.get(m.toLowerCase()) || null }))
    .sort((a, b) => {
      const [ra, na] = rank(a.name);
      const [rb, nb] = rank(b.name);
      return ra - rb || na - nb || a.name.localeCompare(b.name);
    });
}
