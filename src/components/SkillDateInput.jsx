import { useState } from "react";
import { parseYear, yearOnlyEnd, yearOnlyStart } from "../personaSkills.js";

// The date input for a skill's START or STOP: a full date, or just the year. Members mostly know the
// year ("I started rapping at 16"), so the year is a first-class answer rather than a guessed date.
//
//   onChange(value, precision)   precision is "year" for a year-only answer and "" for a full date.
//                                An empty `value` means the answer was cleared.
//   end                          true for a STOP: a year is stored as that year's 1 July (a stop can fall
//                                anywhere in the year), a start as its 1 January.
//   minYear                      the earliest year a stop may name (the year it started).
//
// A year is only committed once it is four digits and inside 1900..this year, so typing "20" does not
// save 1920. Switching to "just the year" keeps the year already chosen; switching back keeps the date.
export default function SkillDateInput({ start = "", precision = "", onChange, max, min, label, end = false, minYear = 1900, inputClass = "", buttonClass = "" }) {
  const stored = end ? yearOnlyEnd : yearOnlyStart;
  const asYear = (v) => { const y = parseYear(v); return y && y >= minYear ? y : null; };
  const [yearMode, setYearMode] = useState(precision === "year");
  const [text, setText] = useState(precision === "year" ? String(start).slice(0, 4) : "");

  function toYear() {
    const y = asYear(String(start).slice(0, 4));
    setText(y ? String(y) : "");
    setYearMode(true);
    if (y) onChange(stored(y), "year");
  }
  function toDate() {
    setYearMode(false);
    if (start) onChange(start, "");      // keeps the stored day, now a plain date the member can adjust
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {yearMode ? (
        <input type="text" inputMode="numeric" maxLength={4} placeholder="Year" value={text}
               aria-label={`${label || "Started"} (year)`}
               onChange={(e) => {
                 const t = e.target.value.replace(/\D/g, "").slice(0, 4);
                 setText(t);
                 const y = asYear(t);
                 if (y) onChange(stored(y), "year");
                 else if (!t) onChange("", "");
               }}
               className={`w-16 ${inputClass}`} />
      ) : (
        <input type="date" max={max} min={min} value={start} aria-label={label || "Started"}
               onChange={(e) => onChange(e.target.value, "")}
               className={inputClass} />
      )}
      <button type="button" onClick={yearMode ? toDate : toYear}
              className={buttonClass || "text-[10px] text-white/45 underline hover:text-mcz-cyan"}>
        {yearMode ? "I know the date" : "Just the year"}
      </button>
    </span>
  );
}
