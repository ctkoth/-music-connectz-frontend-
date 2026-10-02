import { IconImg } from "../App.jsx";

// "PartnerZ❤️" on the deal or battle that made two FriendZ into PartnerZ —
// the third thing they finished together. The pairs are the server's record.
export default function PartnerzMark({ pairs }) {
  if (!pairs?.length) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <IconImg icon="partnerz.jpg" alt="" className="h-5 w-5 rounded" />
      <span className="rounded-full border border-mcz-pink/50 bg-mcz-pink/10 px-2 py-0.5 text-[11px] font-semibold text-mcz-pink">
        PartnerZ❤️ {pairs.map(([a, b]) => `@${a} × @${b}`).join(" · ")}
      </span>
    </div>
  );
}
