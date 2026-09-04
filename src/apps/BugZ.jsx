// BugZ 🐞 — report what broke, attach the proof, get paid when it's squashed.
//
// The attachment is the point of this screen as much as the text is. "It looked
// wrong" is the hardest bug to describe and the easiest to photograph, so the
// form takes a screenshot or a screen recording in one slot — image or video,
// no picking which kind first.
//
// Note this screen called /api/bugz/ for its whole life and nothing served it:
// every report 404'd while the page advertised a 200 SpinaZ bounty. It now
// posts to the real endpoint under /api/economy/.
import { useCallback, useEffect, useRef, useState } from "react";
import { Bug, Image as ImageIcon, Loader2, Star, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useSay } from "../voice.js";
import { P } from "../phrases.js";
import { playSound } from "../sound.js";
import { IconImg } from "../App.jsx";
import { SPINAZ } from "../resources.js";
import { asList } from "../shape.js";

const STATUS_STYLE = {
  open: "!text-mcz-cyan", in_progress: "!text-mcz-gold", squashed: "!text-emerald-300",
};

export default function BugZ() {
  const talk = useSay();
  const [bugs, setBugs] = useState(null);
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({ title: "", body: "" });
  // The evidence: one file, image or video. Kept with its object URL so the
  // reporter can see what they're about to send.
  const [shot, setShot] = useState(null);
  const [shotUrl, setShotUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(() => {
    api("/api/economy/bugz/")
      .then((d) => { setBugs(asList(d.bugs ?? d)); setMeta(d); })
      .catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Revoke or every attachment leaks for the life of the page.
  useEffect(() => () => { if (shotUrl) URL.revokeObjectURL(shotUrl); }, [shotUrl]);

  const isVideo = (shot?.type || "").startsWith("video/");

  function attach(f) {
    if (!f) return;
    const capMb = meta?.max_mb;
    if (capMb && f.size > capMb * 1024 * 1024) {
      return setMsg(`That's ${(f.size / 1024 / 1024).toFixed(1)}MB — keep it under ${capMb}MB. `
        + "A screenshot, or a short clip of the moment it broke, is plenty.");
    }
    if (shotUrl) URL.revokeObjectURL(shotUrl);
    setShot(f);
    setShotUrl(URL.createObjectURL(f));
    setMsg("");
  }

  function dropShot() {
    if (shotUrl) URL.revokeObjectURL(shotUrl);
    setShot(null); setShotUrl("");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      // Multipart when there's evidence, plain JSON when there isn't — the
      // server takes both, so a text-only report doesn't pay for a file upload.
      let body = form;
      if (shot) {
        body = new FormData();
        body.append("title", form.title);
        body.append("body", form.body);
        body.append("shot", shot, shot.name);
      }
      await api("/api/economy/bugz/", { method: "POST", body });
      setForm({ title: "", body: "" });
      dropShot();
      // Sent, not paid. The bounty lands if and when it's squashed, so this
      // is the message sound — playing the coin here would promise in audio
      // what the sentence right next to it carefully says is conditional.
      setMsg(talk(P.bugz_reported(meta?.bounty_spinaz ?? 200)));
      playSound("message");
      load();
    } catch (err) { setMsg(err.message); playSound("error"); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="bugz.png" alt="BugZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#22e6ff" }}>BugZ</h2>
          <p className="text-sm text-white/60">
            Find a bug, report it. <Star size={12} className="inline text-mcz-pink" /> Squashed
            = {meta?.bounty_spinaz ?? 200} SpinaZ to the reporter.
          </p>
        </div>
      </header>

      <form onSubmit={submit} className="neon-frame space-y-3 p-4">
        <input className="neon-input" placeholder="What broke? (title)" value={form.title}
               onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="neon-input" rows={3} placeholder="Steps to reproduce, what you expected, what happened…"
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />

        {/* A picture of the broken thing beats a paragraph about it. */}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden"
                 onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; attach(f); }} />
          <button type="button" className="re-btn !w-auto px-4" disabled={busy}
                  onClick={() => fileInput.current?.click()} data-tour="bugz-shot">
            <ImageIcon size={15} /> {shot ? "Change screenshot" : "Add a screenshot or clip"}
          </button>
          {shot && (
            <>
              <span className="text-[11px] text-white/45">
                {shot.name} · {(shot.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button type="button" className="re-btn !w-auto px-3 !text-red-300"
                      onClick={dropShot} disabled={busy}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
        {shotUrl && (
          isVideo
            ? <video src={shotUrl} controls playsInline className="max-h-56 rounded-lg" />
            : <img src={shotUrl} alt="" className="max-h-56 rounded-lg object-contain" />
        )}

        {msg && <p className="text-sm text-mcz-gold">{msg}</p>}
        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Bug size={16} />} Report bug
        </button>
      </form>

      {!bugs ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : (
        <div className="neon-frame divide-y divide-white/5">
          {bugs.length === 0 && <p className="p-4 text-sm text-white/45">No reports yet — the app is either perfect or unexplored. 😄</p>}
          {bugs.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{b.title}</p>
                {b.body && <p className="text-xs text-white/50">{b.body}</p>}
                {/* The evidence, on the row. A report whose screenshot you have
                    to go looking for is a report nobody looks at. */}
                {b.shot_url && (
                  b.shot_type === "video"
                    ? <video src={b.shot_url} controls playsInline className="mt-2 max-h-40 rounded-lg" />
                    : <img src={b.shot_url} alt="" className="mt-2 max-h-40 rounded-lg object-contain" />
                )}
                <p className="mt-1 text-[11px] text-white/35">
                  by {b.reporter}
                  {b.paid && <span className="ml-2 text-emerald-300">+{b.bounty_spinaz} {SPINAZ} paid</span>}
                </p>
              </div>
              <span className={`pill whitespace-nowrap ${STATUS_STYLE[b.status] || ""}`}>{b.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
