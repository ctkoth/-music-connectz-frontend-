// The price of a press, drawn one way everywhere: a red minus with the resource emoji for
// what leaves, green for free. It sits ON the button or right beside it, before it is
// pressed (CLAUDE.md, the cost/gain rule). Several screens had their own copy of this;
// two were identical, and copies drift.
//
//   <Price amount={3} emoji={ENERGY} />           −3 ⚡
//   <Price amount={0} />                           Free
//   <Price amount={2} emoji={PROMPTZ} freeToday /> free today
//   <Gain amount={1} emoji={ENERGY} />             +1 ⚡
//
// It never invents a number: no amount (a failed quote) renders nothing.

export function Price({ amount, emoji = "", freeToday = false, freeLabel = "Free", className = "" }) {
  if (freeToday) return <span className={`text-emerald-300 ${className}`}>free today</span>;
  if (amount == null || Number.isNaN(Number(amount))) return null;
  if (Number(amount) <= 0) return <span className={`text-emerald-300 ${className}`}>{freeLabel}</span>;
  return <span className={`text-mcz-ember ${className}`}>−{Number(amount).toLocaleString()} {emoji}</span>;
}

export function Gain({ amount, emoji = "", className = "" }) {
  if (!amount || Number(amount) <= 0) return null;
  return <span className={`text-emerald-300 ${className}`}>+{Number(amount).toLocaleString()} {emoji}</span>;
}

export default Price;
