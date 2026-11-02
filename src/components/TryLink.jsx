// The free take, offered from a public page — the one door that gets a stranger a fact
// about THEMSELVES before asking for anything. Public profiles, playlists and battles
// only offered "Create your account", which asks first and gives nothing. The page's
// owner rides along as the referrer, the same as JoinLink, so a visitor who scores here
// and joins later still credits the member who brought them.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { rememberPageOwner, storedRef } from "../referral.js";
import { doorForSkill } from "../trialSkill.js";

// The server's door list, asked once per page load and only by a link that has a skill to match.
let doorsAsked = null;
const loadDoors = () => (doorsAsked ||= api("/api/economy/trialdoorz/", { auth: false }).then((d) => d?.doors || []).catch(() => []));

// `app` names the coach outright; `skill` (a name or a list of names) lets the page say "guitar" and
// the server's door list decide whether that is a coach. Neither → the visitor picks.
export default function TryLink({ owner = "", app = "", skill = "", className = "", children }) {
  const [matched, setMatched] = useState("");
  useEffect(() => { rememberPageOwner(owner); }, [owner]);
  const wanted = app ? "" : JSON.stringify(skill || "");
  useEffect(() => {
    if (!wanted || wanted === '""') return undefined;
    let on = true;
    loadDoors().then((doors) => on && setMatched(doorForSkill(JSON.parse(wanted), doors)));
    return () => { on = false; };
  }, [wanted]);
  const ref = storedRef() || owner;
  const door = app || matched;
  const to = `/try${door ? `/${door}` : ""}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
  return <Link to={to} className={className}>{children || "🎤 Get your own take scored — free, no account"}</Link>;
}
