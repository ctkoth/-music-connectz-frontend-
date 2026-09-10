// VenueZ — CollabZ when everyone is in the same room.
//
// The backend has been complete since it was written and no screen ever called
// it: the icons were in `App.jsx`'s icon map, and there was no tab, no route
// and no component. This is that screen.
//
// Three things about it are load-bearing, and all three are rules the server
// already enforces — rendered here so a member meets them BEFORE committing
// rather than after:
//
//   1. ONE RULE decides which way the money goes, and it reads the same in
//      both directions: whoever RECEIVES the skill pays for it, and the price
//      comes from whoever PROVIDES it. So a performance charges the visitor at
//      the HOST's rates, and a session charges the host at the VISITOR's. A
//      screen that only ever rendered "what this costs you" would be wrong
//      half the time, which is why <Quote> takes a side and never assumes one.
//
//   2. THE AREA IS PUBLIC, THE ADDRESS IS NOT. `area` is enough to decide
//      whether you can get there; the doorstep is released only once the host
//      has ACCEPTED you. That is a safety rule, not a UI one — a public
//      address beside the hours its owner will be out is a different product
//      from this one — so the absence is explained here rather than left as a
//      blank field somebody reads as a bug.
//
//   3. ⚡ IS THE ASKER'S, AND ONLY FOR SKILLS THE ASKER NAMED. Asking for a
//      seat costs the combined price of the skills you say you're bringing,
//      off your own rates. Naming none costs nothing and prices the money off
//      the room's own list. Both halves are stated on the control, and the
//      quote comes from the server's own `quote_for` via /quote/ so what the
//      button says is what the booking will do.
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight, CalendarClock, Check, Handshake, Loader2, MapPin, Mic2, Plus,
  ShieldCheck, Star, Users, X,
} from "lucide-react";
import { api } from "../api.js";
import { useSay } from "../voice.js";
import { P } from "../phrases.js";
import { playSound } from "../sound.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import { ENERGY, MONEY } from "../resources.js";
import Refused, { isInsufficient } from "../Refused.jsx";
import SkillsUsed from "../SkillsUsed.jsx";
import { labelForSkill } from "../personaSkills.js";
import MentionText from "../MentionParser.jsx";

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const KIND = {
  performance: {
    label: "Performance",
    icon: Mic2,
    // Said as the rule, not as a category name. "Performance" alone does not
    // tell anybody which way the money goes.
    rule: "The visitor came for the host — so the visitor pays, at the host's rates.",
  },
  session: {
    label: "Session 🤝",
    icon: Handshake,
    rule: "The host wanted the room full — so the host pays, at the visitor's rates.",
  },
  free: { label: "Free", icon: Users, rule: "Nobody pays." },
};

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit",
  });
};

const BOOKING_LABEL = {
  requested: "Asked — waiting on the host",
  accepted: "Accepted — you're in",
  declined: "Declined",
  cancelled: "Cancelled",
  attended: "Attended",
};

/** The money, from the viewer's side, in the paradigm's colours.
 *
 * `mine` is whether the viewer hosts this room. The quote names the sides
 * ("host" / "visitor") rather than usernames precisely so this can be rendered
 * before a visitor is chosen — so turning a side into "you" happens here.
 */
