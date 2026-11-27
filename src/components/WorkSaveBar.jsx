// The status line and the restore offer for a screen's kept work (see src/workSave.js). It states which copy each button
// replaces, because "keep this device's" does replace the copy on the account.
export default function WorkSaveBar({ work, what }) {
  const { offer, restore, dismiss, status } = work;
  return (
    <div className="space-y-2 text-xs">
      {offer && (
        <div className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 p-3 text-cyan-50" role="status">
          <p>
            Your account has a newer copy of this {what}, saved {new Date(offer.updated).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
            Restore it replaces what is on this screen with that copy. Keep this device's replaces the copy on your account with what is here.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="re-btn !w-auto px-3" onClick={restore}>Restore it</button>
            <button type="button" className="rounded border border-white/15 px-3 py-1 text-white/80" onClick={dismiss}>Keep this device's</button>
          </div>
        </div>
      )}
      {status.text && <p className="text-white/60" role="status">☁️ {status.text}</p>}
    </div>
  );
}
