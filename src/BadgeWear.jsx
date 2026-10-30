// Wearing the badge — the strip that sits on a profile.
//
// BadgeZ is the screen where a badge is explained, switched and gone after.
// This is where a badge does its actual job: telling the room something true
// about a member before they have said a word. A badge that only ever appears
// on the screen you visit to read about badges is a database row with artwork.
//
// Three things this component is careful about:
//
//   * The effect rides along. Every medal's tooltip names what the badge pays,
//     because the whole standard the catalogue is held to is that a badge
//     changes a number — and the person looking at somebody else's card is
//     exactly who is deciding whether one is worth going after.
//   * The server decides what is shown. These lists arrive already filtered to
//     the badges their holder chose to show; nothing here re-derives that, so
//     there is no second place for the privacy switch to be got wrong.
//   * The public card has no effect line, on purpose. `public_badge_chip`
//     leaves `effect_note` off for logged-out visitors, so the tooltip falls
//     back to how the badge is come by — which is the part a stranger came to
//     find out anyway.
import { lazy, Suspense, useState } from "react";
import { CUSTOM_ICONS, IconImg } from "./App.jsx";
import { asList } from "./shape.js";

// The sheet a medal opens (who else wears it). Lazy, so a card that is never
// tapped never loads it.
const BadgeHolders = lazy(() => import("./components/BadgeHolders.jsx"));

/** A medal opens the sheet of everybody wearing that badge, unless the caller
 *  sends it somewhere else (`onOpen`) or there is nobody signed in to ask
 *  (`holders={false}` on the logged-out public profile). */
function useHolders(onOpen, holders) {
  const [open, setOpen] = useState("");
  const handler = onOpen || (holders ? (b) => setOpen(b.key) : null);
  const sheet = open ? (
    <Suspense fallback={null}><BadgeHolders badgeKey={open} onClose={() => setOpen("")} /></Suspense>
  ) : null;
  return [handler, sheet];
}

export function Medal({ badge, className = "h-16 w-16" }) {
  // The registry guard matters: a badge naming art the frontend hasn't shipped
  // would render the MCZ logo, which says nothing. The emoji says everything.
  return CUSTOM_ICONS[badge.icon] ? (
    <IconImg icon={badge.icon} alt=""
             className={`${className} shrink-0 rounded-full object-cover shadow-neon`}
             fallback={<span className="text-2xl">{badge.emoji}</span>} />
  ) : (
    <span className={`${className} flex shrink-0 items-center justify-center text-2xl`}>
      {badge.emoji}
    </span>
  );
}

/** What one medal says when you rest on it: the badge, then what it does. */
export const badgeTip = (b) =>
  [b.name, b.effect_note || b.how || b.desc].filter(Boolean).join(" — ");

/** The worn strip: the title a member chose, then the badges they show.
 *
 * `onOpen` makes the medals a door — cross-pollination, so a badge seen on a
 * card is somewhere you can go rather than a fact with nowhere to take it.
 * Left off, the strip is read-only and the tooltip carries the meaning.
 */
export function BadgeWear({ badges, title, size = "h-10 w-10", onOpen, holders = true, className = "" }) {
  const list = asList(badges);
  const [open, sheet] = useHolders(onOpen, holders);
  if (!title && list.length === 0) return null;
  const Tag = open ? "button" : "span";
  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {title && (
        <span className="pill !text-mcz-gold" title="The title this member wears">
          {title}
        </span>
      )}
      {list.map((b) => (
        <Tag key={b.key} title={badgeTip(b)}
             {...(open ? { type: "button", onClick: () => open(b) } : {})}
             className={`flex items-center ${open ? "hover:brightness-125" : ""}`}>
          <Medal badge={b} className={size} />
        </Tag>
      ))}
      {sheet}
    </span>
  );
}

/** The same strip with the effect spelled out, for cards with room for it. */
export function BadgeWearList({ badges, title, holders = true, mine = false }) {
  const list = asList(badges);
  const [open, sheet] = useHolders(null, holders);
  if (!title && list.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        BadgeZ
      </p>
      {title && <p className="text-[13px] font-semibold text-mcz-gold">{title}</p>}
      <ul className="space-y-1.5">
        {list.map((b) => (
          <li key={b.key} className={`flex items-start gap-2 ${open ? "cursor-pointer rounded-lg hover:bg-white/5" : ""}`}
              {...(open ? { role: "button", tabIndex: 0, title: "See who else wears it",
                            onClick: () => open(b), onKeyDown: (e) => e.key === "Enter" && open(b) } : {})}>
            <Medal badge={b} className="h-9 w-9" />
            {/* Title, how it is earned, what it does — all three on the page,
                no hover and no tap (Corey). The effect line is absent on a
                stranger's public card by the server's choice, never empty. */}
            <span className="min-w-0 text-[11px] leading-relaxed">
              <span className="font-semibold text-white/85">{b.name}</span>
              {b.temporary && (
                <span className="ml-1.5 text-[10px] text-mcz-gold">while {mine ? "you hold" : "they hold"} it</span>
              )}
              {b.desc && <span className="block text-white/60">{b.desc}</span>}
              {b.how && <span className="block text-white/55"><b className="font-semibold text-white/70">Earned:</b> {b.how}</span>}
              {b.effect_note && (
                <span className="block text-emerald-300/85"><b className="font-semibold">Does:</b> {b.effect_note}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {sheet}
    </div>
  );
}