function Quote({ q, mine, host }) {
  if (!q) return null;
  if (q.free) {
    return <span className="text-[12px] text-white/45">Free — nobody pays.</span>;
  }
  const iPay = mine ? q.payer_is_host : !q.payer_is_host;
  const other = mine ? "the visitor" : `@${host}`;

  // A zero that is NOT "free", which is a different fact and has to read as
  // one: "+$0.00 — the host pays you" makes a room nobody has priced yet look
  // like a room worth nothing. Which zero it is depends on who provides.
  if (!q.amount_cents) {
    const fromVisitor = q.payer_is_host && !q.lines?.length;
    return (
      <p className="text-[12px] text-white/45">
        {fromVisitor
          ? (mine
              ? "Priced from what each visitor brings — nothing named yet."
              : "Priced from what you bring. Name your skills below to see it.")
          : `Nothing on this one is priced${mine ? "" : ` by @${host}`} yet, so it costs nothing.`}
        {q.unpriced?.length > 0 && ` Unpriced: ${q.unpriced.map(labelForSkill).join(", ")}.`}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[13px]">
        {iPay ? (
          <span className="font-semibold text-mcz-ember">−{money(q.amount_cents)} {MONEY}</span>
        ) : (
          <span className="font-semibold text-emerald-300">+{money(q.amount_cents)} {MONEY}</span>
        )}
        <span className="ml-1.5 text-white/45">
          {iPay ? `you pay ${other}` : `${other} pays you`}
        </span>
      </p>

      {/* Per hour multiplies; an agreed total is the total however long it
          runs. Both are said, because "$50" means two different things. */}
      <p className="text-[10px] text-white/35">
        {q.basis === "hour"
          ? `${money(q.hourly_cents)} an hour × ${q.hours}h`
          : `Agreed total for the ${q.hours}h — the total however long it runs.`}
      </p>

      {Array.isArray(q.lines) && q.lines.length > 0 && (
        <ul className="space-y-0.5 text-[11px]">
          {q.lines.map((l, i) => (
            <li key={`${l.skill}-${i}`} className="flex justify-between gap-3 text-white/45">
              <span className="truncate">{labelForSkill(l.skill)}</span>
              <span className={l.cents ? "text-white/65" : "text-white/25"}>
                {l.cents ? money(l.cents) : "unpriced"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Named rather than dropped: a silent omission reads as a discount and
          then surprises somebody at the door. */}
      {q.unpriced?.length > 0 && (
        <p className="text-[10px] text-white/35">
          {q.unpriced.length} of these {q.unpriced.length === 1 ? "is" : "are"} unpriced
          {mine || q.payer_is_host ? "" : ` by @${host}`} and add nothing:{" "}
          {q.unpriced.map(labelForSkill).join(", ")}.
        </p>
      )}
    </div>
  );
}

/** Ask for a seat: the skills, the hours, and what both cost, before the ask. */
function AskPanel({ venue, onDone, onFlash }) {
  const talk = useSay();
  const [skills, setSkills] = useState([]);
  const [hours, setHours] = useState(venue.hours || 1);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [short, setShort] = useState(null);

  // The price for what is actually being asked for. The card's own quote is
  // the room's defaults, so the moment either input moves it stops being the
  // figure that will be charged — which is the whole reason /quote/ exists.
  useEffect(() => {
    let live = true;
    const p = new URLSearchParams({ hours: String(hours) });
    if (skills.length) p.set("skills", skills.join(","));
    api(`/api/economy/venuez/${venue.id}/quote/?${p}`)
      .then((d) => live && setQuote(d))
      .catch(() => live && setQuote(null));
    // A refusal was about a different ask. Dropping a skill must not leave the
    // old shortfall sitting under a price that has since changed.
    setShort(null);
    return () => { live = false; };
  }, [venue.id, skills, hours]);

  const energy = quote?.energy;
  const blocked = energy?.cost > 0 && !energy.affordable;

  // Knowing it is unaffordable BEFORE the button is pressed is the whole point
  // of quoting — but disabling the button on its own hides the reason, which
  // turns the one moment a member has decided they want the thing into a dead
  // grey control. So the same panel a refusal would have shown is rendered
  // from the quote, out of the server's own numbers. `Refused` reads
  // `err.data || err`, so the quote's figures go in as they came back rather
  // than being re-derived here.
  const refusalFromQuote = blocked && {
    insufficient: true,
    resource: "energy",
    detail: `Asking for this seat costs ${energy.cost} ⚡ and you have ${energy.available}.`,
    energy_needed: energy.cost,
    energy_available: energy.available,
    energy_short: energy.short,
    lines: energy.lines,
  };

  async function ask() {
    setBusy(true); setShort(null);
    try {
      await api(`/api/economy/venuez/${venue.id}/book/`, {
        method: "POST", body: { skills, hours: Number(hours) || 1 },
      });
      playSound("collab");
      onFlash(talk(P.venue_asked));
      onDone();
    } catch (e) {
      // A priced refusal stays on screen with the way out of it; a flash that
      // clears in three seconds would take the answer with it.
      if (isInsufficient(e)) { setShort(e); playSound("error"); return; }
      onFlash(e.message || "Couldn't ask for that seat.");
      playSound("error");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
          How long
        </label>
        <input type="number" min="1" max="24" value={hours}
               onChange={(e) => setHours(e.target.value)}
               className="neon-input !py-1.5 mt-1 text-xs" />
      </div>

      <SkillsUsed value={skills} onChange={setSkills} label="What you're bringing" />

      {/* The distinction that decides both prices, said plainly, because it is
          not guessable: naming skills is what makes this cost ⚡, and on a
          session it is also what the host will be paying you for. */}
      <p className="text-[10px] leading-relaxed text-white/35">
        {skills.length === 0
          ? "Name nothing and the room's own list prices it — that costs you no ⚡, "
            + "because you didn't write it."
          : "You named these, so they price the money AND cost ⚡ to ask, both off "
            + "your own rates. Skills you haven't priced cost nothing."}
      </p>

      <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
        <Quote q={quote?.quote} mine={false} host={venue.host} />
        <p className="text-[12px]">
          {energy?.cost > 0 ? (
            <>
              <span className="font-semibold text-mcz-ember">−{energy.cost} {ENERGY}</span>
              <span className="ml-1.5 text-white/45">to ask</span>
            </>
          ) : (
            <span className="text-white/45">Asking costs no {ENERGY}.</span>
          )}
        </p>
      </div>

      <button className="neon-btn-primary !w-auto px-5" onClick={ask}
              disabled={busy || blocked}>
        {busy ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
        {" "}Ask for a seat
        {energy?.cost > 0 && (
          <span className="ml-1 text-mcz-ember">−{energy.cost} {ENERGY}</span>
        )}
      </button>

      {/* A refused ask takes nothing — worth saying, because the rule elsewhere
          in the app is that a post is charged whatever it can afford. */}
      <p className="text-[10px] text-white/35">
        Nothing is charged if the host says no, and nothing is charged if this
        is refused.
      </p>

      {(short || refusalFromQuote) && <Refused err={short || refusalFromQuote} />}
    </div>
  );
}

/** One asked-for seat, as the HOST sees it: who, what they bring, what it owes. */
function BookingRow({ b, venue, onRespond, onRateGuest, busy }) {
  const happened = new Date(venue.starts_at) <= new Date();
  return (
    <li className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">@{b.visitor}</p>
          <p className="text-[10px] text-white/40">
            {BOOKING_LABEL[b.status] || b.status} · {b.hours}h
          </p>
        </div>
        <span className={`pill shrink-0 ${b.payer_is_host ? "!text-mcz-ember" : "!text-emerald-300"}`}>
          {b.payer_is_host ? "−" : "+"}{money(b.quoted_cents)} {MONEY}
        </span>
      </div>

      {b.skills?.length > 0 && (
        <p className="text-[10px] text-white/40">
          Bringing: {b.skills.map(labelForSkill).join(", ")}
        </p>
      )}

      {b.status === "requested" && (
        <div className="flex flex-wrap gap-2">
          <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs"
                  disabled={busy} onClick={() => onRespond(b.id, true)}>
            <Check size={12} /> Let them in
          </button>
          <button className="re-btn !w-auto px-3 py-1.5 text-xs"
                  disabled={busy} onClick={() => onRespond(b.id, false)}>
            <X size={12} /> Decline
          </button>
        </div>
      )}

      {/* The host's half of a two-sided rating — they were both there, and each
          knows something the other cannot report about themselves. */}
      {happened && ["accepted", "attended"].includes(b.status) && (
        <button className="re-btn !w-auto px-3 py-1.5 text-xs"
                onClick={() => onRateGuest(b)}>
          <Star size={12} /> Rate @{b.visitor}
        </button>
      )}
    </li>
  );
}

function Venue({ v, onChanged, onFlash }) {
  const talk = useSay();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const kind = KIND[v.kind] || KIND.free;
  const KindIcon = kind.icon;

  const act = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) onFlash(ok); onChanged(); }
    catch (e) { onFlash(e.message || "That didn't go through."); }
    finally { setBusy(false); }
  };

  const respond = (id, accept) => act(
    () => api(`/api/economy/venuez/bookings/${id}/respond/`, { method: "POST", body: { accept } }),
    accept ? "They're in — they can see the address now." : "Declined.",
  );

  const cancelBooking = (id) => act(
    () => api(`/api/economy/venuez/bookings/${id}/cancel/`, { method: "POST", body: {} }),
    "Cancelled.",
  );

  const callOff = () => act(
    () => api(`/api/economy/venuez/${v.id}/`, { method: "DELETE" }),
    "Called off. Everyone who asked can see that.",
  );

  const rate = async (booking) => {
    const who = booking ? `@${booking.visitor}` : "this night";
    const raw = window.prompt(`Rate ${who} 1–10`);
    const score = Number(raw);
    if (!raw || !Number.isFinite(score) || score < 1 || score > 10) return;
    await act(
      () => api(`/api/economy/venuez/${v.id}/rate/`, {
        method: "POST",
        body: { score: Math.round(score), ...(booking ? { booking: booking.id } : {}) },
      }),
      talk(P.venue_rated(Math.round(score))),
    );
    playSound("rating_given");
  };

  return (
    <div className="neon-frame space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{v.title}</p>
          <p className="text-xs text-white/55">
            by @{v.host} · <KindIcon size={11} className="inline" /> {kind.label}
            {v.status === "cancelled" && (
              <span className="ml-1 text-mcz-ember">· called off</span>
            )}
          </p>
        </div>
        {/* "3/8" reads as easily as three taken as three left. Say which. */}
        <span className="pill flex shrink-0 items-center gap-1"
              title={`${v.capacity} seats in total`}>
          <Users size={11} /> {v.seats_left} left
        </span>
      </div>

      <p className="text-[11px] text-white/40">{kind.rule}</p>

      {v.description && (
        <p className="text-[12px] text-white/70"><MentionText text={v.description} /></p>
      )}

      <div className="space-y-1 text-[12px] text-white/65">
        <p className="flex items-center gap-1.5">
          <CalendarClock size={12} className="text-mcz-cyan" /> {when(v.starts_at)} · {v.hours}h
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin size={12} className="text-mcz-cyan" /> {v.area}
        </p>
        {/* The doorstep, or why it isn't here. A blank field reads as a bug;
            an absence with a reason reads as the safety rule it is. */}
        {v.address ? (
          <p className="flex items-center gap-1.5 text-emerald-300">
            <ShieldCheck size={12} /> {v.address}
          </p>
        ) : !v.mine && (
          <p className="text-[10px] text-white/35">
            {v.my_booking?.status === "requested"
              ? "The address comes when the host says yes."
              : "The area is public; the address is shared once you're accepted."}
          </p>
        )}
        {v.min_age > 0 && (
          <p className="text-[11px] text-mcz-gold">{v.min_age}+ only.</p>
        )}
      </div>

      {v.skills?.length > 0 && (
        <p className="text-[10px] text-white/40">The room's list: {v.skills.map(labelForSkill).join(", ")}</p>
      )}

      {/* The money, before anything is agreed to, from this viewer's side.
          This one is SPECULATIVE — the room's defaults — so it is dropped the
          moment a real figure exists: while the ask panel is open (that panel
          quotes what is actually being asked for) and once a booking is made
          (the booking carries the frozen quote). Two prices on one screen
          leaves a member working out which of them is the real one, and the
          speculative one is never the answer. */}
      {!asking && !v.my_booking && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <Quote q={v.quote} mine={v.mine} host={v.host} />
        </div>
      )}

      {/* ---- The visitor's side ------------------------------------------ */}
      {!v.mine && v.my_booking && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-[12px] text-white/70">
            {BOOKING_LABEL[v.my_booking.status] || v.my_booking.status}
            {v.my_booking.quoted_cents > 0 && (
              <span className={`ml-1.5 ${v.my_booking.payer_is_host ? "text-emerald-300" : "text-mcz-ember"}`}>
                {v.my_booking.payer_is_host ? "+" : "−"}{money(v.my_booking.quoted_cents)} {MONEY}
              </span>
            )}
          </span>
          {!["cancelled", "attended", "declined"].includes(v.my_booking.status) && (
            <button className="re-btn !w-auto px-3 py-1 text-[11px]" disabled={busy}
                    onClick={() => cancelBooking(v.my_booking.id)}>
              Withdraw
            </button>
          )}
        </div>
      )}

      {!v.mine && !v.my_booking && (
        asking ? (
          <AskPanel venue={v} onFlash={onFlash}
                    onDone={() => { setAsking(false); onChanged(); }} />
        ) : (
          <div>
            <button className="neon-btn-primary !w-auto px-5" disabled={!v.can_book}
                    onClick={() => setAsking(true)}>
              <Plus size={14} /> Ask for a seat
            </button>
            {/* Every refusal is a sentence somebody can act on, so it is shown
                rather than the button silently doing nothing. */}
            {!v.can_book && v.why_not && (
              <p className="mt-1 text-[11px] text-white/45">{v.why_not}</p>
            )}
          </div>
        )
      )}

      {/* ---- The host's side --------------------------------------------- */}
      {v.mine && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
            Who's asked ({v.bookings?.length || 0})
          </p>
          {v.bookings?.length ? (
            <ul className="space-y-2">
              {v.bookings.map((b) => (
                <BookingRow key={b.id} b={b} venue={v} busy={busy}
                            onRespond={respond} onRateGuest={rate} />
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-white/40">Nobody yet.</p>
          )}
          {v.status !== "cancelled" && (
            <button className="re-btn !w-auto px-3 py-1.5 text-xs" disabled={busy}
                    onClick={callOff}>
              Call it off
            </button>
          )}
        </div>
      )}

      {/* ---- Rating the night -------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
        <span className="text-[11px] text-white/45">
          {v.rating?.count > 0
            ? <>Rated {v.rating.median}/10 by {v.rating.count}</>
            : "Not rated yet"}
          {v.rating?.mine != null && (
            <span className="ml-1 text-mcz-cyan">· you gave {v.rating.mine}</span>
          )}
        </span>
        {v.rating?.can_rate ? (
          <button className="re-btn !w-auto px-3 py-1 text-[11px]" onClick={() => rate(null)}>
            <Star size={11} /> Rate the night
          </button>
        ) : (
          // Attendance-gated on purpose: somebody who wasn't in the room would
          // be rating the description, which is a score off form completeness.
          v.rating?.why_not && (
            <span className="text-[10px] text-white/30">{v.rating.why_not}</span>
          )
        )}
      </div>

      {/* Nothing is a dead end: a room full of people who could work together
          opens into the app that handles that. The server names the door. */}
      {v.open_in?.map((d) => (
        <button key={d.target}
                className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
                onClick={() => goToSpot(d.app, d.target)}>
          <Handshake size={12} className="shrink-0 text-mcz-cyan" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] text-white/80">{d.label}</span>
            <span className="block text-[10px] text-white/35">{d.what}</span>
          </span>
          <ArrowRight size={12} className="shrink-0 text-white/25" />
        </button>
      ))}
    </div>
  );
}

function HostForm({ onCreated, onFlash }) {
  const talk = useSay();
  const [f, setF] = useState({
    title: "", area: "", address: "", kind: "performance", starts_at: "",
    hours: 2, basis: "hour", capacity: 1, min_age: 0, description: "",
  });
  const [skills, setSkills] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function create() {
    if (!f.title.trim() || !f.area.trim() || !f.starts_at) {
      onFlash("A room needs a title, an area and a time.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/economy/venuez/", {
        method: "POST",
        body: {
          ...f,
          title: f.title.trim(), area: f.area.trim(), address: f.address.trim(),
          hours: Number(f.hours) || 1,
          capacity: Number(f.capacity) || 1,
          min_age: Number(f.min_age) || 0,
          skills,
        },
      });
      setF({ ...f, title: "", address: "", description: "", starts_at: "" });
      setSkills([]);
      onFlash(talk(P.venue_hosted));
      playSound("collab");
      onCreated();
    } catch (e) {
      onFlash(e.message || "Couldn't put that room up.");
      playSound("error");
    } finally { setBusy(false); }
  }

  return (
    <div data-tour="venuez-host" className="neon-frame space-y-3 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
        Host a room
      </p>

      <input className="neon-input !py-2 text-xs" placeholder="What is it?"
             value={f.title} onChange={set("title")} />

      <div className="space-y-1">
        <select className="neon-input !py-2 text-xs" value={f.kind} onChange={set("kind")}>
          <option value="performance">Performance — they come for you</option>
          <option value="session">Session 🤝 — you want the room full</option>
          <option value="free">Free — nobody pays</option>
        </select>
        {/* Which way the money goes, said as you choose it rather than found
            out afterwards by whoever ends up owing. */}
        <p className="text-[10px] text-white/40">{(KIND[f.kind] || KIND.free).rule}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input className="neon-input !py-2 text-xs" type="datetime-local"
               value={f.starts_at} onChange={set("starts_at")} />
        <input className="neon-input !py-2 text-xs" type="number" min="1" max="24"
               placeholder="Hours" value={f.hours} onChange={set("hours")} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className="neon-input !py-2 text-xs" value={f.basis} onChange={set("basis")}>
          <option value="hour">Per hour</option>
          <option value="total">Agreed total</option>
        </select>
        <input className="neon-input !py-2 text-xs" type="number" min="1" max="500"
               placeholder="Seats" value={f.capacity} onChange={set("capacity")} />
      </div>

      <input className="neon-input !py-2 text-xs" placeholder="Area — a city or neighbourhood (public)"
             value={f.area} onChange={set("area")} />
      <div className="space-y-1">
        <input className="neon-input !py-2 text-xs" placeholder="Address — the doorstep (optional)"
               value={f.address} onChange={set("address")} />
        {/* The safety rule, at the field it governs, so nobody has to trust
            that we do the right thing with it. */}
        <p className="text-[10px] text-white/35">
          Only people whose booking you ACCEPT ever see this. It is never on the
          listing.
        </p>
      </div>

      <div className="space-y-1">
        <input className="neon-input !py-2 text-xs" type="number" min="0" max="99"
               placeholder="Minimum age (0 = anyone)"
               value={f.min_age} onChange={set("min_age")} />
        <p className="text-[10px] text-white/35">
          Enforced at the door and again when you accept, not left to a line in
          the description.
        </p>
      </div>

      <textarea className="neon-input !py-2 text-xs" rows={3} placeholder="Anything else?"
                value={f.description} onChange={set("description")} />

      <SkillsUsed value={skills} onChange={setSkills} label="What's on offer here" />
      <p className="text-[10px] leading-relaxed text-white/35">
        {f.kind === "session"
          ? "On a session this is what you're asking people to bring — each visitor's "
            + "own rates price what you'll owe them."
          : f.kind === "performance"
            ? "On a performance these price off YOUR rates, and that is what a visitor pays."
            : "Nobody pays for a free room, so these are description rather than price."}
      </p>

      <button className="neon-btn-primary !w-auto px-5" onClick={create} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
        {" "}Put the room up
      </button>
      <p className="text-[10px] text-white/35">
        Hosting costs nothing. Money moves per the rule above, once somebody is in.
      </p>
    </div>
  );
}

export default function VenueZ() {
  const [venues, setVenues] = useState(null);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("rooms");

  const load = useCallback(async () => {
    try {
      const d = await api("/api/economy/venuez/");
      setVenues(asList(d?.venues ?? d));
    } catch (e) {
      setMsg(e.message || "Couldn't load VenueZ.");
      setVenues([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const mine = (venues || []).filter((v) => v.mine);
  const theirs = (venues || []).filter((v) => !v.mine);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="venuez.png" alt="VenueZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#facc15" }}>
            VenueZ
          </h2>
          <p className="text-sm text-white/60">
            CollabZ when everyone's in the same room. Whoever receives the skill
            pays for it, and the price comes from whoever brings it.
          </p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      <div className="flex gap-2">
        {[["rooms", `Rooms${theirs.length ? ` (${theirs.length})` : ""}`],
          ["mine", `Yours${mine.length ? ` (${mine.length})` : ""}`],
          ["host", "Host one"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
                  className={`pill ${tab === k ? "!border-mcz-gold/60 !text-mcz-gold" : ""}`}>
            {label}
          </button>
        ))}
      </div>

      {venues === null && (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      )}

      {tab === "host" && <HostForm onCreated={() => { load(); setTab("mine"); }} onFlash={flash} />}

      {tab === "rooms" && venues && (
        <div data-tour="venuez-rooms" className="space-y-3">
          {theirs.length === 0 ? (
            <p className="text-sm text-white/45">
              No rooms coming up. Put one up and it lands here for everyone else.
            </p>
          ) : theirs.map((v) => (
            <Venue key={v.id} v={v} onChanged={load} onFlash={flash} />
          ))}
        </div>
      )}

      {tab === "mine" && venues && (
        <div className="space-y-3">
          {mine.length === 0 ? (
            <p className="text-sm text-white/45">You haven't put a room up yet.</p>
          ) : mine.map((v) => (
            <Venue key={v.id} v={v} onChanged={load} onFlash={flash} />
          ))}
        </div>
      )}
    </div>
  );
}
