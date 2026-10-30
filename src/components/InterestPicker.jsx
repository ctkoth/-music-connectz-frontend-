import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { api } from "../api.js";
import { bestMime, mediaError } from "../recorder.js";

const has = (list, label) => list.some((x) => x.trim().toLowerCase() === label.toLowerCase());

/** Say what you're into, pick what we heard, and keep the strengths you agree with.
 *
 *  It decides nothing. The words are matched against the SERVER's closed list of
 *  interests and brands, and the strengths are rows in the server's table, each
 *  with its reason. A strength is a suggestion until the member presses "That's
 *  me" — then it is theirs, saved with the persona, and nothing in the app reads
 *  it as a rating or a skill level (the server's rule, printed unreworded below).
 *
 *  The mic is the keyboard's own voice-clip door: free at every tier, metered in
 *  clips a day, and the count is on the button before it is pressed. Typing does
 *  the same job, which is why a spent allowance never blocks this. */
export default function InterestPicker({ persona, interests, setInterests, brands = [], setBrands, strengths = [], setStrengths,
  title = "🎙️ Say what you're into", placeholder, kept }) {
  // Without the two setters this is the interests-only form (a character's hobbies):
  // brands and strengths are about a real member's own work, not a character's.
  const compact = !setBrands || !setStrengths;
  const [cat, setCat] = useState(null);
  const [voice, setVoice] = useState(null);
  const [text, setText] = useState("");
  const [found, setFound] = useState(null);
  const [declined, setDeclined] = useState([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const rec = useRef(null);

  useEffect(() => {
    let on = true;
    api("/api/economy/interestz/").then((d) => on && setCat(d)).catch(() => {});
    api("/api/economy/keyz/").then((d) => on && setVoice(d?.voice || null)).catch(() => {});
    return () => { on = false; rec.current?.stop?.(); };
  }, []);

  // A failed catalogue renders nothing: the member never asked for this panel.
  if (!cat) return null;
  const traitLabel = (k) => cat.traits.find((t) => t.key === k);
  const brandLabel = (k) => cat.brands.find((b) => b.key === k)?.label || k;
  const left = voice?.clips_remaining;
  const micCost = voice
    ? `Free · uses 1 of your ${left} voice clip${left === 1 ? "" : "s"} left today`
    : "Free · counts toward your daily voice clips";

  async function startMic() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = bestMime(false);
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        rec.current = null;
        setBusy("transcribe");
        const blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
        try {
          if (!blob.size) throw new Error("Nothing was recorded — press the mic and say something.");
          const fd = new FormData();
          fd.append("clip", new File([blob], blob.type.includes("mp4") ? "clip.m4a" : "clip.webm", { type: blob.type }));
          const r = await api("/api/economy/keyz/transcribe/", { method: "POST", body: fd });
          setText((t) => (t ? `${t} ` : "") + (r.text || ""));
          setVoice((v) => (v ? { ...v, clips_remaining: r.clips_remaining } : v));
        } catch (e) {
          setErr(e.message || "That clip didn't come through. Type it instead — it works the same.");
        } finally { setBusy(""); }
      };
      mr.start();
      rec.current = mr;
      setBusy("recording");
      setTimeout(() => rec.current === mr && mr.state === "recording" && mr.stop(), (voice?.clip_max_seconds || 60) * 1000);
    } catch (e) {
      setErr(mediaError(e, false).msg);
    }
  }
  const stopMic = () => rec.current?.stop();

  async function find() {
    setErr(""); setBusy("scan");
    try {
      const r = await api("/api/economy/interestz/scan/", {
        method: "POST",
        body: { text, persona: { key: persona.key, name: persona.name, skills: persona.skills || [] } },
      });
      // Strengths come from what they said AND what they already listed.
      setFound(r);
    } catch (e) {
      setErr(e.message || "That didn't scan. Try again.");
    } finally { setBusy(""); }
  }

  const toggleInterest = (label) =>
    setInterests(has(interests, label) ? interests.filter((x) => x.trim().toLowerCase() !== label.toLowerCase()) : [...interests, label]);
  const toggle = (list, set, k) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  const offered = (found?.suggestions || []).filter((s) => !declined.includes(s.key));

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-[11px] text-white/50">
        {compact ? "Say it or type it. We find the hobbies on our list, and you pick which are theirs."
          : "Talk about your work or type it. We find the interests and tools you mention, and you pick which are yours."} {kept || cat.kept}
      </p>

      <textarea className="neon-input mt-2 min-h-[64px] w-full text-sm" maxLength={6000} value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder || "I design album covers, draw on my iPad in Procreate, and tinker with my Fender…"} />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {busy === "recording" ? (
          <button type="button" className="pill text-[11px] !border-mcz-ember !text-mcz-ember" onClick={stopMic}>
            <Square size={12} /> Stop
          </button>
        ) : (
          <button type="button" className="pill text-[11px]" onClick={startMic}
                  disabled={!!busy || left === 0}>
            <Mic size={12} /> {busy === "transcribe" ? "Listening…" : "Say it"}
          </button>
        )}
        <span className="text-[10px] text-white/45">{left === 0 ? "You've used today's voice clips — typing is free and works the same." : micCost}</span>
        <button type="button" className="pill ml-auto text-[11px]" onClick={find} disabled={!text.trim() || !!busy}>
          {busy === "scan" ? "Finding…" : "Find them · free"}
        </button>
      </div>
      {err && <p className="mt-2 text-[11px] text-mcz-ember">{err}</p>}

      {found && (
        <div className="mt-3 space-y-3">
          {found.interests.length === 0 && (compact || found.brands.length === 0) && (
            <p className="text-[11px] text-white/50">Nothing on our list in that. Add your own in Interests above.</p>
          )}
          {found.interests.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Interests we heard — tap the ones that are yours</p>
              <div className="flex flex-wrap gap-1.5">
                {found.interests.map((i) => (
                  <button key={i.key} type="button" aria-pressed={has(interests, i.label)}
                          onClick={() => toggleInterest(i.label)}
                          className={`pill text-[11px] ${has(interests, i.label) ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>
                    {i.emoji} {i.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!compact && found.brands.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Tools and brands you mentioned</p>
              <div className="flex flex-wrap gap-1.5">
                {found.brands.map((b) => (
                  <button key={b.key} type="button" aria-pressed={brands.includes(b.key)}
                          onClick={() => toggle(brands, setBrands, b.key)}
                          className={`pill text-[11px] ${brands.includes(b.key) ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!compact && offered.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">Strengths this might go with — a suggestion, not a score</p>
              <div className="space-y-2">
                {offered.map((s) => (
                  <div key={s.key} className="rounded-lg border border-white/10 p-2">
                    <p className="text-[12px] font-semibold text-white">{s.emoji} {s.label}
                      <span className="ml-1 font-normal text-white/40">from {s.from.join(", ")}</span></p>
                    {s.because.map((b) => <p key={b} className="mt-0.5 text-[11px] text-white/60">{b}</p>)}
                    <div className="mt-1.5 flex gap-2">
                      <button type="button" className="pill text-[11px]" aria-pressed={strengths.includes(s.key)}
                              onClick={() => strengths.includes(s.key) ? null : setStrengths([...strengths, s.key])}>
                        {strengths.includes(s.key) ? "✓ That's me" : "That's me"}
                      </button>
                      <button type="button" className="pill text-[11px]"
                              onClick={() => { setDeclined([...declined, s.key]); setStrengths(strengths.filter((k) => k !== s.key)); }}>
                        Not me
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!compact && (strengths.length > 0 || brands.length > 0) && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">What you've said about this role</p>
          <div className="flex flex-wrap gap-1.5">
            {strengths.map((k) => (
              <button key={k} type="button" className="pill text-[11px]" title="Remove"
                      onClick={() => setStrengths(strengths.filter((x) => x !== k))}>
                {traitLabel(k)?.emoji} {traitLabel(k)?.label || k} ✕
              </button>
            ))}
            {brands.map((k) => (
              <button key={k} type="button" className="pill text-[11px]" title="Remove"
                      onClick={() => setBrands(brands.filter((x) => x !== k))}>
                {brandLabel(k)} ✕
              </button>
            ))}
          </div>
        </div>
      )}
      {!compact && <p className="mt-3 text-[10px] leading-relaxed text-white/40">{cat.rule}</p>}
    </div>
  );
}
