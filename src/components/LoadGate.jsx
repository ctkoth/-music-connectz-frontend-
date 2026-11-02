// What a screen shows before its data is here, drawn one way everywhere: a spinner while
// it loads, and — if the load FAILED — the server's sentence and a Try again, instead of
// a spinner that turns forever. Eight screens had the second bug: the error was caught
// and stored, but the "no data yet" early return ran first, so it was never shown.
//
//   if (!data) return <LoadGate error={err} what="your bookings" onRetry={load} />;
import { AlertTriangle, Loader2 } from "lucide-react";

export default function LoadGate({ error = "", what = "", onRetry = null, small = false }) {
  if (error) {
    return (
      <div role="alert" className={`flex flex-wrap items-start gap-2 ${small ? "text-xs" : "text-sm"} text-mcz-ember`}>
        <AlertTriangle size={small ? 13 : 15} className="mt-0.5 shrink-0" />
        <span className="min-w-0 flex-1">
          {what ? `Couldn't load ${what}. ` : ""}<span className="text-white/60">{error}</span>
        </span>
        {onRetry && (
          <button type="button" className="re-link shrink-0" onClick={onRetry}>Try again</button>
        )}
      </div>
    );
  }
  return (
    <p className={`flex items-center gap-2 text-white/50 ${small ? "text-xs" : ""}`}>
      <Loader2 className="animate-spin" size={small ? 12 : 16} /> Loading{what ? ` ${what}` : ""}…
    </p>
  );
}
