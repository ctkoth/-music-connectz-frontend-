// An empty list, drawn one way everywhere: what is missing, in a sentence, and the one
// control that fills it. "Nothing here yet." on its own is a dead end, the thing the
// cross-pollination rule says this app may not have; a list that is empty because the
// member has not done something yet should hand them the door to doing it.
//
//   <Empty text="No posts yet." action="Post your first" onAction={() => goToSpot("postz", "post-compose")} />
//
// Leave `action` off only when the control is already beside the list (say so in the
// text: "Add one below.") or when there is honestly nothing the member can do.
export default function Empty({ text, action, onAction, className = "" }) {
  return (
    <p className={`text-sm text-white/50 ${className}`}>
      {text}
      {action && onAction && (
        <>
          {" "}
          <button type="button" className="re-link" onClick={onAction}>{action} →</button>
        </>
      )}
    </p>
  );
}
