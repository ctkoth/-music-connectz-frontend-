import { useEffect, useState } from "react";
import { Loader2, Lock, UserRound } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import { goToSpot } from "../goto.js";
import { SignLink, openHoroscope } from "../components/Horoscope.jsx";
import ShareSheet from "../components/ShareSheet.jsx";

// PreferenceZ, SubstanceZ and ZodiacZ — one screen, three metrics. Every option,
// how many members DECLARED it, and the members behind it one tap away. The
// options, counts, adult wall and "where to set yours" all come from
// /api/economy/metricz/<kind>/; the members from the one member search
// (/api/economy/members/), so a card here is the card everywhere else.

const ICON = { zodiacz: "zodiacz.png", substancez: "substancez.png", preferencez: "preferencez.png" };

function takeSign() {
  try { const v = sessionStorage.getItem("mcz_zodiacz_sign"); sessionStorage.removeItem("mcz_zodiacz_sign"); return v; } catch { return null; }
}

function Card({ m }) {
  return (
    <div className="re-card space-y-2">
      <div className="flex items-center gap-3">
        {m.avatar
          ? <img src={m.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
          : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"><UserRound size={18} className="text-white/40" /></div>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{m.display_name || m.username}</p>
          <div className="mt-0.5 flex flex-wrap gap-1 text-[11px]">
            <SignLink sign={m.sign} />
            {m.sober && <span className="pill !border-emerald-300/40 !text-emerald-300">sober</span>}
          </div>
        </div>
      </div>
      <MemberName username={m.username} />
    </div>
  );
}

export default function MetricZ({ kind }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState(() => (kind === "zodiacz" ? takeSign() : null));
  const [members, setMembers] = useState(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    api(`/api/economy/metricz/${kind}/`).then(setD).catch((e) => setErr(e.message));
  }, [kind]);

  useEffect(() => {
    if (!pick || !d?.param) { setMembers(null); return; }
    setMembers(undefined);
    api(`/api/economy/members/?${d.param}=${encodeURIComponent(pick)}`)
      .then((r) => setMembers(r.members || [])).catch(() => setMembers([]));
  }, [pick, d?.param]);

  const chosen = d?.options?.find((o) => o.key === pick);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon={ICON[kind]} alt={d?.label || ""} className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">{d?.label || "…"}</h2>
          <p className="text-sm text-white/60">{d?.say}</p>
        </div>
      </header>

      {err && <p className="text-sm text-mcz-ember">{err}</p>}
      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d?.locked && (
        <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
          <Lock size={14} /> {d.locked}
        </p>
      )}

      {d && !d.locked && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
            {d.mine?.length
              ? <span>Yours: {d.options.filter((o) => o.mine).map((o) => `${o.emoji} ${o.label}`).join(", ")}</span>
              : <span>You haven't said yet.</span>}
            {d.mine?.length > 0 && (
              <button className="re-link" onClick={() => setSharing((v) => !v)}>Share yours</button>
            )}
            {d.set_in && (
              <button className="re-link" onClick={() => goToSpot(d.set_in.tab, d.set_in.target)}>
                {d.mine?.length ? "Change it in ProfileZ" : "Set yours in ProfileZ"}
              </button>
            )}
            {kind === "zodiacz" && d.mine?.[0] && (
              <>
                <button className="re-link" onClick={() => openHoroscope(d.mine[0])}>Your horoscope today</button>
                <button data-tour="zodiacz-advanced" className="re-link !text-mcz-gold"
                  onClick={() => openHoroscope(d.mine[0], "advanced")}>Advanced reading · StatZ</button>
              </>
            )}
          </div>

          {sharing && (() => {
            const mineOpts = d.options.filter((o) => o.mine);
            const label = mineOpts.map((o) => `${o.emoji} ${o.label}`).join(", ");
            const text = kind === "zodiacz" && mineOpts[0]?.read ? `${label} — ${mineOpts[0].read}`
              : kind === "substancez" ? `What I use: ${label}` : kind === "preferencez" ? `Into: ${label}` : label;
            // Opens carry the metric somewhere it DOES something: the people
            // who share it, the profile field that sets it, today's reading.
            const opens = [
              { label: `Members with ${mineOpts[0]?.label || "it"}`, tab: kind, target: "" },
              { label: "VybeZ — filter by it", tab: "vybez", target: "" },
              { label: "Change it in ProfileZ", tab: d.set_in.tab, target: d.set_in.target },
            ];
            return <ShareSheet onClose={() => setSharing(false)}
              item={{ kind: "metric", title: `My ${d.label}`, text, opens }} />;
          })()}

          <div className={`grid gap-2 ${kind === "preferencez" ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
            {d.options.map((o) => (
              <button key={o.key} onClick={() => setPick(pick === o.key ? null : o.key)}
                className={`rounded-xl border p-3 text-left transition ${pick === o.key
                  ? "border-mcz-cyan bg-mcz-cyan/10 shadow-neon"
                  : o.mine ? "border-mcz-gold/50 bg-mcz-gold/5" : "border-white/10 bg-black/30 hover:border-white/30"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="text-lg font-bold tabular-nums">{o.count}</span>
                </div>
                <p className="mt-1 text-sm font-semibold">{o.label}</p>
                {o.dates && <p className="text-[10px] text-white/45">{o.dates}</p>}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/40">
            Counts are members who declared it. {d.undeclared} haven't said
            {kind === "substancez" && d.sober ? `, and ${d.sober} are sober by choice` : ""}.
          </p>

          {chosen && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{chosen.emoji} {chosen.label} · members</h3>
                {chosen.read && <p className="w-full text-xs italic text-white/65">{chosen.element} · {chosen.read}</p>}
                {kind === "zodiacz" && (
                  <span className="flex flex-wrap gap-2">
                    <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => openHoroscope(chosen.key)}>
                      Today's {chosen.label} horoscope · <span className="text-emerald-300">free</span>
                    </button>
                    <button className="re-btn !w-auto px-3 py-1 text-xs"
                      onClick={() => openHoroscope(chosen.key, "advanced")}>
                      Advanced · <span className="text-mcz-gold">StatZ</span>
                    </button>
                  </span>
                )}
              </div>
              {members === undefined && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={14} /> Finding members…</p>}
              {members?.length === 0 && <p className="text-sm text-white/55">Nobody else here has said {chosen.label} yet.</p>}
              {members?.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((m) => <Card key={m.username} m={m} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
