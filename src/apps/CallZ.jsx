// CallZ — a real 1:1 call, with the other member's rate on screen before it
// connects.
//
// CallZ was sold at StatZ and did not exist. LessonZ had a "CallZ" delivery
// option on a booking, priced identically to remote and in-person — a dropdown,
// not a connect — which is why CLAUDE.md has carried it as an open cost/gain
// violation since that file was written: there was no per-minute rate to state
// before a call because there was no call.
//
// The rule this screen exists to satisfy is one sentence: THE OTHER MEMBER'S
// RATE HAS TO BE VISIBLE BEFORE IT CONNECTS. So the rate, your balance and the
// minutes you can afford are all on screen before the Call button, the running
// cost is on screen during, and the receipt is on screen after.
//
// The media is peer-to-peer WebRTC. The signalling is HTTP polling, because
// this backend runs gunicorn with no ASGI and no channels layer, so there are
// no WebSockets to signal over. Polling costs a few seconds at connect and
// nothing afterwards — the audio never touches the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Phone, PhoneOff, PhoneIncoming, Mic, MicOff, AlertTriangle } from "lucide-react";

import { api } from "../api.js";
import { asList } from "../shape.js";
import { MONEY } from "../resources.js";
import { playSound } from "../sound.js";

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
const mmss = (s) => `${Math.floor((s || 0) / 60)}:${String((s || 0) % 60).padStart(2, "0")}`;

