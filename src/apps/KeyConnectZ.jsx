// KeyConnectZ — the keyboard.
//
// Two halves, priced differently on purpose. The wallpaper is Premium: it is
// decoration, nobody loses a capability without it, which is what makes it fair
// to sell. Translate is free on every tier, in any direction — being understood
// is not a luxury, and charging a Free member to talk to somebody in another
// language would shut the app out of the rooms it exists to open.
//
// VOICE SITS ON THE TRANSLATE SIDE OF THAT LINE, both directions, at every
// tier. Read-aloud is the second half of translate: hand somebody the
// Portuguese and then charge them to hear how to SAY it and you have given
// away half a capability and sold the other. Speech input is how you type when
// typing is the hard part — an unfamiliar script, a shaky hand, a language
// easier to speak than to spell — so an access gate would land hardest on the
// members it should be helping most.
//
// What a tier buys is HOW MANY, the same answer BossTake's ladder gives, and
// the number is on screen before the mic is pressed. Reading aloud goes to the
// PHONE's voice first: it costs nothing, works offline and is unlimited, so
// only a language the handset has no voice for ever reaches our server. That
// gap is Yorùbá, Igbo, Hausa and Amharic before it is anything else — which is
// precisely why the server voice isn't sold by tier either. Gating it would
// mean English speakers hear their translation read back free while Yorùbá
// speakers pay for the same sentence.
//
// Both prices are stated before the control that spends them, per the cost/gain
// rule, and both come from the server so this screen can't drift from what the
// API will actually do.
//
// NOTE ON SCOPE: this is the in-app keyboard. Replacing the phone's SYSTEM
// keyboard needs a native Android InputMethodService (or an iOS keyboard
// extension) — it cannot be done from the web app. The API this screen calls is
// exactly what that native keyboard would call, so the work is wiring, not a
// redesign.
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight, Check, Copy, Image as ImageIcon, Languages, Loader2, Lock,
  Mic, Send, Square, Trash2, Volume2,
} from "lucide-react";
import { api } from "../api.js";
import { bestClipMime, playBase64, speakOnDevice, stopDeviceVoice } from "../voice.js";
import { asList } from "../shape.js";
import { goToTab } from "../goto.js";
import { IconImg } from "../App.jsx";

