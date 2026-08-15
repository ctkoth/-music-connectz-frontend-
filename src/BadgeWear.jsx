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
import { CUSTOM_ICONS, IconImg } from "./App.jsx";
import { asList } from "./shape.js";

export function Medal({ badge, className = "h-12 w-12" }) {
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
export function BadgeWear({ badges, title, size = "h-7 w-7", onOpen, className = "" }) {
  const list = asList(badges);
  if (!title && list.length === 0) return null;
  const Tag = onOpen ? "button" : "span";
  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {title && (
        <span className="pill !text-mcz-gold" title="The title this member wears">
          {title}
        </span>
      )}
      {list.map((b) => (
        <Tag key={b.key} title={badgeTip(b)}
             {...(onOpen ? { type: "button", onClick: () => onOpen(b) } : {})}
             className={`flex items-center ${onOpen ? "hover:brightness-125" : ""}`}>
          <Medal badge={b} className={size} />
        </Tag>
      ))}
    </span>
  );
}

/** The same strip with the effect spelled out, for cards with room for it. */
export function BadgeWearList({ badges, title }) {
  const list = asList(badges);
  if (!title && list.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        BadgeZ
      </p>
      {title && <p className="text-[13px] font-semibold text-mcz-gold">{title}</p>}
      <ul className="space-y-1.5">
        {list.map((b) => (
          <li key={b.key} className="flex items-start gap-2">
            <Medal badge={b} className="h-7 w-7" />
            <span className="min-w-0 text-[11px]">
              <span className="text-white/75">{b.name}</span>
              {b.temporary && (
                <span className="ml-1.5 text-[10px] text-mcz-gold">while they hold it</span>
              )}
              {/* The effect where the server sent one; how it's earned where
                  it didn't. Never an empty line pretending to be a fact. */}
              <span className="block leading-relaxed text-emerald-300/80">
                {b.effect_note || b.how}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
