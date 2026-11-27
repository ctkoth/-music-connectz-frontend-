// Where the sound comes out: speakers, headphones, a USB interface, a Bluetooth headset. In plain view beside the transport, because
// "I plugged my headphones in" is a thing you do mid-session, and a setting hidden in a panel is one you do not find at that moment.
//
// Chrome and Edge can send the audio engine to a chosen device (`setSinkId`); other browsers play through the system's current output and
// this says so rather than showing a control that does nothing. The switch pauses the engine around the change (engine.setOutput), which
// is what keeps it from clicking. If the chosen device is unplugged the picker falls back to the system default and says so.
import { useCallback, useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { defaultOutputName, outputGoneNote } from "./audioIO.js";

const KEY = "mcz_daw_output";
const saved = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };

export function useOutputs(daw) {
  const [outputs, setOutputs] = useState([]);
  const [output, setOutput] = useState(saved);
  const [note, setNote] = useState("");
  const canOut = daw.outputCanChange();

  const apply = useCallback(async (id) => {
    setNote("");
    try {
      const r = await daw.setOutput(id);
      if (!r.ok) setNote("This browser plays through the system's output. Change it in your system's sound settings.");
      else { setOutput(id); try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ } }
    } catch (e) { setNote(e?.message || "Couldn't switch the output."); }
  }, [daw]);

  const list = useCallback(async () => {
    const ds = (await navigator.mediaDevices?.enumerateDevices?.().catch(() => [])) || [];
    const outs = ds.filter((d) => d.kind === "audiooutput");
    setOutputs(outs);
    setOutput((cur) => {
      if (cur && outs.length && !outs.some((d) => d.deviceId === cur)) { setNote(outputGoneNote("")); daw.setOutput("").catch(() => {}); try { localStorage.removeItem(KEY); } catch { /* blocked */ } return ""; }
      return cur;
    });
  }, [daw]);

  useEffect(() => {
    list();
    navigator.mediaDevices?.addEventListener?.("devicechange", list);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", list);
  }, [list]);
  // Come back to the output chosen last time on this device.
  useEffect(() => { const s = saved(); if (s && canOut) daw.setOutput(s).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Without the microphone's permission a browser gives no device NAMES. Chrome's own picker names them without it.
  const named = outputs.some((d) => d.label);
  const choose = async () => {
    try { const d = await navigator.mediaDevices.selectAudioOutput(); await apply(d.deviceId); list(); }
    catch (e) { if (e?.name !== "NotAllowedError") setNote(e?.message || "Couldn't open the device picker."); }
  };
  return { outputs, output, canOut, note, apply, choose, named, canChoose: typeof navigator !== "undefined" && typeof navigator.mediaDevices?.selectAudioOutput === "function" };
}

export default function OutputPick({ daw }) {
  const o = useOutputs(daw);
  const def = defaultOutputName(o.outputs);
  return (
    <span className="flex flex-wrap items-center gap-1 text-[11px]" data-tour="daw-output">
      <Headphones size={12} className="text-white/60" aria-hidden />
      {o.canOut ? (
        <select className="neon-input !w-auto !py-1 text-xs [color-scheme:dark]" data-nomemo="true" aria-label="Output device: speakers or headphones" value={o.output}
                title="Where the sound comes out. Changing it pauses for a moment so it doesn't click." onChange={(e) => o.apply(e.target.value)}>
          <option value="">{def ? `Output: system default (${def})` : "Output: system default"}</option>
          {o.outputs.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Output ${i + 1}`}</option>)}
        </select>
      ) : <span className="text-white/50" title="Chrome and Edge can pick the output here; this browser uses your system's output.">Output: system</span>}
      {o.canOut && !o.named && o.canChoose && <button type="button" className="re-link" onClick={o.choose}>Choose output…</button>}
      {o.note && <span className="text-mcz-gold">{o.note}</span>}
    </span>
  );
}