export default function KeyConnectZ() {
  const [state, setState] = useState(null);
  const [text, setText] = useState("");
  const [out, setOut] = useState(null);
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("es");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  // Voice. Recording is a ref as well as state because the recorder's own
  // callbacks read it, and `speaking` is which text is being read so only that
  // one speaker icon spins rather than both.
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState("");
  const [voiceMsg, setVoiceMsg] = useState("");
  const fileInput = useRef(null);
  const rec = useRef(null);
  const chunks = useRef([]);

  const load = () => api("/api/economy/keyz/").then((d) => {
    setState(d);
    setSource(d?.skin?.source_lang || "auto");
    if (d?.skin?.target_lang) setTarget(d.skin.target_lang);
  }).catch((e) => setMsg(e.message || "Couldn't load KeyConnectZ."));
  useEffect(() => { load(); }, []);

  if (!state) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;
  }

  const langs = asList(state.languages);
  const skin = state.skin || {};
  // The Polyglot badge lifts the daily allowance, and the server says so with
  // nulls rather than a huge number. `?? 0` on a null cap would read as "0 of 0
  // left" and disable the button — the badge would take the thing away instead
  // of giving it.
  const uncapped = state.translate_uncapped === true;
  const left = state.translate_remaining ?? 0;
  const cap = state.translate_daily_chars ?? 0;
  const overLength = text.length > (state.translate_max_chars ?? 2000);
  const overAllowance = !uncapped && text.length > left;

  const voice = state.voice || {};

  /** Read something out. The DEVICE first, always.
   *
   * The phone's own voice costs nothing, works offline and is unlimited at
   * every tier, so asking the server for a language the phone already speaks
   * would spend a member's allowance on something they were entitled to for
   * free. The server voice exists for the languages a handset has no voice for
   * — which is Yorùbá, Igbo, Hausa and Amharic before it is anything else, and
   * the reason this isn't sold by tier.
   */
  async function speak(what, lang, id) {
    if (speaking) { stopDeviceVoice(); setSpeaking(""); return; }
    const words = String(what || "").trim();
    if (!words) return;
    setVoiceMsg(""); setSpeaking(id);
    try {
      if (await speakOnDevice(words, lang)) return;
      const r = await api("/api/economy/keyz/speak/", {
        method: "POST", body: { text: words, lang },
      });
      setState((st) => ({ ...st, voice: { ...st.voice,
        speak_remaining: r.speak_remaining ?? st.voice?.speak_remaining,
        speak_used_today: r.speak_used_today ?? st.voice?.speak_used_today } }));
      await playBase64(r.audio_b64, r.mime);
    } catch (e) {
      setVoiceMsg(e.message || "Couldn't read that out.");
    } finally {
      setSpeaking("");
    }
  }

  /** Say it instead of typing it. */
  async function startClip() {
    setVoiceMsg("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setVoiceMsg("This browser can't record. Type it instead.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mimeType = bestClipMime();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = mr.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        const form = new FormData();
        form.append("clip", new Blob(chunks.current, { type }), `clip.${ext}`);
        if (source && source !== "auto") form.append("lang", source);
        setBusy(true);
        try {
          const r = await api("/api/economy/keyz/transcribe/", { method: "POST", body: form });
          // Appended, never replaced. A member who has typed half a sentence
          // and then speaks the rest must not lose the half they typed.
          setText((t) => (t ? `${t.replace(/\s+$/, "")} ${r.text}` : r.text));
          setState((st) => ({ ...st, voice: { ...st.voice,
            clips_remaining: r.clips_remaining ?? st.voice?.clips_remaining,
            clips_used_today: r.clips_used_today ?? st.voice?.clips_used_today } }));
        } catch (e) {
          setVoiceMsg(e.message || "Couldn't read that clip.");
        } finally { setBusy(false); }
      };
      rec.current = mr;
      mr.start();
      setRecording(true);
      // One clip is one thing said. The server holds the same line; stopping
      // here means the member never records past it and then loses the clip.
      const secs = voice.clip_max_seconds || 60;
      setTimeout(() => { if (rec.current?.state === "recording") stopClip(); }, secs * 1000);
    } catch {
      setVoiceMsg("Microphone access was refused. Allow it, or type instead.");
    }
  }

  function stopClip() {
    if (rec.current?.state !== "recording") return;
    rec.current.stop();
    setRecording(false);
  }

  async function translate() {
    if (!text.trim() || busy) return;
    setBusy(true); setMsg(""); setOut(null);
    try {
      const r = await api("/api/economy/keyz/translate/", {
        method: "POST", body: { text, target_lang: target, source_lang: source },
      });
      setOut(r);
      setState((s) => ({ ...s, translate_remaining: r.translate_remaining ?? s.translate_remaining,
                         translate_used_today: r.translate_used_today ?? s.translate_used_today }));
    } catch (e) { setMsg(e.message || "Couldn't translate that."); }
    finally { setBusy(false); }
  }

  async function patch(body) {
    try {
      const skinNext = await api("/api/economy/keyz/", { method: "PATCH", body });
      setState((s) => ({ ...s, skin: skinNext }));
    } catch (e) { setMsg(e.message || "Couldn't save that."); }
  }

  async function uploadWallpaper(file) {
    setBusy(true); setMsg("");
    try {
      const body = new FormData();
      body.append("wallpaper", file, file.name);
      const skinNext = await api("/api/economy/keyz/", { method: "POST", body });
      setState((s) => ({ ...s, skin: skinNext }));
    } catch (e) { setMsg(e.message || "Couldn't set that wallpaper."); }
    finally { setBusy(false); }
  }

  async function clearWallpaper() {
    try {
      const skinNext = await api("/api/economy/keyz/", { method: "DELETE" });
      setState((s) => ({ ...s, skin: skinNext }));
    } catch (e) { setMsg(e.message || "Couldn't clear it."); }
  }

  function swap() {
    // "Detect" has no reverse — you can't translate INTO an unknown language.
    if (source === "auto") return;
    setSource(target); setTarget(source);
    if (out?.text) { setText(out.text); setOut(null); }
  }

  function copyOut() {
    navigator.clipboard?.writeText(out?.text || "").then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    }, () => {});
  }

  const padStyle = {
    backgroundImage: skin.wallpaper_url ? `url(${skin.wallpaper_url})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderColor: skin.accent || undefined,
  };
  const keyStyle = {
    backgroundColor: `rgba(${skin.dark_keys ? "10,10,14" : "245,245,250"},${(skin.key_opacity ?? 85) / 100})`,
    color: skin.dark_keys ? "#fff" : "#111",
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="keyconnectz.png" alt="KeyConnectZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">KeyConnectZ</h2>
          <p className="text-xs text-white/45">
            Type in your language, send in theirs. Free on every tier.
          </p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {/* The pad. Wallpaper behind, keys over it at the member's opacity. */}
      <div className="rounded-2xl border-2 p-3" style={padStyle}>
        <div className="flex items-center gap-2 rounded-xl p-2" style={keyStyle}>
          <select className="neon-input !w-auto !py-1.5 text-[11px]" value={source}
                  onChange={(e) => { setSource(e.target.value); patch({ source_lang: e.target.value }); }}>
            {langs.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
          <button onClick={swap} disabled={source === "auto"}
                  className="rounded-lg p-1.5 text-white/60 hover:text-mcz-ember disabled:opacity-30"
                  title={source === "auto" ? "Pick a source language to swap" : "Swap"}>
            <ArrowLeftRight size={14} />
          </button>
          <select className="neon-input !w-auto !py-1.5 text-[11px]" value={target}
                  onChange={(e) => { setTarget(e.target.value); patch({ target_lang: e.target.value }); }}>
            {langs.filter((l) => l.key !== "auto").map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>

        <textarea
          className="mt-2 w-full resize-none rounded-xl border-0 p-3 text-sm outline-none"
          style={keyStyle}
          rows={3}
          placeholder="Type here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className="neon-btn-primary !w-auto px-4" onClick={translate}
                  disabled={busy || !text.trim() || overLength || overAllowance}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Languages size={14} />} Translate
          </button>
          {/* Say it instead of typing it. Not gated by tier — what a tier buys
              here is how many clips a day, and that number is on the line
              below before the mic is ever pressed. */}
          <button className={`re-btn !w-auto px-3 ${recording ? "!text-mcz-ember" : ""}`}
                  onClick={recording ? stopClip : startClip}
                  disabled={busy || (voice.clips_remaining ?? 1) <= 0}
                  title={recording ? "Stop and read it back" : "Speak instead of typing"}>
            {recording ? <Square size={14} /> : <Mic size={14} />}
            {recording ? " Stop" : " Speak"}
          </button>
          {/* Hear what you typed, before you send it somewhere you can't
              unsay it. */}
          <button className="re-btn !w-auto px-3" onClick={() => speak(text, source, "in")}
                  disabled={!text.trim()} title="Read this out">
            {speaking === "in" ? <Loader2 className="animate-spin" size={14} /> : <Volume2 size={14} />}
          </button>
          {/* Free, and it says so before the button — every other AI surface in
              this app costs PromptZ, so silence would read as a charge. */}
          <span className="text-[11px] text-emerald-300">
            {uncapped
              ? "Free · 🗺️ Polyglot — no daily limit"
              : `Free · ${left.toLocaleString()} of ${cap.toLocaleString()} characters left today`}
          </span>
        </div>

        {/* The voice allowances, up front. Both are free at every tier — the
            number is what a tier buys, so the number is what gets shown. */}
        <p className="mt-1 text-[11px] text-white/40">
          Free ·{" "}
          <span className={(voice.clips_remaining ?? 1) > 0 ? "" : "text-mcz-ember"}>
            {(voice.clips_remaining ?? 0).toLocaleString()} of{" "}
            {(voice.clips_daily ?? 0).toLocaleString()} voice clips left today
          </span>
          {", up to "}{voice.clip_max_seconds ?? 60}s each. Reading aloud uses your
          phone's own voice — unlimited, and it works offline. Only a language your
          phone has no voice for asks our server, and you have{" "}
          {(voice.speak_remaining ?? 0).toLocaleString()} of{" "}
          {(voice.speak_daily_chars ?? 0).toLocaleString()} of those characters left.
        </p>

        {voiceMsg && (
          <p className="mt-1 text-[11px] text-mcz-ember">{voiceMsg}</p>
        )}

        {(overLength || overAllowance) && (
          <p className="mt-1 text-[11px] text-mcz-ember">
            {overLength
              ? `That's over ${(state.translate_max_chars ?? 2000).toLocaleString()} characters for one go — send it in pieces.`
              : `That's longer than the ${left.toLocaleString()} characters you have left today.`}
          </p>
        )}

        {out && (
          <div className="mt-3 rounded-xl p-3" style={keyStyle}>
            <p className="whitespace-pre-wrap text-sm">{out.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] opacity-70">
              {out.detected && <span>detected: {out.detected}</span>}
              {/* The reason read-aloud is free. A translation you cannot
                  pronounce is a translation you cannot use out loud, and
                  charging for this half after giving away the other would
                  teach members the free half was bait. */}
              <button className="flex items-center gap-1 hover:text-mcz-ember"
                      onClick={() => speak(out.text, target, "out")}
                      title="Hear how to say it">
                {speaking === "out"
                  ? <Loader2 className="animate-spin" size={11} />
                  : <Volume2 size={11} />} Say it
              </button>
              <button className="flex items-center gap-1 hover:text-mcz-ember" onClick={copyOut}>
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wallpaper — the Premium half, with its price stated before the button. */}
      <div className="re-card space-y-3">
        <div className="re-label flex items-center gap-2">
          <ImageIcon size={13} /> Keyboard wallpaper
        </div>
        {state.wallpaper_allowed ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInput} type="file" accept="image/*" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadWallpaper(f); }} />
              <button className="re-btn !w-auto px-4" onClick={() => fileInput.current?.click()} disabled={busy}>
                <ImageIcon size={14} /> {skin.wallpaper_url ? "Change it" : "Upload one"}
              </button>
              {skin.wallpaper_url && (
                <button className="re-btn !w-auto px-3 !text-red-300" onClick={clearWallpaper}>
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-white/30">
              Up to {state.wallpaper_max_mb}MB. It replaces the old one rather than piling up in your storage.
            </p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-sm text-white/65">
              <Lock size={15} className="mt-0.5 shrink-0 text-mcz-ember" />
              A custom wallpaper is Premium. Translate stays free on every tier — this is the paint,
              not the wall.
            </p>
            <button className="re-btn !w-auto px-4" onClick={() => goToTab("membershipz")}>
              See Premium
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] text-white/50">
            Key colour
            <select className="neon-input !py-2 text-xs" value={skin.dark_keys ? "dark" : "light"}
                    onChange={(e) => patch({ dark_keys: e.target.value === "dark" })}>
              <option value="dark">Dark keys</option>
              <option value="light">Light keys</option>
            </select>
          </label>
          <label className="text-[11px] text-white/50">
            Key opacity — {skin.key_opacity ?? 85}%
            <input type="range" min="0" max="100" className="w-full"
                   value={skin.key_opacity ?? 85}
                   onChange={(e) => setState((s) => ({ ...s, skin: { ...s.skin, key_opacity: Number(e.target.value) } }))}
                   onMouseUp={(e) => patch({ key_opacity: Number(e.target.value) })}
                   onTouchEnd={(e) => patch({ key_opacity: Number(e.target.value) })} />
          </label>
        </div>
        <p className="text-[10px] text-white/30">
          Colours and opacity are free at every tier.
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-white/35">
        This is the in-app keyboard. Making KeyConnectZ your phone's system keyboard needs the native
        Android app — it can't be done from the web.
      </p>
    </div>
  );
}
