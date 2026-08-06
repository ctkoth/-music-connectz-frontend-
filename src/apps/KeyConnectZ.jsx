// KeyConnectZ — the keyboard.
//
// Two halves, priced differently on purpose. The wallpaper is Premium: it is
// decoration, nobody loses a capability without it, which is what makes it fair
// to sell. Translate is free on every tier, in any direction — being understood
// is not a luxury, and charging a Free member to talk to somebody in another
// language would shut the app out of the rooms it exists to open.
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
  Send, Trash2,
} from "lucide-react";
import { api } from "../api.js";
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
  const fileInput = useRef(null);

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
  const left = state.translate_remaining ?? 0;
  const cap = state.translate_daily_chars ?? 0;
  const overLength = text.length > (state.translate_max_chars ?? 2000);
  const overAllowance = text.length > left;

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
          {/* Free, and it says so before the button — every other AI surface in
              this app costs PromptZ, so silence would read as a charge. */}
          <span className="text-[11px] text-emerald-300">
            Free · {left.toLocaleString()} of {cap.toLocaleString()} characters left today
          </span>
        </div>

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
