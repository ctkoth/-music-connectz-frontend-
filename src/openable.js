// Every tab has an address. This is what makes the address usable.
//
// LogicZ gave every app its own URL — /post, /battle, /sing — so a tab could
// be linked, bookmarked and pasted to somebody. But the navigation itself was
// built out of <button onClick>, and a button has no href: ctrl-click,
// cmd-click, middle-click and right-click → "Open link in new tab" all did
// NOTHING. The address existed and there was no way to open it in a second
// tab short of typing it out by hand.
//
// `openable()` returns the props that fix that. Spread it onto an <a> and the
// element becomes a real link — the browser's own new-tab and new-window
// behaviour comes back for free, including middle-click, which never fires a
// click handler at all and so could never have been shimmed in JavaScript.
// A plain left click is the only one intercepted, and that stays in the SPA.

/**
 * @param {string} href  the tab's address, e.g. `/post`
 * @param {() => void} onActivate  what a plain left-click should do instead
 */
export function openable(href, onActivate) {
  return {
    href,
    onClick: (e) => {
      // Anything the member could mean as "open this somewhere else" is left
      // to the browser: a modifier key, or any button that isn't the primary
      // one. Only the plain click belongs to us.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      e.preventDefault();
      onActivate?.();
    },
  };
}
