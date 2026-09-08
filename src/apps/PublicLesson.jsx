import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Star, Clock, Zap } from "lucide-react";
import { api } from "../api.js";
import MentionText from "../MentionParser.jsx";

export default function PublicLesson() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [err, setErr] = useState("");

  usePageTitle(lesson && `${lesson.skill} lesson by ${lesson.teacher_username}`,
               lesson && `Learn ${lesson.skill} from an expert`);

  useEffect(() => {
    api(`/api/lessonz/offers/${id}/`, { auth: false })
      .then(setLesson)
      .catch((e) => setErr(e.message || "That lesson isn't available."));
  }, [id]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/register" className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white hover:brightness-110">
          Join free
        </Link>
      </header>

      {err && (
        <div className="neon-frame flex items-start gap-2 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-mcz-ember" />
          <div><p className="text-white/80">{err}</p><Link to="/" className="text-mcz-ember">Go home</Link></div>
        </div>
      )}

      {!lesson && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {lesson && (
        <article className="neon-frame p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <Link to={`/u/${lesson.teacher_username}`} className="text-sm font-bold text-white hover:text-mcz-cyan">
                @{lesson.teacher_username}
              </Link>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white uppercase">
                {lesson.skill}
              </h1>
            </div>
            {lesson.rating_snapshot != null && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-mcz-gold">
                  <Star size={14} className="fill-current" />
                  <span className="font-bold text-sm">{lesson.rating_snapshot}</span>
                </div>
                <p className="text-xs text-white/40">/10</p>
              </div>
            )}
          </div>

          {lesson.description && (
            <div className="text-sm text-white/75 leading-relaxed">
              <MentionText text={lesson.description} />
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
            {lesson.rate_per_hour != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Rate</span>
                <span className="font-bold"><Zap className="inline" size={14} /> {lesson.rate_per_hour}/hr</span>
              </div>
            )}
            {lesson.session_duration_minutes != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Session</span>
                <span className="font-bold"><Clock className="inline" size={14} /> {lesson.session_duration_minutes} min</span>
              </div>
            )}
            {lesson.visibility && (
              <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                {lesson.visibility}
              </div>
            )}
          </div>

          <div className="text-xs text-white/40 text-center pt-2">
            <Link to="/register" className="text-mcz-cyan hover:underline">Join Music ConnectZ</Link> to book lessons
          </div>
        </article>
      )}
    </div>
  );
}
