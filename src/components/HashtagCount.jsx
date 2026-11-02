// How many hashtags the member wants, most relevant first. Blank is "no preference"
// (the writer's own default), which is not the same as 0 ("none") — so the two are
// kept apart on screen and on the wire. The ceiling is the server's (`max`), never
// typed here.
export default function HashtagCount({ value, onChange, max = 30, className = "" }) {
  return (
    <label className={`inline-flex items-center gap-1.5 text-[11px] text-white/60 ${className}`}>
      Hashtags
      <input type="number" min={0} max={max} inputMode="numeric" data-nomemo="true"
             className="neon-input !w-16 !px-2 !py-1 text-[12px]" aria-label="Number of hashtags"
             placeholder="auto" value={value}
             onChange={(e) => {
               const v = e.target.value;
               onChange(v === "" ? "" : Math.max(0, Math.min(max, Math.floor(Number(v) || 0))));
             }} />
      <span className="text-white/40">{value === "" ? "writer's choice" : value === 0 ? "none" : "most relevant first"}</span>
    </label>
  );
}

// What goes on the wire: nothing when the member did not choose.
export const hashtagBody = (value) => (value === "" || value == null ? {} : { hashtags: value });
