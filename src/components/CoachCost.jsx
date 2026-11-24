// What one coach run costs, said before it is pressed. The ONE rendering of the coach's price line, used by the coach screen
// (BossTake) and by any app that offers "get the coach's rating" (the DAW's bounce panel), so the same run is never priced two
// ways. `price` is GET /api/<app>/coach/. Red minus for what leaves, green for what a free allowance covers; never a bare number.
import { IN_SHELL as IN_SHELL_COACH } from "../standalone.js";

export function Cost({ price, trial }) {
  if (!price) return null;
  // The trial spends nothing the visitor owns — they have no wallet yet. Say
  // that up front too: a free thing whose price is unstated still reads risky.
  if (trial) {
    return <span className="text-[11px] text-emerald-300">Free — no account, nothing to pay</span>;
  }
  if (price.free_today) {
    // NOT "+1 🏷️". Nothing arrives — a take SPENDS one of the day's free
    // prompts. A green plus on something that costs you is the paradigm
    // pointing the wrong way, and it sat under the send button saying the
    // opposite of what the button does.
    return (
      <span className="text-[11px] text-emerald-300">
        Free today <span className="text-white/60">
          — uses 1 of the {price.daily_remaining} 🏷️ you have left
        </span>
      </span>
    );
  }
  const fromPromptz = price.promptz >= price.cost_cents;
  // Free prompts left, and still not free: the engine that writes the answer is dearer than a free prompt is priced
  // for (Fable). Say that, and the way to use a free one, instead of claiming the prompts are used up.
  const engine = price.think?.configured ? price.think?.engine : null;
  if (price.daily_remaining > 0 && engine) {
    return (
      <span className="text-[11px] text-mcz-ember">
        −{price.cost_cents} 🏷️{" "}
        <span className="text-white/50">
          from your {fromPromptz ? `${price.promptz} PromptZ` : "balance"} — today's free prompts don't cover {engine.name};
          pick a lower engine below to use one of your {price.daily_remaining}
        </span>
      </span>
    );
  }
  // In a shell nothing is for sale, so "balance" would be a door to nowhere: say
  // what is true — the free prompts renew tomorrow — and the price of a take from
  // PromptZ the member already holds, and nothing else.
  if (IN_SHELL_COACH) {
    return (
      <span className="text-[11px] text-mcz-ember">
        {price.promptz >= price.cost_cents
          ? <>−{price.cost_cents} 🏷️ <span className="text-white/50">from the {price.promptz} PromptZ you hold — today's free prompts are used and renew tomorrow</span></>
          : <><span className="text-white/55">Today's free prompts are used. They renew tomorrow.</span></>}
      </span>
    );
  }
  return (
    <span className="text-[11px] text-mcz-ember">
      −{price.cost_cents} 🏷️{" "}
      <span className="text-white/50">
        from your {fromPromptz ? `${price.promptz} PromptZ` : "balance"} — no free prompts left today
      </span>
    </span>
  );
}
