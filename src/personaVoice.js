// PersonaZ — every persona, in one list, with Corey's read on each.
//
// The list was typed into ProfileZ.jsx; it lives here now so ProfileZ and the
// PersonaZ screen cannot disagree about which personas exist, what they are
// called, or which picture they wear. The SKILLS stay in personaSkills.js.
//
// The read goes through the VoiceZ ladder (voice.js `say`): `plain` is the
// floor and always says the thing, `slang` is how this place actually talks,
// `explicit` only where a swear earns its spot. Emoji are ornament, so a
// member with the emoji switch off gets the same sentence without them.

// [key, label, icon, fallback emoji]
export const PERSONAS = [
  ["arscout", "A&R Scout", "personaz_arscout.png", "🔭"],
  ["designer", "Designer", "personaz_designer.png", "🎨"],
  ["developer", "Developer", "personaz_developer.png", "💻"],
  ["director", "Director", "personaz_director.webp", "🎬"],
  ["ghostwriter", "GhostWriter", "personaz_ghostwriter.png", "✍️"],
  ["indieartist", "Indie Artist", "personaz_indieartist.png", "🎤"],
  ["manager", "Manager", "personaz_manager.png", "🧭"],
  ["actor", "Actor", "personaz_actor.png", "🎭"],
  ["actress", "Actress", "personaz_actress.png", "🎭"],
  ["dancer", "Dancer", "personaz_dancer.png", "💃"],
  ["mime", "Mime", "personaz_mime.png", "🤫"],
  ["mixengineer", "Mix Engineer", "personaz_mixengineer.png", "🎚️"],
  ["producer", "Producer", "personaz_producer.png", "🎛️"],
  ["videographer", "Videographer", "personaz_videographer.png", "🎥"],
  ["weightlifter", "Weightlifter", "personaz_weightlifter.png", "🏋️"],
];

export const PERSONA_READ = {
  arscout: {
    plain: "🔭 You hear it before the numbers do. You find the artist, make the case, and put the deal on the table.",
    slang: "🔭 You hear the hit before the streams catch up. Find 'em, sign 'em, put 'em on.",
    explicit: "🔭 You hear the hit before the streams catch up. Find 'em, sign 'em, put the damn deal on the table.",
  },
  designer: {
    plain: "🎨 You make the music look like it sounds — covers, brands, every frame of the vibe.",
    slang: "🎨 You make the sound visible. Covers, brands, the whole look — the drip is yours.",
  },
  developer: {
    plain: "💻 You build the tools the rest of us live in. Ship it, then make it better.",
    slang: "💻 You build what everybody else plays in. Ship it, then make it hit harder.",
    explicit: "💻 You build what everybody else plays in. Ship the damn thing, then make it hit harder.",
  },
  director: {
    plain: "🎬 You see the whole scene before anybody shoots it — the shot, the story, the moment.",
    slang: "🎬 You see the scene before the cameras roll. Call the shot, own the story.",
  },
  ghostwriter: {
    plain: "✍️ Your words in someone else's mouth, and they land. The bars are the job, the credit's optional.",
    slang: "✍️ Your bars, their voice — and it still slaps. You write it so they can own it.",
    explicit: "✍️ Your bars, their voice — and it still fucking slaps. You write it so they can own it.",
  },
  indieartist: {
    plain: "🎤 You're the label, the artist and the hustle. Every drop is yours from first bar to release.",
    slang: "🎤 You're the label, the artist and the whole hustle. No middleman — every drop is yours.",
    explicit: "🎤 You're the label, the artist and the whole damn hustle. No middleman — every drop is yours.",
  },
  manager: {
    plain: "🧭 You keep the team moving — the plan, the people and the deadlines that make the release real.",
    slang: "🧭 You keep the whole team locked in — the plan, the people, the dates. You make it happen.",
  },
  actor: {
    plain: "🎭 You become somebody else on cue and make people believe it.",
    slang: "🎭 You switch into somebody else on cue and make 'em buy it.",
  },
  actress: {
    plain: "🎭 You carry the scene — the look, the line, the moment everyone remembers.",
    slang: "🎭 You carry the scene. The look, the line, the moment they replay.",
  },
  dancer: {
    plain: "💃 You turn the beat into movement. People feel the song through you.",
    slang: "💃 You turn the beat into motion — they feel the track through you.",
  },
  mime: {
    plain: "🤫 Lipsync, selfie, dance, drama, comedy — you say everything without a word.",
    slang: "🤫 Lipsync, selfie, dance, drama, comedy — you say it all without saying a thing.",
  },
  mixengineer: {
    plain: "🎚️ You hear the frequency that's off and you fix it. Clean mixes, loud masters, no mud.",
    slang: "🎚️ You catch the frequency that's off. Clean mix, loud master, zero mud.",
    explicit: "🎚️ You catch the frequency that's off. Clean mix, loud as hell, zero mud.",
  },
  producer: {
    plain: "🎛️ The beat starts with you — the sound, the bounce, the bed every verse sits on.",
    slang: "🎛️ The beat starts with you. The bounce, the sound, the bed every verse sits on.",
    explicit: "🎛️ The beat starts with you. The bounce, the sound — you make the whole thing knock like hell.",
  },
  videographer: {
    plain: "🎥 Filming, editing, music videos — you turn a track into something people watch twice.",
    slang: "🎥 Shoot it, cut it, make 'em watch it twice. You turn a track into a moment.",
  },
  weightlifter: {
    plain: "🏋️ You put in the reps. Strength is a craft too, and you treat it like one.",
    slang: "🏋️ You put in the reps. Strength's a craft and you train it like one.",
    explicit: "🏋️ You put in the damn reps. Strength's a craft and you train it like one.",
  },
};

export const personaLabel = (key) => (PERSONAS.find(([k]) => k === key) || [])[1] || key;
