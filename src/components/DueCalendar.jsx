// The calendar a due day is picked from. A real month grid, not a text box: the member sees which week a day
// sits in, moves month by month, and sees today marked. The quick picks set a day without the grid, and
// "No date" takes the day away. It decides nothing: `onPick` gets the day the member chose, or "" for no date.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayLong, dayShort, monthGrid, monthTitle, parseISO, quickDates, shiftMonth } from "../lilithDates.js";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DueCalendar({ value = "", today, onPick }) {
  const seen = parseISO(value || today);
  const [view, setView] = useState({ y: seen.y, m: seen.m });
  // A day chosen elsewhere (a quick pick, or another task opened) moves the calendar to its month.
  useEffect(() => {
    const p = parseISO(value || today);
    setView({ y: p.y, m: p.m });
  }, [value, today]);
  const weeks = monthGrid(view.y, view.m);

  return (
    <div role="group" aria-label="Pick a day" className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setView((v) => shiftMonth(v, -1))} aria-label="Previous month"
                className="rounded-md p-1 text-white/70 hover:bg-white/10">
          <ChevronLeft size={16} />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-white" aria-live="polite">
          {monthTitle(view.y, view.m)}
        </p>
        <button type="button" onClick={() => setView((v) => shiftMonth(v, 1))} aria-label="Next month"
                className="rounded-md p-1 text-white/70 hover:bg-white/10">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} aria-hidden="true" className="text-[10px] font-semibold uppercase text-white/45">{w}</span>
        ))}
        {weeks.flat().map((c) => {
          const chosen = c.iso === value;
          const isToday = c.iso === today;
          return (
            <button key={c.iso} type="button" onClick={() => onPick(c.iso)}
                    aria-label={dayLong(c.iso)} aria-pressed={chosen}
                    className={`aspect-square rounded-lg text-[12px] transition-colors ${
                      chosen ? "bg-fuchsia-500/40 font-bold text-white ring-1 ring-fuchsia-300"
                        : isToday ? "font-semibold text-mcz-cyan ring-1 ring-mcz-cyan/50 hover:bg-white/10"
                        : c.inMonth ? "text-white/85 hover:bg-white/10" : "text-white/25 hover:bg-white/5"}`}>
              {c.day}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-white/60">{value ? `Due ${dayLong(value)}` : "No date yet"}</p>
      <div className="flex flex-wrap gap-1.5">
        {quickDates(today).map((q) => (
          <button key={q.key} type="button" onClick={() => onPick(q.iso)}
                  className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:bg-white/10">
            {q.label} · {dayShort(q.iso)}
          </button>
        ))}
        {value && (
          <button type="button" onClick={() => onPick("")}
                  className="rounded-md px-2 py-1 text-[11px] text-mcz-ember hover:bg-mcz-ember/10">
            No date
          </button>
        )}
      </div>
    </div>
  );
}
