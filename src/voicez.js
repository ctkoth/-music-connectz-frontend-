// VoiceZ — pure helpers. The SERVER decides every cap, tier number and
// sentence; this file only counts, looks up and labels. It imports nothing that
// reads import.meta.env so it runs under plain node.

/** "412 / 1,200" style count against a cap the server served. */
export function countAgainst(text, cap) {
  const n = String(text ?? "").length;
  return { n, cap, over: Number.isFinite(cap) && n > cap, label: Number.isFinite(cap) ? `${n.toLocaleString()} / ${cap.toLocaleString()}` : String(n) };
}

/** Split "a, b\nc" into a trimmed, de-duplicated list (counting only). */
export function toList(text) {
  const seen = new Set();
  return String(text ?? "").split(/[\n,]/).map((s) => s.trim()).filter((s) => {
    const k = s.toLowerCase();
    if (!s || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Problems the form can point at before sending. The server still decides. */
export function formProblems(f, caps) {
  const out = [];
  if (!String(f.name ?? "").trim()) out.push("Give the voice a name.");
  const check = (label, text, cap) => { if (cap && String(text ?? "").length > cap) out.push(`${label} is over ${cap.toLocaleString()} characters.`); };
  check("The name", f.name, caps?.name);
  check("Who is talking", f.bio, caps?.bio);
  check("The writing sample", f.sample, caps?.sample);
  const ph = toList(f.phrases), av = toList(f.avoid);
  if (caps?.phrases && ph.length > caps.phrases) out.push(`Signature phrases hold up to ${caps.phrases}.`);
  if (caps?.avoid && av.length > caps.avoid) out.push(`Words to avoid hold up to ${caps.avoid}.`);
  return out;
}

/** The dial option object for a value, or null. */
export function dialOption(dials, key, value) {
  const d = (dials || []).find((x) => x.key === key);
  return d?.options.find((o) => o.key === value) || null;
}

/** The server's result sentence for a surface and a pick; "" when unknown. */
export function surfaceResult(surface, choice) {
  return surface?.options?.find((o) => o.choice === choice)?.result || "";
}

/** A blank form built from the dials' own defaults. */
export function blankForm(dials) {
  const spec = {};
  (dials || []).forEach((d) => { spec[d.key] = d.default; });
  return { name: "", bio: "", personality: "", sample: "", phrases: "", avoid: "", spec };
}

/** Form -> request body. */
export function toBody(f) {
  return {
    name: f.name.trim(), bio: f.bio, personality: f.personality || "", sample: f.sample,
    spec: { ...f.spec, signature_phrases: toList(f.phrases), avoid_words: toList(f.avoid) },
  };
}

/** A stored voice -> form. */
export function fromVoice(v) {
  const { signature_phrases = [], avoid_words = [], ...dials } = v.spec || {};
  return { name: v.name, bio: v.bio, personality: v.personality || "", sample: v.sample,
           phrases: signature_phrases.join("\n"), avoid: avoid_words.join("\n"), spec: dials };
}
