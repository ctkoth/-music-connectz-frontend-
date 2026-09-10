// A member's name, everywhere it appears in a list, with somewhere to go.
//
// A name that is only text is the dead end the cross-pollination rule exists to
// close: the screen tells you WHO, and gives you nothing to do about it. The
// members list rendered `@Steve515` as a row you could not act on, and the two
// things anyone wants there — look at them, say something to them — were both
// a tab switch and a retyped username away.
//
// So one component, because a name rendered five ways drifts five ways:
//
//   * the NAME opens their profile (the same `goToProfile` an @mention uses,
//     so a name in a list and a name in a sentence land in the same place);
//   * the MESSAGE button hands MessageZ the recipient rather than dumping the
//     member on an empty compose form — `onHandoff("messagez")` already fills
//     `to` from `people`, so this is the handoff it was built for;
//   * NEITHER appears against your own name. "Message yourself" is a control
//     that can only disappoint, and your own profile is one tap away already.
//
// Deliberately not used for @mentions inside prose: a button growing out of a
// sentence is noise. `MentionParser` keeps the plain link.
import { MessageCircle } from "lucide-react";
import { useAuth } from "./auth/AuthContext.jsx";
import { useMentionHandlers } from "./MentionParser.jsx";
import { handOff } from "./handoff.js";

export default function MemberName({
  username,
  className = "",
  // Some rows already sit inside their own button or link. `bare` renders just
  // the name and the action, with no row chrome of its own.
  bare = false,
  // What a caller wants to happen instead of navigating — the members modal
  // closes itself, for instance. Runs BEFORE the jump.
  onOpen,
  children,
}) {
  const { user } = useAuth();
  const { goToProfile } = useMentionHandlers();
  if (!username) return null;

  const mine = user?.username && user.username.toLowerCase() === String(username).toLowerCase();

  const open = () => {
    onOpen?.(username);
    goToProfile(username);
  };

  const message = (e) => {
    // The row is usually clickable too; without this, messaging also navigates.
    e.stopPropagation();
    onOpen?.(username);
    handOff("messagez", "messagez-compose", { people: [username] });
  };

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={open}
        className="min-w-0 truncate font-semibold text-mcz-cyan transition hover:underline active:scale-95"
        title={mine ? "Your profile" : `View @${username}'s profile`}
      >
        {children || `@${username}`}
      </button>

      {!mine && (
        <button
          type="button"
          onClick={message}
          // Small on purpose: it sits beside a name in a list, and a button the
          // size of the name competes with it.
          className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] p-1 text-white/45 transition hover:border-mcz-cyan/40 hover:text-mcz-cyan active:scale-95"
          title={`Message @${username}`}
          aria-label={`Message @${username}`}
        >
          <MessageCircle size={12} />
        </button>
      )}

      {mine && !bare && (
        <span className="shrink-0 text-[10px] text-white/25">you</span>
      )}
    </span>
  );
}
