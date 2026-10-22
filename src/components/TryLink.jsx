// The free take, offered from a public page — the one door that gets a stranger a fact
// about THEMSELVES before asking for anything. Public profiles, playlists and battles
// only offered "Create your account", which asks first and gives nothing. The page's
// owner rides along as the referrer, the same as JoinLink, so a visitor who scores here
// and joins later still credits the member who brought them.
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { rememberPageOwner, storedRef } from "../referral.js";

export default function TryLink({ owner = "", app = "", className = "", children }) {
  useEffect(() => { rememberPageOwner(owner); }, [owner]);
  const ref = storedRef() || owner;
  const to = `/try${app ? `/${app}` : ""}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
  return <Link to={to} className={className}>{children || "🎤 Get your own take scored — free, no account"}</Link>;
}
