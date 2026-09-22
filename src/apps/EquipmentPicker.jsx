// Equipment is a set of TOGGLES, never a single-select. A single-select
// equipment filter forces "I have dumbbells AND a barbell, just no rack" to
// be two separate browses instead of one — and BodieZ had FOUR separate
// single-select equipment dropdowns making that same mistake independently
// (the trial door's own two, plus the member app's exercise-library browser
// and BuildRoutine), each one somebody would have had to notice and fix on
// its own. One shared component now, so a fifth equipment filter gets this
// for free instead of reinventing the single-select.
//
// Selecting nothing means "any equipment" — the same meaning the old
// select's blank option carried.
export const EQUIPMENT_LABEL = {
  bodyweight: "Bodyweight", dumbbell: "Dumbbell", barbell: "Barbell",
  ez_bar: "EZ Bar", kettlebell: "Kettlebell", machine: "Machine",
  cable: "Cable / Pulley", band: "Band",
};

// Flips one equipment key in/out of the selected array — the one bit of
// logic every caller repeats, factored out so it can't drift into "add but
// never remove" in one of five places.
export function toggleEquipment(selected, key) {
  return selected.includes(key) ? selected.filter((x) => x !== key) : [...selected, key];
}

export default function EquipmentPicker({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(EQUIPMENT_LABEL).map(([k, l]) => (
        <button key={k} type="button" onClick={() => onToggle(k)}
                className={`pill ${selected.includes(k) ? "pill-on" : "hover:text-white"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
