// Send someone to the exact control a task is completed on.
//
// Switching tabs alone drops you at the top of an app and leaves you to hunt
// for the field OnboardZ just told you about. These helpers switch tabs AND
// land on the control: they wait for it to mount (the destination renders a
// beat after the tab change), scroll it into view, and flash a ring around it
// so there is no ambiguity about which thing was meant.
//
// Targets are the same data-tour="…" anchors the guided tour spotlights, so
// one anchor serves both and neither can drift from the other.

export const goToTab = (key) =>
  window.dispatchEvent(new CustomEvent("mcz-goto-tab", { detail: key }));

const FLASH_MS = 2200;

/** Scroll to a data-tour anchor and flash it. Resolves false if it never mounts.
 *
 * A tab switch scrolls the page to the top, smoothly, and that scroll is still
 * running when a target that was already mounted gets found on the first tick
 * — it would win and leave the member at the top of the page. So the first
 * look is delayed past it, and the scroll is re-asserted once afterwards in
 * case anything else moved the page in the meantime. */
export function spotlight(target, { tries = 25, every = 120, delay = 400 } = {}) {
  return new Promise((resolve) => {
    let n = 0;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        const bring = () => el.scrollIntoView({ behavior: "smooth", block: "center" });
        bring();
        setTimeout(bring, 320);
        el.classList.add("mcz-spot");
        setTimeout(() => el.classList.remove("mcz-spot"), FLASH_MS);
        return resolve(true);
      }
      if (++n >= tries) return resolve(false);
      setTimeout(tick, every);
    };
    setTimeout(tick, delay);
  });
}

/** Open `tab` and land on `target` within it. */
export function goToSpot(tab, target) {
  goToTab(tab);
  return target ? spotlight(target) : Promise.resolve(false);
}
