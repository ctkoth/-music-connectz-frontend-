import { Clock } from "lucide-react";

/**
 * Shows countdown until post edit window closes.
 * Authors can edit only for a limited time after posting.
 */
export default function EditWindowCountdown({ post, now, canEdit }) {
  if (!canEdit || !post) return null;

  const ageSec = Math.max(0, Math.floor((now - post.localCreated) / 1000));
  const editWindowSec = post.edit_unlock_sec ?? 3600; // Default 1 hour
  const timeLeft = Math.max(0, editWindowSec - ageSec);

  if (timeLeft === 0) return null;

  const mins = Math.ceil(timeLeft / 60);

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-white/50">
      <Clock size={12} className="shrink-0" />
      <span>{mins}m to edit</span>
    </div>
  );
}
