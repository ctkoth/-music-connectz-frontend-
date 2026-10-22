// "Join free", with what joining is worth said on the button and the referral carried
// in the link. Every public page used a bare <Link to="/register">, so a visitor who
// joined from a member's page credited nobody and was never told the welcome bonus —
// the gain half of the cost/gain rule, missing at the one moment it decides anything.
// The numbers are the server's (/api/economy/tiers/ `join`); none renders if it didn't load.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ENERGY, SPINAZ } from "../resources.js";
import { rememberPageOwner, storedRef } from "../referral.js";

let joinCache = null;
let joinAsk = null;
function useJoin() {
  const [join, setJoin] = useState(joinCache);
  useEffect(() => {
    if (joinCache) return undefined;
    let on = true;
    joinAsk = joinAsk || api("/api/economy/tiers/", { auth: false }).then((d) => (joinCache = d?.join || null)).catch(() => null);
    joinAsk.then((j) => on && setJoin(j));
    return () => { on = false; };
  }, []);
  return join;
}

/** `owner` is the page's member: remembered as the referrer (first page wins) and sent
 *  on the link. `invite` adds the two-sided line under the button. */
export default function JoinLink({ owner = "", className = "", children = "Join free", invite = false }) {
  const join = useJoin();
  useEffect(() => { rememberPageOwner(owner); }, [owner]);
  const ref = storedRef() || owner;
  const to = ref ? `/register?ref=${encodeURIComponent(ref)}` : "/register";
  const gain = join?.welcome_spinaz > 0
    ? ` · +${join.welcome_spinaz} ${SPINAZ}${join.welcome_energy > 0 ? ` +${join.welcome_energy} ${ENERGY}` : ""}` : "";
  return (
    <>
      <Link to={to} className={className}>{children}{gain}</Link>
      {invite && ref && join?.joinee_spinaz > 0 && (
        <p className="mt-2 text-[12px] text-white/55">
          Joining through @{ref}'s invite: <span className="text-emerald-300">+{join.joinee_spinaz} {SPINAZ}</span> for you,{" "}
          <span className="text-emerald-300">+{join.referrer_spinaz} {SPINAZ}</span> for them.
        </p>
      )}
    </>
  );
}
