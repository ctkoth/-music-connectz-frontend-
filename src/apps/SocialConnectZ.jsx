// Social ConnectZ — the member directory.
//
// This screen used to render SIX INVENTED CREATORS. `NovaBeatz`, `SopranoSol`
// and four more were a hardcoded array, and the real endpoint that lists real
// members — `/api/economy/members/`, filters, gates, distance and all — had no
// caller anywhere in the mounted app. A discovery surface that discovers
// nobody is the worst version of the read-only screen this codebase has a rule
// against: it is not just a dead end, it is a dead end with strangers painted
// on the wall.
//
// So: real members, and THE VIEWER SETS THE ORDER. The orders come off the
// server with the results rather than being retyped here, for the same reason
// tier numbers do — a picker offering a sort the server cannot do is a control
// that quietly does nothing.
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, Loader2, ArrowUpRight } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { openMember } from "../member.js";
import { useOpenView } from "../openTo.js";
import { NATIONALITIES } from "./socialData.js";

const FLAG = Object.fromEntries(NATIONALITIES.map(([f, n]) => [n, f]));

const initials = (name) => (name || "?").slice(0, 2).toUpperCase();

export default function SocialConnectZ() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState("");
  const [nat, setNat] = useState("");
  const [q, setQ] = useState("");
  const liveRef = useRef(null);

  const load = (order) => {
    setBusy(true);
    api(`/api/economy/members/${order ? `?sort=${encodeURIComponent(order)}` : ""}`)
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load the directory."))
      .finally(() => setBusy(false));
  };
  useEffect(() => { load(sort); }, [sort]);

  // The header's "N members" pill lands here, in whatever order it asked for.
  useOpenView("social", (view) => {
    const want = typeof view === "string" ? view : view?.sort;
    if (typeof want === "string") setSort(want);
  });

  const members = asList(data?.members);
  const orders = asList(data?.orders);

  // Heritage and text stay client-side: they filter the page you are looking
  // at, and a round trip to narrow six visible cards would be slower than the
  // typing that caused it.
  const shown = useMemo(() => members.filter((m) => {
    const natMatch = !nat || (m.nationalities || []).includes(nat);
    const text = `${m.username} ${m.display_name} ${m.badge_title || ""}`.toLowerCase();
    return natMatch && (!q || text.includes(q.toLowerCase()));
  }), [members, nat, q]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="social_connectz.png" alt="Social ConnectZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">Social ConnectZ</h2>
          <p className="text-xs text-white/45">Every member on Music ConnectZ, in the order you pick.</p>
        </div>
      </header>

      {err && (
        <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>
      )}

      <div className="re-card space-y-3" data-tour="social-feed">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/40 px-3">
          <Search size={16} className="text-white/40" />
          <input
            className="w-full bg-transparent py-2 text-sm text-white placeholder-white/30 outline-none"
            placeholder="Search name or title…"
            aria-label="Search members by name or title"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Order. A radio group in chip clothing — `aria-pressed` so a screen
            reader is told which one is on, not just that seven buttons exist. */}
        <div className="space-y-1">
          <p className="re-label" id="mcz-order-label">Order</p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="mcz-order-label">
            {orders.map((o) => (
              <button
                key={o.key}
                onClick={() => setSort(o.key === sort ? "" : o.key)}
                aria-pressed={sort === o.key}
                title={o.note}
                className={`pill text-[11px] ${sort === o.key ? "!border-mcz-cyan/70 !text-white" : ""}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {sort && (
            <p className="text-[11px] text-white/40">
              {orders.find((o) => o.key === sort)?.note}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <IconImg icon="nationalitiez.png" alt="" className="h-6 w-6 rounded" />
          <select
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
            aria-label="Filter by NationalitieZ heritage"
            value={nat}
            onChange={(e) => setNat(e.target.value)}
          >
            <option value="">🌐 All NationalitieZ</option>
            {NATIONALITIES.map(([flag, name]) => (
              <option key={name} value={name}>{flag} {name}</option>
            ))}
          </select>
          {nat && <button className="re-link shrink-0 px-2 text-xs" onClick={() => setNat("")}>Clear</button>}
        </div>

        {/* The count says what it counts. "6 creators" over a page of 100 out
            of 4,000 is a number a member cannot check, which makes it worse
            than no number. */}
        <p className="re-label" role="status" aria-live="polite" ref={liveRef}>
          {busy ? "Loading…"
            : data
            ? `${shown.length} shown${data.matched > members.length
                ? ` · ${members.length} of ${data.matched} members loaded`
                : ` of ${data.matched} member${data.matched === 1 ? "" : "s"}`}`
            : ""}
        </p>
      </div>

      {!data && !err && (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading the directory…
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((m) => (
          <button
            key={m.username}
            onClick={() => openMember(m.username)}
            className="re-card text-left transition hover:border-mcz-cyan/40 hover:shadow-neon"
            title={`Open ${m.username}'s profile`}
          >
            <div className="mb-2 flex items-center gap-3">
              {m.avatar
                ? <img src={m.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                : <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-bold text-white/60">{initials(m.display_name || m.username)}</span>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{m.display_name || m.username}</div>
                <div className="truncate text-[11px] text-white/50">
                  @{m.username}{m.badge_title ? ` · ${m.badge_title}` : ""}
                </div>
              </div>
              <ArrowUpRight size={13} className="shrink-0 text-white/30" />
            </div>

            {/* Only facts the server actually measured. A blank is a blank —
                there is no filler here standing in for a number nobody has. */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {m.overall != null && <span className="pill">⭐ {m.overall} rated</span>}
              {m.followers > 0 && <span className="pill">{m.followers} follower{m.followers === 1 ? "" : "s"}</span>}
              {m.experience_years != null && <span className="pill">{m.experience_years}y experience</span>}
              {m.distance_km != null && (
                <span className="pill"><MapPin size={10} className="inline" /> {Math.round(m.distance_km)} km</span>
              )}
              {m.tier && m.tier !== "free" && <span className="pill uppercase !text-mcz-cyan">{m.tier}</span>}
            </div>

            {(m.nationalities || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(m.nationalities || []).map((n) => (
                  <span
                    key={n}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setNat(n); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setNat(n); }
                    }}
                    className="pill cursor-pointer hover:!text-white"
                    title={`Filter by ${n}`}
                  >
                    {FLAG[n] || "🌐"} {n}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {data && shown.length === 0 && !busy && (
        <p className="text-sm text-white/45">
          {members.length === 0
            ? "Nobody else has joined yet — you're early."
            : "Nobody on this page matches that filter."}
        </p>
      )}
    </div>
  );
}