export default function CallZ() {
  const [state, setState] = useState(null);      // GET /callz/
  const [err, setErr] = useState("");
  const [who, setWho] = useState("");
  const [quote, setQuote] = useState(null);      // GET /callz/rate/<who>/
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [note, setNote] = useState("");

  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);
  const sentIce = useRef(0);
  const activeId = useRef(null);

  // ---- WebRTC plumbing -----------------------------------------------------

  const teardown = useCallback(() => {
    try { pc.current?.close(); } catch { /* already closed */ }
    pc.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    sentIce.current = 0;
    activeId.current = null;
    iceQueue.current = [];
  }, []);

  // Candidates queue here and are flushed by the poll. They start arriving
  // BEFORE the call row exists — createOffer fires them immediately — so the
  // queue cannot be keyed on a call id, and `activeId` is read at flush time
  // rather than captured when the peer is made.
  const iceQueue = useRef([]);

  const flushIce = useCallback(async () => {
    if (!activeId.current || !iceQueue.current.length) return;
    const batch = iceQueue.current.splice(0, iceQueue.current.length);
    // Batched, not one request per candidate: this is a polled channel, not a
    // socket, and a single connect produces dozens of candidates.
    await api(`/api/economy/callz/${activeId.current}/ice/`, {
      method: "POST", body: { candidates: batch },
    }).catch(() => iceQueue.current.unshift(...batch));   // put them back; the poll retries
  }, []);

  const makePeer = useCallback(async (iceServers) => {
    const peer = new RTCPeerConnection({ iceServers: iceServers || [] });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.current = stream;
    stream.getTracks().forEach((t) => peer.addTrack(t, stream));
    peer.ontrack = (e) => {
      if (remoteAudio.current) remoteAudio.current.srcObject = e.streams[0];
    };
    peer.onicecandidate = (e) => {
      if (e.candidate) iceQueue.current.push(e.candidate.toJSON());
    };
    pc.current = peer;
    return peer;
  }, []);

  // ---- polling: the signalling channel and the running cost ----------------

  const poll = useCallback(async () => {
    try {
      const d = await api("/api/economy/callz/");
      setState(d);
      setErr("");
      const live = asList(d.active)[0];
      if (!live) {
        if (activeId.current) { teardown(); setNote(""); }
        return;
      }
      activeId.current = live.id;
      const peer = pc.current;
      if (!peer) return;
      await flushIce();
      // Take the other side's half of the handshake once it appears.
      if (live.direction === "outgoing" && live.answer_sdp && !peer.currentRemoteDescription) {
        await peer.setRemoteDescription({ type: "answer", sdp: live.answer_sdp });
      }
      for (const c of asList(live.remote_ice).slice(sentIce.current)) {
        try { await peer.addIceCandidate(c); } catch { /* stale candidate */ }
      }
      sentIce.current = asList(live.remote_ice).length;
    } catch (e) {
      setErr(e.message || "Couldn't reach CallZ.");
    }
  }, [teardown, flushIce]);

  useEffect(() => {
    poll();
    // 2s: fast enough that a ring is answered promptly, slow enough that a
    // call is not a request storm. It also doubles as the heartbeat — the
    // server ends a call nobody has polled for, which is what stops a closed
    // tab holding somebody's escrow.
    const t = setInterval(poll, 2000);
    return () => { clearInterval(t); };
  }, [poll]);

  useEffect(() => () => teardown(), [teardown]);

  // ---- actions -------------------------------------------------------------

  async function getQuote(name) {
    setQuote(null); setNote("");
    if (!name.trim()) return;
    try {
      setQuote(await api(`/api/economy/callz/rate/${encodeURIComponent(name.trim())}/`));
    } catch (e) {
      setNote(e.message || "No member by that name.");
    }
  }

  async function place() {
    setBusy(true); setNote("");
    try {
      const peer = await makePeer(quote?.ice_servers);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const call = await api("/api/economy/callz/", {
        method: "POST", body: { username: quote.username, offer_sdp: offer.sdp },
      });
      // Now the queue has somewhere to go. Anything that arrived while the
      // request was in flight is still queued and goes out on this flush.
      activeId.current = call.id;
      await flushIce();
      // Ringing OUT. The two-tone repeat is the one sound in the set that
      // has to be recognisable as a phone before anything else.
      playSound("call_ring");
      poll();
    } catch (e) {
      teardown();
      setNote(e.message || "Couldn't place that call.");
    } finally {
      setBusy(false);
    }
  }

  async function accept(call) {
    setBusy(true); setNote("");
    try {
      activeId.current = call.id;
      const peer = await makePeer(state?.ice_servers);
      await peer.setRemoteDescription({ type: "offer", sdp: call.offer_sdp });
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await api(`/api/economy/callz/${call.id}/answer/`, {
        method: "POST", body: { answer_sdp: answer.sdp },
      });
      await flushIce();
      playSound("call_connect");
      poll();
    } catch (e) {
      teardown();
      setNote(e.message || "Couldn't answer.");
    } finally {
      setBusy(false);
    }
  }

  async function finish(call, action) {
    setBusy(true);
    try {
      const r = await api(`/api/economy/callz/${call.id}/${action}/`, { method: "POST", body: {} });
      playSound(action === "end" ? "call_end" : "deleted");
      teardown();
      if (action === "end" && r.charged_cents) {
        // The receipt, in the same shape as the quote that preceded it.
        setNote(`${mmss(r.billed_seconds || r.elapsed_seconds)} · −${usd(r.charged_cents)} ${MONEY}`);
      }
      poll();
    } catch (e) {
      setNote(e.message || "Couldn't end that call.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMute() {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  // ---- render --------------------------------------------------------------

  if (!state && !err) {
    return <p className="flex items-center gap-2 text-sm text-white/50">
      <Loader2 className="animate-spin" size={15} /> Loading CallZ…
    </p>;
  }

  const active = asList(state?.active);
  const incoming = active.filter((c) => c.direction === "incoming" && c.status === "ringing");
  const mine = active.find((c) => c.status === "live")
    || active.find((c) => c.direction === "outgoing");
  const recent = asList(state?.recent);

  return (
    <div className="space-y-4">
      <audio ref={remoteAudio} autoPlay />

      {err && (
        <p className="re-card flex items-start gap-2 text-sm text-mcz-ember">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {err}
        </p>
      )}

      {/* Someone is calling you. Their rate is irrelevant here — you are being
          PAID — so what shows is what you will earn a minute. */}
      {incoming.map((c) => (
        <div key={c.id} className="re-card space-y-3">
          <p className="flex items-center gap-2 font-display text-lg font-extrabold">
            <PhoneIncoming size={18} className="text-emerald-300 animate-pulse" />
            {c.other} is calling
          </p>
          <p className="text-[13px] text-white/60">
            {c.rate_cents_per_min
              ? <>You earn <span className="font-bold text-emerald-300">+{usd(c.rate_cents_per_min)} {MONEY}</span> a minute, less the platform fee.</>
              : <>You haven't priced a skill, so this call is free.</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="re-btn re-btn-emerald !w-auto px-4" disabled={busy}
                    onClick={() => accept(c)}>
              <Phone size={15} /> Answer
            </button>
            <button className="re-btn re-btn-red !w-auto px-4" disabled={busy}
                    onClick={() => finish(c, "decline")}>
              <PhoneOff size={15} /> Decline
            </button>
          </div>
        </div>
      ))}

      {/* On a call: the running cost, live. Not only on the receipt. */}
      {mine && (
        <div className="re-card space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-lg font-extrabold">
              {mine.status === "ringing" ? `Ringing ${mine.other}…` : `On with ${mine.other}`}
            </p>
            <p className="font-mono text-sm text-white/70">{mmss(mine.elapsed_seconds)}</p>
          </div>
          <p className="flex flex-wrap items-center gap-3 text-[13px] font-bold">
            <span className={mine.direction === "outgoing" ? "text-mcz-ember" : "text-emerald-300"}>
              {mine.direction === "outgoing" ? "−" : "+"}{usd(mine.cost_cents)} {MONEY}
            </span>
            <span className="text-[11px] font-normal text-white/40">
              {mine.rate_cents_per_min ? `${usd(mine.rate_cents_per_min)}/min` : "free call"}
              {mine.held_cents ? ` · ${usd(mine.held_cents)} held` : ""}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {mine.status === "live" && (
              <button className="re-btn !w-auto px-4" onClick={toggleMute}>
                {muted ? <MicOff size={15} /> : <Mic size={15} />} {muted ? "Unmute" : "Mute"}
              </button>
            )}
            <button className="re-btn re-btn-red !w-auto px-4" disabled={busy}
                    onClick={() => finish(mine, "end")}>
              <PhoneOff size={15} /> {mine.status === "ringing" ? "Cancel" : "End call"}
            </button>
          </div>
        </div>
      )}

      {/* Place a call — the quote comes before the button, always. */}
      {!mine && incoming.length === 0 && (
        <div className="re-card space-y-3">
          <p className="re-label">Call a member</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
              placeholder="username" value={who}
              onChange={(e) => setWho(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && getQuote(who)} />
            <button className="re-btn re-btn-cyan !w-auto px-4" onClick={() => getQuote(who)}>
              What does it cost?
            </button>
          </div>

          {quote && (
            <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              {/* The rule, on screen: their rate, your balance, and how long
                  you can afford — all before the Call button exists. */}
              <p className="text-[13px]">
                <span className="font-bold text-white">{quote.username}</span>
                {quote.free
                  ? <span className="text-emerald-300"> hasn't priced a skill — this call is free.</span>
                  : <> costs <span className="font-bold text-mcz-ember">
                      −{usd(quote.rate_cents_per_min)} {MONEY}</span> a minute.</>}
              </p>
              {!quote.free && (
                <p className="text-[11px] text-white/45">
                  You have {usd(quote.your_money_cents)} {MONEY} — about{" "}
                  <b className="text-white/70">{quote.affordable_minutes} minutes</b>. Up to{" "}
                  {quote.max_escrow_minutes} minutes is held when they answer and the rest
                  comes straight back when the call ends.
                </p>
              )}
              {quote.can_call ? (
                <button className="neon-btn-primary !w-auto px-5" disabled={busy}
                        onClick={place}>
                  <Phone size={15} /> Call {quote.username}
                  {!quote.free && ` · ${usd(quote.rate_cents_per_min)}/min`}
                </button>
              ) : (
                <p className="text-[12px] text-white/60">
                  Placing a call is a <b className="text-white/85">StatZ</b> perk — your tier is{" "}
                  <span className="uppercase">{quote.tier}</span>. Answering one is free at
                  every tier, and it pays you.
                </p>
              )}
              {quote.stun_only && (
                // Said before the call, not discovered as a mystery failure.
                <p className="text-[10px] text-white/30">
                  Peer-to-peer audio. On some restrictive networks the two ends can't
                  reach each other and the call won't connect — there's no relay server yet.
                </p>
              )}
            </div>
          )}
          {note && <p className="text-[13px] text-white/70">{note}</p>}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="re-label">Recent</p>
          <ul className="space-y-1.5">
            {recent.map((c) => (
              <li key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-white/85">
                    {c.direction === "outgoing" ? "→" : "←"} {c.other}
                  </span>
                  <span className="block text-[10px] text-white/35">
                    {c.status}{c.billed_seconds || c.elapsed_seconds
                      ? ` · ${mmss(c.elapsed_seconds)}` : ""}
                    {c.end_reason ? ` · ${c.end_reason}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 text-[13px] font-bold ${
                  c.direction === "outgoing" ? "text-mcz-ember" : "text-emerald-300"}`}>
                  {c.charged_cents
                    ? `${c.direction === "outgoing" ? "−" : "+"}${usd(c.charged_cents)} ${MONEY}`
                    : <span className="text-white/30">free</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
