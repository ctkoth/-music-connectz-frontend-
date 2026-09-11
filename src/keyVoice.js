// The phone's own voice, and how to tell when it hasn't got one.
//
// `speechSynthesis` is on every browser and every phone. It costs nothing,
// works offline, needs no key, and speaks the languages the device has voices
// installed for — which on most handsets is the big ones and nothing else.
//
// That gap is the whole reason this file is careful. KeyConnectZ deliberately
// carries Yorùbá, Igbo, Hausa and Amharic, and those are exactly the languages
// a phone has no voice for. If "read this aloud" quietly did nothing for them,
// the feature would work for English speakers and fail silently for the members
// it was most worth building for — so the caller has to be able to ASK whether
// the device can do it, and fall back to the server when it can't.
//
// One definition, here, because the answer is needed in two places already (the
// text you typed and the translation that came back) and a second copy would
// drift the moment one of them got a fix.

/** The device's voices, waiting for the list to arrive if it hasn't yet.
 *
 * `getVoices()` is empty on the first call in Chrome and fills in later, which
 * is how "your phone can't speak Spanish" gets said about a phone that can.
 */
export function voicesReady(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const synth = typeof window !== "undefined" && window.speechSynthesis;
    if (!synth) return resolve([]);
    const now = synth.getVoices();
    if (now.length) return resolve(now);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.("voiceschanged", finish);
      resolve(synth.getVoices() || []);
    };
    synth.addEventListener?.("voiceschanged", finish);
    // Never hang the button on a browser that fires the event late or not at
    // all — an unanswered promise here is a speaker icon that spins forever.
    setTimeout(finish, timeoutMs);
  });
}

/** The device voice for `lang`, or null.
 *
 * Matched on the language subtag only: the app stores "pt", the device offers
 * "pt-BR", and demanding an exact match would reject a perfectly good voice.
 */
export async function deviceVoiceFor(lang) {
  const want = String(lang || "").toLowerCase().split("-")[0];
  if (!want || want === "auto") return null;
  const voices = await voicesReady();
  return voices.find((v) => String(v.lang || "").toLowerCase().split("-")[0] === want) || null;
}

/** Speak `text` with the device's own voice. Resolves false when it has none.
 *
 * False is an answer, not a failure — it is the caller's cue to ask the server,
 * which is the only reason the server voice exists.
 */
export async function speakOnDevice(text, lang) {
  const synth = typeof window !== "undefined" && window.speechSynthesis;
  if (!synth || !String(text || "").trim()) return false;
  const voice = await deviceVoiceFor(lang);
  if (!voice) return false;
  try {
    // Whatever was being read is no longer what the member asked for.
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Stop whatever the device is saying. Safe to call when it is saying nothing. */
export function stopDeviceVoice() {
  try { window.speechSynthesis?.cancel(); } catch { /* nothing was speaking */ }
}

/** Play a base64 payload the server sent back, resolving when it ends. */
export function playBase64(b64, mime = "audio/wav") {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(`data:${mime};base64,${b64}`);
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

/** What the browser can record a voice clip as.
 *
 * Ogg and mp4 first where they exist: the server relabels containers, but
 * recording into one the model reads natively means the clip never needs
 * rescuing. Safari can only do mp4, so it stays in the list.
 */
export function bestClipMime() {
  const wanted = ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  return wanted.find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || "";
}
