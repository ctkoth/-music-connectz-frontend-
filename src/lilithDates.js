// Dates for Lilith's to-do list, and the calendar month they are picked from.
//
// Every due day is a CALENDAR day, and "today" is worked out on the MEMBER's device. The server's clock is
// UTC (settings.TIME_ZONE), so a "today" taken from the server turns over hours before an evening in the
// Americas, and a task due today would read as overdue. The server only stores the day and orders by it.
//
// Nothing here uses Intl or the device's locale, so the same day reads the same everywhere and the tests
// are exact.

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

const pad = (n) => String(n).padStart(2, "0");

/** "2026-11-27" → { y, m, d }. Month is 1-12. */
export function parseISO(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return { y, m, d };
}

function isoOfUTC(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Today on this device, as a calendar day. */
export function localISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from, to) {
  const a = parseISO(from);
  const b = parseISO(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5);
}

/** The day `n` days after `iso` (negative goes back). */
export function addDays(iso, n) {
  const { y, m, d } = parseISO(iso);
  return isoOfUTC(Date.UTC(y, m - 1, d + n));
}

/** `n` calendar months after `iso`: the same day, or the month's last day when that month is shorter. */
export function addMonths(iso, n) {
  const { y, m, d } = parseISO(iso);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth();
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return isoOfUTC(Date.UTC(ty, tm, Math.min(d, last)));
}

/** "Mon 23 Nov" — the day's name and date, from the ISO day alone. */
export function dayShort(iso) {
  const { y, m, d } = parseISO(iso);
  return `${DAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
}

/** "Monday 23 November 2026" — for a calendar cell's accessible name. */
export function dayLong(iso) {
  const { y, m, d } = parseISO(iso);
  return `${DAYS_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/** The line a row shows for a due day. `today` is the member's own ISO day. */
export function dueLabel(due, today) {
  if (!due) return "";
  const n = daysBetween(today, due);
  if (n < 0) return `Overdue · ${dayShort(due)}`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  return `Due ${dayShort(due)}`;
}

export function isOverdue(due, today) {
  return !!due && daysBetween(today, due) < 0;
}

/** The month's calendar, Sunday first, as whole weeks. Days from the neighbouring months fill the first
 *  and last weeks; a last week with nothing from this month is dropped. Each cell carries its ISO day. */
export function monthGrid(y, m) {
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const start = Date.UTC(y, m - 1, 1 - lead);
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      const ms = start + (w * 7 + i) * 864e5;
      const date = new Date(ms);
      week.push({ iso: isoOfUTC(ms), day: date.getUTCDate(), inMonth: date.getUTCMonth() === m - 1 });
    }
    weeks.push(week);
  }
  return weeks.filter((week, i) => i < 5 || week.some((c) => c.inMonth));
}

/** "November 2026". */
export function monthTitle(y, m) {
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** The month `n` months from {y, m}. */
export function shiftMonth({ y, m }, n) {
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
}

/** The quick picks beside the calendar. Today is not one of them: Today is the Today tab, and a task
 *  on it has no date. */
export function quickDates(today) {
  return [
    { key: "tomorrow", label: "Tomorrow", iso: addDays(today, 1) },
    { key: "week", label: "In a week", iso: addDays(today, 7) },
    { key: "month", label: "In a month", iso: addMonths(today, 1) },
  ];
}

/** Search: every word typed must appear in the title or the note, ignoring case. */
export function matchesQuery(task, query) {
  const words = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${task?.title || ""} ${task?.note || ""}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}
