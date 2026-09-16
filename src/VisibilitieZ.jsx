import { useEffect, useState } from "react";
import { Globe, Users, Lock, Heart, UserPlus, Handshake } from "lucide-react";
import { api } from "./api.js";

// Who may see each profile field. A field carries as many audiences as its
// owner wants, and any one of them letting somebody in is enough — "my
// PartnerZ and my friends" is the obvious real request, and forcing a single
// choice makes people pick the looser option, which is the opposite of what a
// privacy control is for. One audience is still the normal case.
//
// It renders the server's list and computes nothing: which fields exist, what
// each defaults to, what the audiences are and which custom groups the member
// actually has are all served. A client with its own copy of any of that would
// be the second place it lives.

const ICON = {
  public: Globe, member: Users, private: Lock,
  friends: Heart, fans: UserPlus, partnerz: Handshake,
};

// Public and Members swallow anything narrower, and Private excludes
// everything — so picking one of those replaces the set rather than joining
// it. The server enforces this too; doing it here as well is so the control
// never shows a combination it is about to be told off for.
const EXCLUSIVE = new Set(["public", "member", "private"]);

const NAMES = {
  display_name: "Display name", first_name: "First name", last_name: "Last name",
  bio: "Bio", personas: "PersonaZ", links: "Links", badge_title: "Badge title",
  avatar: "Avatar", gender: "Gender", sign: "Star sign", regions: "Regions",
  nationalities: "Nationalities", sober: "Sober", personality: "PersonalitieZ",
  attracted_to: "Attracted to", age: "Age", birthday: "Birthday",
  location: "Location", substances: "SubstanceZ",
};
const nameOf = (f) => NAMES[f] || f.replace(/_/g, " ");
const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

export default function VisibilitieZ({ visibility, audiences, onChange }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  // An older API has no `visibility` key. Absent renders nothing, which reads
  // as a feature not switched on yet — what a missing key actually means while
  // the two repos deploy independently.
  if (!Array.isArray(visibility)) return null;
  const opts = Array.isArray(audiences) && audiences.length
    ? audiences
    : [{ token: "public", label: "Public" }, { token: "member", label: "Members" },
       { token: "private", label: "Private" }];

  async function set(field, next) {
    setError("");
    setBusy(field);
    try {
      // Only the field that changed. A whole-map write would reset every
      // control this build doesn't know about, which is what happens whenever
      // the frontend is a version behind the backend.
      const me = await api("/api/auth/me/", {
        method: "PATCH",
        body: { visibility: { [field]: next } },
      });
      onChange?.(me);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  function toggle(field, level, token) {
    const has = level.includes(token);
    let next;
    if (EXCLUSIVE.has(token)) {
      next = [token];
    } else if (has) {
      next = level.filter((x) => x !== token);
      // Removing the last audience would leave a field with no answer at all,
      // which the server reads as "unset" and quietly returns to its default —
      // a control that appears to do the opposite of what was pressed. Private
      // is what "nobody" means here, so say it.
      if (!next.length) next = ["private"];
    } else {
      next = [...level.filter((x) => !EXCLUSIVE.has(x)), token];
    }
    if (!same(next, level)) set(field, next);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/45">
        Who can see what
      </p>
      <p className="mb-3 text-[11px] leading-relaxed text-white/40">
        Every field on its own, and each can name more than one audience — your
        FriendZ and your PartnerZ, say. Nothing changed when this arrived: each
        field starts where it already was.
      </p>

      <ul className="space-y-1.5">
        {visibility.map(({ field, level, default: dflt }) => {
          const on = Array.isArray(level) ? level : [level];
          const base = Array.isArray(dflt) ? dflt : [dflt];
          return (
            <li key={field}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm">
                  {nameOf(field)}
                  {!same(on, base) && (
                    <span className="pl-1.5 text-[10px] text-white/35">changed</span>
                  )}
                </span>
                <div className="flex flex-wrap gap-1">
                  {opts.map(({ token, label }) => {
                    const Icon = ICON[token] || Users;
                    const active = on.includes(token);
                    return (
                      <button
                        key={token}
                        type="button"
                        disabled={busy === field}
                        onClick={() => toggle(field, on, token)}
                        aria-pressed={active}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition disabled:opacity-40 ${
                          active
                            ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40"
                            : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        <Icon size={12} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p className="pt-2 text-sm text-mcz-pink">{error}</p>}
    </div>
  );
}
