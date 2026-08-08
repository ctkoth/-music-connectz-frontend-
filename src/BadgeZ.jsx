// BadgeZ — a title you wear and an effect you feel.
//
// Every badge here changes a number the member can point at. That's the rule
// the catalogue is held to on the server, and this screen's job is to make the
// effect as visible as the artwork: the medal is the reward people show off,
// the effect line is the reward that actually pays.
//
// Three things this screen is careful about:
//
//   * Artwork where it exists, the emoji where it doesn't. A badge with no art
//     yet must not fall back to a generic logo — the emoji still means the
//     right thing.
//   * The privacy switch is per badge and only the holder sees it, because an
//     achievement is also a disclosure. "Straight Shooter" tells the room about
//     your deal history; "Sexy" tells them something else entirely.
//   * The whole catalogue is shown, including what you haven't earned, so
//     nothing is a surprise and the locked ones read as goals.
import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "./api.js";
import { asList } from "./shape.js";
import { CUSTOM_ICONS, IconImg } from "./App.jsx";

function Medal({ badge, className = "h-12 w-12" }) {
  // The registry guard matters: a badge naming art the frontend hasn't shipped
  // would render the MCZ logo, which says nothing. The emoji says everything.
  return CUSTOM_ICONS[badge.icon] ? (
    <IconImg icon={badge.icon} alt=""
             className={`${className} shrink-0 rounded-full object-cover shadow-neon`}
             fallback={<span className="text-2xl">{badge.emoji}</span>} />
  ) : (
    <span className={`${className} flex shrink-0 items-center justify-center text-2xl`}>
      {badge.emoji}
    </span>
  );
}

export default function BadgeZ({ username }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api(`/api/economy/badgez/${username ? `?username=${username}` : ""}`)
    .then(setData).catch(() => setData(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [username]);

  if (!data) return null;
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  async function patch(body) {
    setBusy(true);
    try { setData(await api("/api/economy/badgez/", { method: "PATCH", body })); }
    catch (e) { flash(e.message || "Couldn't change that."); }
    finally { setBusy(false); }
  }

  const held = asList(data.badges);
  const heldKeys = new Set(held.map((b) => b.key));
  const locked = asList(data.catalogue).filter((c) => !heldKeys.has(c.key));

  return (
    <div className="re-card space-y-3" data-tour="badgez">
      <div className="re-label flex items-center gap-2">
        <IconImg icon="badgez.png" alt="" className="h-5 w-5 rounded"
                 fallback={<span>🏅</span>} />
        BadgeZ
      </div>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-mcz-gold">{msg}</p>}

      {held.length === 0 ? (
        <p className="text-[12px] text-white/40">
          None yet. Everything below is earned from what you actually do.
        </p>
      ) : (
        <ul className="space-y-2">
          {held.map((b) => (
            <li key={b.key} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <Medal badge={b} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white/85">
                  {b.name}
                  {b.gifted && <span className="ml-2 text-[10px] text-white/35">gifted</span>}
                  {/* A badge that can lapse says so. Losing one you thought
                      was permanent is a worse surprise than knowing it tracks
                      a live number. */}
                  {b.temporary && (
                    <span className="ml-2 text-[10px] text-mcz-gold">while you hold it</span>
                  )}
                </p>
                <p className="text-[11px] leading-relaxed text-white/45">{b.desc}</p>
                {/* The effect, said as plainly as the artwork shows the title. */}
                <p className="mt-1 text-[11px] text-emerald-300">{b.effect_note}</p>
              </div>
              {data.mine && (
                <button className="shrink-0 text-white/30 hover:text-white" disabled={busy}
                        title={b.visible ? "Shown on your profile — hide it"
                                         : "Hidden. You keep the effect either way."}
                        onClick={() => patch({ key: b.key, visible: !b.visible })}>
                  {b.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.mine && asList(data.titles).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-white/35">Title you wear</p>
          <div className="flex flex-wrap gap-1.5">
            {asList(data.titles).map((t) => (
              <button key={t} disabled={busy}
                      className={`pill !text-[11px] ${data.title === t ? "!text-mcz-gold" : ""}`}
                      onClick={() => patch({ title: data.title === t ? "" : t })}>
                {data.title === t && <Check size={10} className="mr-1 inline" />}{t}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/35">
            Only badges you hold and show can be worn. Hiding one takes its title
            down too.
          </p>
        </div>
      )}

      {data.mine && locked.length > 0 && (
        <div className="space-y-1.5 border-t border-white/[0.08] pt-3">
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            Not yours yet
          </p>
          <ul className="space-y-1.5">
            {locked.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-[11px] opacity-60">
                <Medal badge={c} className="h-7 w-7" />
                <span className="min-w-0">
                  <span className="text-white/70">{c.name}</span>
                  {c.gifted && <span className="ml-1 text-[10px] text-white/35">gifted</span>}
                  <span className="block leading-relaxed text-white/40">{c.how}</span>
                  <span className="block text-emerald-300/70">{c.effect_note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
