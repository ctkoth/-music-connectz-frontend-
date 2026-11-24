// /lookmaxz/sample — an EXAMPLE LookZMaxZ reading, public, for anybody with no account or no ID check.
// The real reading scores a photo of a face and is for verified adults; a visitor cannot be age-checked, so
// this shows the layout, the scale and what every factor means with invented numbers and no photo. It scores
// nobody, which is why it needs no age gate. Everything on it is the server's (`/lookmaxz/sample/`).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { RatingRow } from "../components/Rating.jsx";

export default function LookSample() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api("/api/economy/lookmaxz/sample/", { auth: false }).then(setD).catch(() => setErr(true)); }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-white">
      <h1 className="font-display text-2xl font-extrabold">✨ LookZMaxZ — an example reading</h1>
      {err && <p className="text-sm text-white/70">The example couldn't load. Try again in a moment.</p>}
      {d && (
        <>
          <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100" role="note">{d.note}</p>
          {d.overall != null && <RatingRow label="Overall (example)" value={d.overall} />}
          {Object.entries(d.sectors).map(([k, s]) => {
            const meta = d.catalogue[k] || {};
            return (
              <section key={k} className="re-card space-y-2 p-3">
                <h2 className="text-sm font-bold">{meta.emoji} {meta.label} {s.score != null && <span className="text-white/60">· {s.score}/10</span>}</h2>
                <p className="text-[11px] text-white/60">{meta.means}</p>
                {Object.entries(s.scores).map(([f, v]) => {
                  const i = meta.factor_info?.[f];
                  return (
                    <div key={f} className="space-y-0.5">
                      <RatingRow label={`${i?.label || f} (example)`} value={v} />
                      {i && <p className="text-[11px] leading-snug text-white/65"><span className="text-white/50">Why it matters: </span>{i.why}</p>}
                      {i && <p className="text-[11px] leading-snug text-emerald-200/80"><span className="text-white/50">How to improve it: </span>{i.how}</p>}
                    </div>
                  );
                })}
                {s.advice?.map((a) => <p key={a} className="text-[11px] text-white/70">• {a}</p>)}
                <p className="text-[11px] text-white/50">See a professional: {meta.see_pro}</p>
              </section>
            );
          })}
          <p className="text-[11px] leading-snug text-white/60">{d.caveat}</p>
          <p className="text-[11px] leading-snug text-white/60">{d.care_note}</p>
          <p className="text-xs text-white/75">{d.real_reading}</p>
          <div className="flex flex-wrap gap-2">
            <Link className="re-btn !w-auto px-4" to={user ? "/lookmaxz" : "/register"}>{user ? "Get my own reading" : "Join free to get my own"}</Link>
            {!user && <Link className="re-btn !w-auto px-4" to="/login">I have an account</Link>}
          </div>
        </>
      )}
    </div>
  );
}
