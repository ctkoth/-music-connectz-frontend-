// What to try to bring more feeling to a take, and what to change in the mix so the vocal can be
// heard — each as WHAT, WHY and HOW, in the coach's own words. Nothing here is worked out on the
// screen: the kinds, labels and wording are the server's (`feelz_tips`, `mix_tips`), a high FeelZ
// comes with no tips at all, and a tip the coach did not hear is not invented to fill the space.
function Wwh({ x }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[12px] text-white/85">{x.what}</p>
      {x.why && <p className="text-[11px] leading-snug text-white/55"><span className="text-white/35">Why: </span>{x.why}</p>}
      {x.how && <p className="text-[11px] leading-snug text-emerald-200/80"><span className="text-white/35">How: </span>{x.how}</p>}
    </div>
  );
}

/** `onGear` (optional) turns a Mic & gear / Room tip into a way to the priced gear advice. */
export function FeelzTips({ tips, onGear }) {
  if (!tips?.length) return null;
  return (
    <div className="space-y-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.03] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-300/80">To bring more feeling</p>
      {tips.map((t, i) => (
        <div key={i} className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-widest text-white/40">{t.label}</p>
          <Wwh x={t} />
          {onGear && (t.kind === "gear" || t.kind === "room") && (
            <button type="button" onClick={onGear} className="text-[11px] text-mcz-cyan underline">See gear advice for this take</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function MixTips({ tips }) {
  if (!tips?.length) return null;
  return (
    <div className="space-y-2 rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.03] p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-mcz-cyan/80">Mix suggestions — so the vocal can be heard</p>
      {tips.map((t, i) => (
        <div key={i} className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Helps {t.helps_label}</p>
          <Wwh x={t} />
        </div>
      ))}
    </div>
  );
}
