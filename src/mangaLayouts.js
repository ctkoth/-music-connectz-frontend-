// MangaZ page layouts: where each panel sits on a page, as [x, y, w, h] fractions of a 2:3 page.
// Ladder order matters: a tier may use the first N layouts (Free 3, Premium 6, StatZ all —
// the same served number as ImageZ's layers), so everyday layouts come first.
// Pure — tested under node.

const G = 0.02;   // the gutter between panels

/** n rows of panels, as even as possible: the generic layout every template falls back to. */
function rows(n, perRow = 2) {
  const out = [], r = Math.ceil(n / perRow);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row * perRow), col = i - row * perRow;
    const w = (1 - G * (inRow + 1)) / inRow, h = (1 - G * (r + 1)) / r;
    out.push([G + col * (w + G), G + row * (h + G), w, h]);
  }
  return out;
}

function stack(n) { return rows(n, 1); }

/** A big first panel across the top, the rest in a row (or rows) under it. */
function splash(n, share = 0.55) {
  if (n < 2) return stack(n);
  const top = [G, G, 1 - 2 * G, share - 1.5 * G];
  const rest = rows(n - 1, Math.min(3, n - 1)).map(([x, y, w, h]) => [x, share + y * (1 - share), w, h * (1 - share)]);
  return [top, ...rest];
}

/** Two columns where the left one is tall: an L-shaped page. */
function lshape(n) {
  if (n < 3) return rows(n);
  const left = [G, G, 0.45, 1 - 2 * G];
  const right = stack(n - 1).map(([, y, , h]) => [0.47 + G, y, 0.53 - 2 * G, h]);
  return [left, ...right];
}

/** Slanted-feeling staggered rows: alternating wide and narrow panels. */
function stagger(n) {
  const out = [], r = Math.ceil(n / 2), h = (1 - G * (r + 1)) / r;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 2), first = i % 2 === 0, alone = first && i === n - 1;
    const wide = row % 2 === 0 ? 0.6 : 0.38;
    const w = alone ? 1 - 2 * G : first ? wide : 1 - wide - 3 * G;
    const x = first ? G : G * 2 + wide;
    out.push([x, G + row * (h + G), w, h]);
  }
  return out;
}

export const LAYOUTS = [
  ["grid", "Grid", (n) => rows(n, 2)],
  ["strip", "Strip — one per row", stack],
  ["splash", "Splash — big first panel", (n) => splash(n)],
  ["three", "Three across", (n) => rows(n, 3)],
  ["lshape", "Tall left", lshape],
  ["stagger", "Staggered", stagger],
  ["bigend", "Big last panel", (n) => (n < 2 ? stack(n) : splash(n, 0.45).map(([x, y, w, h]) => [x, 1 - y - h, w, h]).reverse())],
  ["webtoon", "Webtoon — tall and narrow", (n) => stack(n).map(([, y, , h]) => [0.15, y, 0.7, h])],
];

export const layoutFor = (key, n) => (LAYOUTS.find(([k]) => k === key)?.[2] || LAYOUTS[0][2])(Math.max(1, n));

/** Where a speech bubble starts: spread down the panel's top, one per line. */
export function defaultBubble(i, count) {
  return { i, x: 0.08 + (0.84 * i) / Math.max(1, count), y: 0.06 + 0.12 * (i % 2) };
}

/** Move or resize a box, keeping it on the page and at least a sliver big. */
export function moveBox([x, y, w, h], dx, dy) {
  return [Math.max(0, Math.min(1 - w, x + dx)), Math.max(0, Math.min(1 - h, y + dy)), w, h];
}
export function resizeBox([x, y, w, h], dw, dh) {
  return [x, y, Math.max(0.05, Math.min(1 - x, w + dw)), Math.max(0.05, Math.min(1 - y, h + dh))];
}
