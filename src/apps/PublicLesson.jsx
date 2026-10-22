// A lesson listing as a stranger sees it, from a shared /l/<id> link. The server's public
// read (/api/lessonz/offers/<id>/public/) serves published listings only, gives the city
// and never the coordinates, and refuses a listing whose teacher is under 18. Booking
// happens inside, with an account — the page says so instead of offering a dead button.
import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import JoinLink from "../components/JoinLink.jsx";
import TryLink from "../components/TryLink.jsx";
import { AlertCircle, GraduationCap, Loader2, MapPin } from "lucide-react";
import { api } from "../api.js";

const PER = { per_hour: "an hour", per_lesson: "a lesson" };

export default function PublicLesson() {
  const { id } = useParams();
  const [l, setL] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(l && l.title, l && `${l.skill} lessons with @${l.teacher_username} on Music ConnectZ`);

  useEffect(() => {
    api(`/api/lessonz/offers/${id}/public/`, { auth: false })
      .then(setL)
      .catch((e) => setErr(e.message || "That lesson isn't available."));
  }, [id]);

  const where = l && [l.remote_ok && "remote", l.in_person_ok && (l.city ? `in person in ${l.city}` : "in person"),
                      l.callz_ok && "over CallZ"].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png?v=2" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-white/70 hover:text-white">Sign in</Link>
          <JoinLink owner={l?.teacher_username} className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white hover:brightness-110">Join free</JoinLink>
        </div>
      </header>

      {err && (
        <div className="neon-frame flex items-start gap-2 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-mcz-ember" />
          <div><p className="text-white/80">{err}</p><Link to="/" className="text-mcz-ember">Go home</Link></div>
        </div>
      )}
      {!l && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {l && (
        <article className="neon-frame space-y-4 p-5">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/50"><GraduationCap size={13} /> {l.skill} lessons</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-white">{l.title}</h1>
            <p className="text-sm text-white/60">with <Link to={`/u/${l.teacher_username}`} className="font-semibold text-white hover:text-mcz-cyan">@{l.teacher_username}</Link></p>
          </div>
          {l.description && <p className="whitespace-pre-line text-sm text-white/75">{l.description}</p>}
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white/5 p-3 text-sm">
            <span className="font-display text-xl font-extrabold text-white">{l.currency === "USD" ? "$" : `${l.currency} `}{l.price}</span>
            <span className="text-white/55">{PER[l.pricing_mode] || ""}</span>
            {where && <span className="flex items-center gap-1 text-white/55"><MapPin size={13} /> {where}</span>}
          </div>
          <div className="space-y-2 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="text-white/80">Booking happens inside, with a free account — the price above is what you'd agree to.</p>
            <JoinLink owner={l.teacher_username} invite className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">Join to book</JoinLink>
            <div className="pt-1"><TryLink owner={l.teacher_username} className="text-[12px] text-mcz-cyan hover:underline">Or see where you're at first — get a take scored, free</TryLink></div>
          </div>
        </article>
      )}
    </div>
  );
}
