// Paste this into the browser console ON THE LIVE SITE to find out what the
// recorder actually does on that machine, in that browser.
//
//   1. open musicconnectz.net (any page)
//   2. DevTools → Console → paste → Enter
//   3. allow the mic when asked
//
// It exists because the recorder's failure modes are environmental — which
// codec the browser picks, whether another app is holding the device, whether
// the page is on https — and none of them can be reproduced from a CI box or
// read out of the source. When a take fails on somebody's machine, this says
// why in about ten seconds. It records ~2 seconds of audio and nothing leaves
// the browser.
(async () => {
  const line = (k, v) => console.log(`%c${k.padEnd(22)}%c${v}`, "color:#22e6ff", "color:inherit");
  console.log("%cMusic ConnectZ — recorder self-check", "font-weight:bold;font-size:14px");

  line("page", location.origin);
  line("secure context", window.isSecureContext);
  line("mediaDevices", !!navigator.mediaDevices?.getUserMedia);
  line("MediaRecorder", typeof MediaRecorder !== "undefined");
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return console.error(window.isSecureContext === false
      ? "Not a secure context — recording is blocked by the browser, not by us. Check the URL is https."
      : "This browser has no MediaRecorder. Upload is the path here.");
  }

  // The same preference order BossTake.bestMime walks, so the answer below is
  // the container a real take would be recorded into.
  const AUDIO = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm",
                 "audio/mp4;codecs=mp4a.40.2", "audio/mp4"];
  const VIDEO = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  console.log("supported containers:");
  [...AUDIO, ...VIDEO].forEach((t) =>
    console.log(`   ${MediaRecorder.isTypeSupported(t) ? "yes" : "NO "}  ${t}`));
  const pick = AUDIO.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  line("audio would use", pick || "(browser default)");

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    line("mics seen", devices.filter((d) => d.kind === "audioinput").length);
    line("cameras seen", devices.filter((d) => d.kind === "videoinput").length);
  } catch { /* labels need permission; counts are enough */ }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    // The whole point: the NAME is the diagnosis, and "refused" is usually wrong.
    const meaning = {
      NotAllowedError: "you (or the browser) blocked it — check the address-bar icon",
      SecurityError: "blocked, or the page isn't on https",
      NotFoundError: "there is no microphone on this device",
      NotReadableError: "ANOTHER APP HAS THE MIC — Zoom, Teams, OBS, another tab",
      TrackStartError: "ANOTHER APP HAS THE MIC — Zoom, Teams, OBS, another tab",
      OverconstrainedError: "the mic can't do what was asked for",
    }[e.name] || "unexpected";
    return console.error(`getUserMedia failed: ${e.name} — ${meaning}`);
  }

  const track = stream.getAudioTracks()[0];
  line("track label", track?.label || "(unnamed)");
  line("track muted", track?.muted);   // true = OS/browser is muting the input
  line("track state", track?.readyState);

  const mr = new MediaRecorder(stream, pick ? { mimeType: pick } : {});
  const chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onerror = (e) => console.error("recorder error:", e?.error?.name);
  const stopped = new Promise((r) => (mr.onstop = r));
  mr.start(1000);
  console.log("recording 2s — make some noise…");
  await new Promise((r) => setTimeout(r, 2200));
  mr.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());

  const bytes = chunks.reduce((n, c) => n + c.size, 0);
  line("chunks", chunks.length);
  line("bytes captured", bytes);
  line("recorded as", mr.mimeType);
  console.log(bytes > 1000
    ? "%cRECORDER OK — a take here would have real audio in it."
    : "%cRECORDER CAPTURED NOTHING — the mic opened but no audio arrived. "
      + "Check the input isn't muted or set to a device with no signal.",
    `font-weight:bold;color:${bytes > 1000 ? "#34d399" : "#ff5500"}`);
})();
