import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "../api.js";
import { handOff } from "../handoff.js";
import { PROMPTZ } from "../resources.js";

// Inspiration — your take, heard against a song you want to sound like. It
// decides nothing: the price, the EQ regions, the notices and every word of the
// result are the server's. Nothing is saved (the server says so and so do we).
// The lyric half hands a DIRECTION to Sentence ConnectZ; the reference's words
// are never shown or carried.
const DIR = { more: "needs more", less: "needs less", close: "already close" };

function Pick({ label, file, onFile, disabled }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white">
      <Upload size={14} />
      <span className="min-w-0 flex-1 truncate">{file ? `${label}: ${file.name}` : label}</span>
      <input type="file" accept="audio/*,video/*" className="hidden" disabled={disabled}
             onChange={(e) => onFile(e.target.files?.[0] || null)} />
    </label>
  );
}

export default function Inspiration({ appKey, genre, hostBlob, hostName }) {
  const [info, setInfo] = useState(null);
  const [take, setTake] = useState(null);
  const [ref, setRef] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);

  useEffect(() => {
    let on = true;
    api(`/api/${appKey}/match/`).then((d) => on && setInfo(d)).catch(() => {});
    return () => { on = false; };
  }, [appKey]);

  // A failed fetch renders nothing: a panel the member did not ask for does not
  // announce its own outage.
  if (!info) return null;

  const mine = take || (hostBlob ? new File([hostBlob], hostName || "take.webm", { type: hostBlob.type }) : null);

  const run = async () => {
    if (!mine || !ref || busy) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const f = new FormData();
      f.append("take", mine, mine.name);
      f.append("reference", ref, ref.name);
      if (genre) f.append("genre", genre);
      setRes(await api(`/api/${appKey}/match/`, { method: "POST", body: f }));
    } catch (e) {
      setErr(`${e.message} Nothing was charged.`);
    } finally { setBusy(false); }
  };

  const toLyrics = () => handOff("sentenceconnectz", "", {
    kind: "lyrics", genre,
    text: `Rewrite my lyrics with this direction (the reference's words are not used):\n${res.lyric_direction}\n\nMy lyrics:\n`,
  });

  return (
    <section className="mt-3 space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 text-xs text-white/75">
      <h3 className="text-sm font-semibold text-white">✨ Inspiration</h3>
      <p>Pick a song you want to sound like and your own take. The coach tells you what separates them — in the score, the EQ and the how-to — and can send a lyric direction to Sentence ConnectZ.</p>
      <p className="text-white/50">{info.notice}</p>
      <Pick label="Your take" file={mine} onFile={setTake} disabled={busy} />
      <Pick label="Reference song" file={ref} onFile={setRef} disabled={busy} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={busy || !mine || !ref || !info.configured}
                className="rounded-full border border-mcz-cyan bg-mcz-cyan/15 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : "Compare"}
        </button>
        {/* Price beside the control, before it is pressed; a failed run is free. */}
        <span className="text-mcz-ember">
          {info.free_today ? "Free today — uses 1 free prompt" : `−${info.cost_cents} ${PROMPTZ}`}
        </span>
        <span className="text-white/40">Not charged if it fails · nothing saved</span>
      </div>
      {err && <p className="text-red-300">{err}</p>}
      {res?.unscorable && <p className="text-amber-200">{res.unscorable}</p>}
      {res && !res.unscorable && (
        <div className="space-y-3">
          <p className="text-lg font-bold text-white">{res.closeness}% <span className="text-xs font-normal text-white/60">close — {res.closeness_why}</span></p>
          <p>{res.summary}</p>
          {Object.keys(res.scores || {}).length > 0 && (
            <ul className="grid gap-1 sm:grid-cols-2">
              {Object.entries(res.scores).map(([k, v]) => (
                <li key={k} className="flex justify-between rounded bg-white/5 px-2 py-1">
                  <span>{info.scores?.[k] || k}</span>
                  <span>you {v.take} · ref {v.reference}</span>
                </li>
              ))}
            </ul>
          )}
          {res.eq?.length > 0 && (
            <div>
              <p className="font-semibold text-white">EQ</p>
              {res.eq.map((e) => (
                <p key={e.region} className="mt-1"><b>{e.label} ({e.hz}) — {DIR[e.direction]}.</b> {e.what} {e.how && <span className="text-emerald-300">→ {e.how}</span>}</p>
              ))}
              <p className="mt-1 text-white/45">{res.eq_note}</p>
            </div>
          )}
          {res.how_to?.map((h, i) => (
            <div key={i}><p className="font-semibold text-white">{h.what}</p><p>{h.why}</p><p className="text-emerald-300">{h.how}</p></div>
          ))}
          {res.keep && <p><b>Keep:</b> {res.keep}</p>}
          {res.lyric_direction && (
            <div className="rounded border border-white/10 p-2">
              <p className="font-semibold text-white">Lyrics</p>
              <p>{res.lyric_direction}</p>
              <p className="text-white/45">{res.lyric_note}</p>
              <button type="button" onClick={toLyrics} className="mt-1 rounded-full border border-mcz-cyan px-3 py-1 text-[11px] text-white">
                Rewrite my lyrics in Sentence ConnectZ
              </button>
            </div>
          )}
          <p className="text-white/40">Not saved. Costs {res.cost_cents ? `${res.cost_cents} ${PROMPTZ}` : "a free daily prompt"}.</p>
        </div>
      )}
    </section>
  );
}
