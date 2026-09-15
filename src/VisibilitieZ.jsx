import { useState } from "react";
import { Globe, Users, Lock } from "lucide-react";
import { api } from "./api.js";

// Who may see each profile field. Three states, set per field.
//
// It renders the server's list and computes nothing: which fields exist, what
// each defaults to, and what the levels are all come from
// `/api/auth/me/`'s `visibility`. A client with its own copy of that list would
// be the second place it lives, and the two would disagree within a year — the
// same reason a tier number is never typed into a screen.
//
// EVERY field is shown, including the ones left alone. A member can only check
// what they're exposing by seeing the whole list, and "trust us, it's sensible"
// is not an answer to that.

// The SAME three words PostZ puts on a post — Public / Members / Private, in
// that order, with the same tips. A member should not learn one vocabulary for
// their posts and a different one for their profile.
//
// The stored key for the middle level differs (`member` here, `restricted` on a
// post) because they are unrelated columns and "restricted" reads oddly against
// a field name. The LABEL is the part a member has to recognise, and that is
// identical.
const LEVELS = [
  { key: "public", label: "Public", Icon: Globe, tip: "Anyone, including people not signed in" },
  { key: "member", label: "Members", Icon: Users, tip: "Visible to members only" },
  { key: "private", label: "Private", Icon: Lock, tip: "Just you" },
];

// Plain-English names for the stored keys. A label is not a rule, so keeping
// these here doesn't make it a second source of truth — an unknown field still
// renders, using its own key, rather than vanishing.
const NAMES = {
  display_name: "Display name",
  first_name: "First name",
  last_name: "Last name",
  bio: "Bio",
  personas: "PersonaZ",
  links: "Links",
  badge_title: "Badge title",
  avatar: "Avatar",
  gender: "Gender",
  sign: "Star sign",
  regions: "Regions",
  nationalities: "Nationalities",
  sober: "Sober",
  personality: "PersonalitieZ",
  attracted_to: "Attracted to",
  age: "Age",
  birthday: "Birthday",
  location: "Location",
  substances: "SubstanceZ",
};

const nameOf = (f) => NAMES[f] || f.replace(/_/g, " ");

export default function VisibilitieZ({ visibility, onChange }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // An older API has no `visibility` key. Absent renders nothing, which reads
  // as a feature not switched on yet — what a missing key actually means while
  // the two repos deploy independently.
  if (!Array.isArray(visibility)) return null;

  async function set(field, level) {
    setError("");
    setBusy(field);
    // Only the field that changed. A whole-map write would reset every control
    // this build doesn't know about, which is precisely what happens when the
    // frontend is a version behind the backend.
    try {
      const me = await api("/api/auth/me/", {
        method: "PATCH",
        body: { visibility: { [field]: level } },
      });
      onChange?.(me);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/45">
        Who can see what
      </p>
      <p className="mb-3 text-[11px] leading-relaxed text-white/40">
        Every field, set on its own. Nothing here changed when this arrived —
        each one starts where it already was, so you're tightening from where
        you are rather than finding out later.
      </p>

      <ul className="space-y-1.5">
        {visibility.map(({ field, level, default: dflt }) => (
          <li key={field}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-sm">
              {nameOf(field)}
              {level !== dflt && (
                <span className="pl-1.5 text-[10px] text-white/35">changed</span>
              )}
            </span>
            <div className="flex shrink-0 gap-1">
              {LEVELS.map(({ key, label, Icon, tip }) => (
                <button
                  key={key}
                  type="button"
                  disabled={busy === field}
                  onClick={() => set(field, key)}
                  aria-pressed={level === key}
                  title={tip}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition disabled:opacity-40 ${
                    level === key
                      ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {error && <p className="pt-2 text-sm text-mcz-pink">{error}</p>}
    </div>
  );
}
