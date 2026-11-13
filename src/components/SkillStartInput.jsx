import { useState } from "react";
import { parseYear, yearOnlyStart } from "../personaSkills.js";

// The "when did you start" input for a skill: a full date, or just the year. Members mostly know the
// year ("I started rapping at 16"), so the year is a first-class answer rather than a guessed date.
//
//   onChange(start, precision)   precision is "year" for a year-only answer and "" for a full date.
//                                An empty `start` means the answer was cleared.
//
// A year is only committed once it is four digits and inside 1900..this year, so typing "20" does not
// save 1920. Switching to "just the year" keeps the year already chosen; switching back keeps the date.
export default function SkillStartInput({ start = "", precision = "", onChange, max, label, inputClass = "", buttonClass = "" }) {
  const [yearMode, setYearMode] = useState(precision === "year");
  const [text, setText] = useState(precision === "year" ? String(start).slice(0, 4) : "");

  function toYear() {
    const y = parseYear(String(start).slice(0, 4));
    setText(y ? String(y) : "");
    setYearMode(true);
    if (y) onChange(yearOnlyStart(y), "year");
  }
  function toDate() {
    setYearMode(false);
    if (start) onChange(start, "");      // keeps the 1 January, now a plain date the member can adjust
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {yearMode ? (
        <input type="text" inputMode="numeric" maxLength={4} placeholder="Year" value={text}
               aria-label={`${label || "Started"} (year)`}
               onChange={(e) => {
                 const t = e.target.value.replace(/\D/g, "").slice(0, 4);
                 setText(t);
                 const y = parseYear(t);
                 if (y) onChange(yearOnlyStart(y), "year");
                 else if (!t) onChange("", "");
               }}
               className={`w-16 ${inputClass}`} />
      ) : (
        <input type="date" max={max} value={start} aria-label={label || "Started"}
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
