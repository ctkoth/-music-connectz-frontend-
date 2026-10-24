import AiEnergy from "./AiEnergy.jsx";
import { goToSpot } from "../goto.js";
import { MONEY, PROMPTZ, SPINAZ } from "../resources.js";
import { money, priceView } from "../aiRun.js";
import EarnInstead from "../EarnInstead.jsx";

// The price line beside a Write / Compose button, for the screens whose runs are
// covered by a free daily prompt first and by 🏷️ then 💵 after that (Sentence and
// Instrumental ConnectZ). It is the same rule everywhere a button spends: the
// price is on the control, in the paradigm's colours, BEFORE it is pressed — and
// when the button cannot be pressed, the reason is in words and next to it.
//
// What it is careful about:
//   * A free run says "free prompts" and never wears the 🏷️. The 🏷️ is the paid
//     credit; a run the allowance covers does not touch it.
//   * A run that will be paid says so, with the split (🏷️ then 💵) when the server
//     served what the member holds, and a bare "−N 🏷️" when it did not.
//   * "Out of free prompts" is a different sentence in a shell. There is nothing
//     to buy there (Play's billing rules), so it names no price it cannot charge
//     and offers no door: only the renewal, which is the whole of what is true.
//   * Until GET has answered there is no price, so the line says it is checking
//     (or that the check failed, with the way to try again) — it never sits blank
//     beside a button that looks live.
export default function RunPrice({ s, noun = "runs", inShell = false, failed = false, onRetry }) {
  const v = priceView(s);

  if (v.state === "loading") {
    return failed ? (
      <span className="text-[11px] text-mcz-ember">
        Couldn't check the price.{" "}
        {onRetry && <button className="re-link" onClick={onRetry}>Try again</button>}
      </span>
    ) : (
      <span className="text-[11px] text-white/40">Checking the price…</span>
    );
  }
  if (v.state === "off") return null;

  if (v.state === "free") {
    return (
      <span className="text-[11px] text-emerald-300">
        Free today <AiEnergy />{" "}
        <span className="text-white/45">
          — uses 1 of your {v.left} free prompt{v.left === 1 ? "" : "s"} left{v.allowance ? ` (${v.allowance} a day)` : ""}
        </span>
      </span>
    );
  }

  if (v.state === "paid") {
    return (
      <span className="text-[11px] text-mcz-ember">
        {v.split ? (
          <>
            {v.split.promptz > 0 && <>−{v.split.promptz} {PROMPTZ} </>}
            {v.split.cents > 0 && <>−{money(v.split.cents)} {MONEY}</>}
          </>
        ) : <>−{v.cost} {PROMPTZ}</>} <AiEnergy />{" "}
        <span className="text-white/35">
          — {v.freeLeft ? "a free prompt doesn't cover a run this size" : "no free prompts left today"}
          {v.split && v.split.cents > 0 ? `, so ${PROMPTZ} first, then your balance` : ""}
        </span>
      </span>
    );
  }

  // blocked: configured, not free, not affordable.
  if (inShell) {
    return <span className="text-[11px] text-white/55">No free {noun} left today. They renew tomorrow.</span>;
  }
  return (
    <div role="status" className="w-full space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
      <p>
        {v.freeLeft ? "Your free prompts don't cover a run this size" : "No free prompts left today"}
        {", and you don't have enough to pay for this one: it costs "}
        <span className="text-mcz-ember">−{v.cost} {PROMPTZ}</span>
        {v.holds ? (
          <>
            {" "}— you hold {v.holds.promptz} {PROMPTZ} and {money(v.holds.cents)} {MONEY}.
          </>
        ) : <>, from {PROMPTZ} first and then your balance.</>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => goToSpot("membershipz", "promptz-door")}>
          Get {PROMPTZ} — swap {SPINAZ} or buy
        </button>
        <span className="text-white/40">Free prompts renew tomorrow.</span>
      </div>
      <EarnInstead resource="promptz" title="Or earn some" />
    </div>
  );
}
