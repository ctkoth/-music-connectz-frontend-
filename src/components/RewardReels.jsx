import { reelStrips, stopAt } from "../reelReveal.js";

// The neon slot-style reveal under a big win (Casino look only). Decorative: the chip above it already says the amount to a
// screen reader, so this is aria-hidden. It lands on exactly the number the server paid — see reelReveal.js for what it never does.
export default function RewardReels({ resource, amount }) {
  const strips = reelStrips(resource, amount);
  if (!strips.length) return null;
  return (
    <div className="mcz-reels" aria-hidden="true">
      {strips.map((s, i) => (
        s.kind === "fixed"
          ? <span key={i} className="mcz-reel-fixed">{s.final}</span>
          : (
            <span key={i} className="mcz-reel">
              <span className="mcz-reel-strip" style={{ "--n": s.symbols.length - 1, animationDuration: `${stopAt(i)}s` }}>
                {s.symbols.map((c, k) => <b key={k}>{c}</b>)}
              </span>
            </span>
          )
      ))}
    </div>
  );
}
