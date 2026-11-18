// Is this phone showing the DESKTOP version of the site?
//
// A member sent screenshots of BodieZ cut off on the right with the page panned sideways. Every tab fits a phone
// (the width audit checks them at 320-412px with normal and enlarged text), and the screenshots showed the header's
// previous/next arrows — which only appear at 640px and up. So the browser had laid the page out at desktop width
// ("Desktop site" in Chrome, "Desktop version" in Samsung Internet) and the member had zoomed in on a slice of it.
// That switch ignores our viewport tag and nothing a page does can override it, so the honest fix is to notice it and
// say where the switch is.
//
// Measured, never guessed from the user agent (desktop mode REPLACES the user agent): a coarse pointer, a screen whose
// short side is a phone's, and a layout at least one and a half screens wide. A tablet (short side 600+) is left
// alone — a desktop layout on a tablet is a choice that mostly works. Pure, so it can be tested.

export const PHONE_SHORT_SIDE = 600;
export const DESKTOP_RATIO = 1.5;

export function desktopSiteOnPhone({ layoutWidth, screenWidth, screenHeight, coarse }) {
  const sw = Number(screenWidth) || 0, sh = Number(screenHeight) || 0, lw = Number(layoutWidth) || 0;
  if (!coarse || !sw || !sh || !lw) return false;
  if (Math.min(sw, sh) >= PHONE_SHORT_SIDE) return false;
  return lw >= sw * DESKTOP_RATIO;
}

/** The same check against the live window. False wherever it cannot be measured. */
export function desktopSiteNow() {
  try {
    return desktopSiteOnPhone({
      layoutWidth: document.documentElement.clientWidth,
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      coarse: window.matchMedia?.("(pointer: coarse)")?.matches,
    });
  } catch { return false; }
}
