// PersonaZ skill taxonomy.
//
// Shape follows musicconnectz_code_2.2: persona → category → { key: "Label 🎛️" }.
// Two things carried over deliberately from 2.2:
//   * every skill carries an emoji, so the picker reads at a glance;
//   * categories split TOOLS from TECHNIQUE — "which DAW" and "can you mix"
//     are different questions, and a collaborator filters on different ones.
//   * each category opens with an "Any …" wildcard, so a member can claim the
//     category without itemising it.
//
// What 2.2 did not have: a start date per skill. The backend derives a member's
// experience from the earliest date on their skills (profile_max_experience),
// so the date is the part that turns a claimed skill into years served.

const DAWS = {
  any_daw: "Any DAW 🎛️",
  ableton: "Ableton Live 🎵",
  audition: "Adobe Audition 🎙️",
  audacity: "Audacity 🎧",
  bitwig: "Bitwig Studio 🎚️",
  cakewalk: "Cakewalk 🎼",
  cubase: "Cubase 🎛️",
  flstudio: "FL Studio 🎚️",
  garageband: "GarageBand 🎵",
  logic: "Logic Pro 🎵",
  luna: "Luna ☁️",
  mixcraft: "Mixcraft 🎚️",
  studioone: "Studio One 🎛️",
  protools: "Pro Tools 🎙️",
  reason: "Reason 🎛️",
  reaper: "Reaper 🔧",
  waveform: "Waveform Pro 📊",
};

const VIDEO_SOFTWARE = {
  any_video_software: "Any Video Software 🎬",
  premiere: "Adobe Premiere 🎬",
  resolve: "DaVinci Resolve 🎞️",
  finalcut: "Final Cut Pro 🎥",
  vegas: "Sony Vegas 📹",
  filmora: "Filmora 🎬",
  aftereffects: "After Effects ✨",
  obs: "OBS Studio 🔴",
};

// ---- The `artist` tree from musicconnectz_code_2.2, carried over whole.
// It was missing entirely: no instruments, no rap styles, no vocal ranges —
// 50 skills, and the reason an instrumentalist had nothing true to claim.
// Keys stay stable; labels carry 2.2's emoji.

const STRINGS = {
  any_string: "Any String 🎸",
  acoustic_guitar: "Acoustic Guitar 🎸",
  electric_guitar: "Electric Guitar 🎸",
  bass_guitar: "Bass Guitar 🎸",
  ukulele: "Ukulele 🎸",
  banjo: "Banjo 🎸",
  mandolin: "Mandolin 🎸",
  violin: "Violin 🎻",
  viola: "Viola 🎻",
  cello: "Cello 🎻",
  double_bass: "Double Bass 🎻",
  harp: "Harp 🎵",
};

const KEYBOARDS = {
  any_keyboard: "Any Keyboard 🎹",
  acoustic_piano: "Acoustic Piano 🎹",
  digital_piano: "Digital Piano 🎹",
  synthesizer: "Synthesizer 🎹",
  organ: "Organ 🎹",
  harpsichord: "Harpsichord 🎹",
  accordion: "Accordion 🎹",
};

const PERCUSSION = {
  any_percussion: "Any Percussion 🥁",
  drums_snare: "Drums (Snare) 🥁",
  drums_bass: "Drums (Bass) 🥁",
  drums_bongo: "Drums (Bongo) 🥁",
  cymbals: "Cymbals 🥁",
};

// The blueprint's rap style tracks — the same 17 RapZ is built around.
const RAPPING = {
  any_rapping: "Any Rapping 🎤",
  alternative_rap: "Alternative Rap 🎸",
  boom_bap: "Boom Bap 🥁",
  chopper: "Chopper 🚁",
  cloud_rap: "Cloud Rap ☁️",
  conscious_rap: "Conscious Rap 🧠",
  crunk: "Crunk 🔥",
  drill: "Drill ⚔️",
  emo_rap: "Emo Rap 🖤",
  g_funk: "G-Funk 🌴",
  gangsta_rap: "Gangsta Rap ⛓️",
  hardcore_hip_hop: "Hardcore Hip Hop 🎤",
  jazz_rap: "Jazz Rap 🎷",
  mumble_rap: "Mumble Rap 💤",
  old_school: "Old School 📻",
  snap: "Snap 🫰",
  trap: "Trap 🏚️",
};

// The eight range classes, matching the blueprint's Gamified Vocal Range Logic
// and the target-range picker in the SingZ Boss Take.
const SINGING = {
  any_singing: "Any Singing 🎶",
  bass: "Bass 🧔‍♂️",
  baritone: "Baritone 🎙️",
  tenor: "Tenor 🎤",
  countertenor: "Countertenor 🕊️",
  contralto: "Contralto 🎻",
  alto: "Alto 🎶",
  mezzo_soprano: "Mezzo-Soprano 🌊",
  soprano: "Soprano ☀️",
};

export const PERSONA_SKILLS = {
  indieartist: {
    "String Instruments": STRINGS,
    "Keyboard Instruments": KEYBOARDS,
    "Percussion Instruments": PERCUSSION,
    "Rapping": RAPPING,
    "Singing": SINGING,
    "Performance": {
      any_performance: "Any Performance 🎤",
      songwriting: "Songwriting ✍️",
      vocals: "Vocals 🎤",
      freestyle: "Freestyle 🔥",
      stage_presence: "Stage Presence 🌟",
      touring: "Touring 🚐",
    },
    "Release Craft": {
      any_release: "Any Release Craft 💿",
      self_release: "Self-Release 💿",
      cover_art: "Cover Art Direction 🖼️",
      playlist_pitching: "Playlist Pitching 📈",
      fan_building: "Fan Building 💞",
    },
  },

  producer: {
    "Music DAWs": DAWS,
    "Production Techniques": {
      any_production: "Any Production 🎚️",
      beat_making: "Beat Making 🎚️",
      sampling: "Sampling 🎵",
      sound_design: "Sound Design 🎛️",
      arrangement: "Arrangement 🎼",
      synthesis: "Synthesis 🎹",
      drum_programming: "Drum Programming 🥁",
    },
  },

  mixengineer: {
    "Music DAWs": DAWS,
    "Engineering Skills": {
      any_engineering: "Any Engineering 🎛️",
      mixing: "Mixing 🎛️",
      mastering: "Mastering 🎙️",
      eq: "EQ 📊",
      compression: "Compression 🔧",
      reverb_fx: "Reverb / Effects ✨",
      vocal_tuning: "Vocal Tuning 🎯",
      stem_prep: "Stem Prep 📦",
    },
  },

  ghostwriter: {
    "Writing": {
      any_writing: "Any Writing ✍️",
      bars: "Bars ✍️",
      hooks: "Hooks 🪝",
      toplines: "Toplines 🎼",
      storytelling: "Storytelling 📖",
      concept_development: "Concept Development 💡",
      punch_ins: "Punch-Ins 🥊",
    },
  },

  designer: {
    "Design Software": {
      any_design_software: "Any Design Software 🎨",
      photoshop: "Adobe Photoshop 🎨",
      illustrator: "Adobe Illustrator 🖌️",
      indesign: "Adobe InDesign 📄",
      figma: "Figma 🎯",
      canva: "Canva 🌈",
      affinity: "Affinity Designer ✨",
      coreldraw: "CorelDRAW 🎨",
      sketch: "Sketch 📐",
      blender: "Blender 🧊",
      after_effects_design: "After Effects ✨",
    },
    "Design Skills": {
      any_design_skill: "Any Design Skill 🎨",
      graphic_design: "Graphic Design 🖌️",
      composition: "Composition & Layout 📐",
      color_theory: "Color Theory 🌈",
      typography: "Typography 🔤",
      brand_identity: "Brand Identity 🏷️",
      ui_ux: "UI/UX Prototyping 🎯",
      visual_storytelling: "Visual Storytelling 📖",
      asset_production: "Asset Production 📦",
      icon_design: "Icon Design 🎭",
    },
  },

  videographer: {
    "Video Software": VIDEO_SOFTWARE,
    "Video Skills": {
      any_video_skill: "Any Video Skill 🎬",
      cinematography: "Cinematography 🎥",
      camera_operation: "Camera Operation 📷",
      lighting: "Lighting Techniques 💡",
      audio_capture: "Audio Capture 🎙️",
      editing: "Video Editing 🎬",
      color_grading: "Color Grading 🎨",
      motion_graphics: "Motion Graphics ✨",
      storyboarding: "Storyboarding 🗂️",
      music_video: "Music Video Production 🎞️",
      social_optimization: "Social Optimization 📱",
      drone: "Drone Footage 🚁",
    },
  },

  developer: {
    "Languages": {
      any_language: "Any Language 💻",
      python: "Python 🐍",
      javascript: "JavaScript 🟨",
      typescript: "TypeScript 🔷",
      java: "Java ☕",
      csharp: "C# 💜",
      cpp: "C++ ⚙️",
      go: "Go 🐹",
      rust: "Rust 🦀",
      swift: "Swift 🦅",
      kotlin: "Kotlin 🟣",
    },
    "Build Skills": {
      any_build: "Any Build Skill 🛠️",
      frontend: "Frontend 🖥️",
      backend: "Backend 🗄️",
      mobile: "Mobile 📱",
      audio_dsp: "Audio / DSP 🎚️",
      apis: "APIs 🔌",
      devops: "DevOps 🚀",
    },
  },

  mime: {
    "Performance": {
      any_mime: "Any Mime Skill 🤫",
      lipsync: "LipSync 👄",
      selfie: "Selfie 🤳",
      dance: "Dance 💃",
      drama: "Drama 🎭",
      comedy: "Comedy 😂",
    },
  },

  director: {
    "Direction": {
      any_direction: "Any Direction 🎬",
      shot_calling: "Shot Calling 🎬",
      talent_direction: "Talent Direction 🗣️",
      scene_blocking: "Scene Blocking 📐",
      treatment_writing: "Treatment Writing 📝",
      set_management: "Set Management 🎪",
    },
  },

  manager: {
    "Leadership": {
      any_leadership: "Any Leadership 🧭",
      strategic_planning: "Strategic Planning 🗺️",
      team_leadership: "Team Leadership 🧭",
      communication: "Communication 🗣️",
      conflict_resolution: "Conflict Resolution 🤝",
      decision_making: "Decision-Making ⚖️",
    },
    "Operations": {
      any_operations: "Any Operations 📋",
      project_management: "Project Management 📋",
      performance_tracking: "Performance Tracking 📈",
      resource_management: "Resource Management 💰",
      release_planning: "Release Planning 🗓️",
    },
  },

  arscout: {
    "Scouting": {
      any_scouting: "Any Scouting 🔭",
      talent_spotting: "Talent Spotting 🔭",
      market_analysis: "Market Analysis 📊",
      deal_structuring: "Deal Structuring 📜",
      roster_building: "Roster Building 👥",
      trend_reading: "Trend Reading 📈",
    },
  },
};

/** Flat {key: label} for one persona, across all its categories. */
export function skillsFor(personaKey) {
  const cats = PERSONA_SKILLS[personaKey] || {};
  return Object.assign({}, ...Object.values(cats));
}

/** Human label for a skill key, falling back to the key itself. */
export function skillLabel(personaKey, skillKey) {
  return skillsFor(personaKey)[skillKey] || skillKey;
}

/** Whole years from a YYYY-MM-DD start date — mirrors the server's _skill_years. */
// ---- Experience is time SERVED, not time elapsed.
//
// A skill carries stints: [{start, end}], where end omitted means "still doing
// it". Experience is the SUM of them. The old rule was `today - start`, so
// someone who played 1999-2013 and stopped read 26 years instead of 14 — a
// number nobody could have earned, printed next to their name.
//
// Back-compat: a skill with a bare `start` and no `periods` is one open stint,
// so nothing anyone already saved changes meaning until they add an end date.
// Mirrors _periods_of / _skill_years / skill_activity in apps/economy/social.py.

export function periodsOf(skill) {
  if (!skill || typeof skill !== "object") return [];
  if (Array.isArray(skill.periods) && skill.periods.length) {
    return skill.periods.filter((p) => p && p.start);
  }
  return skill.start ? [{ start: skill.start }] : [];
}

const asDate = (v) => {
  const [y, m, d] = String(v || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
};

/** Whole calendar years from a to b, plus leftover days. Day-count division
 *  under-reports an exact anniversary — nine years can be 3287 days, and
 *  3287 / 365.2425 is 8.9995, so someone hitting nine today would read eight. */
function yearsAndDays(a, b) {
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  const bmd = (b.getUTCMonth() + 1) * 100 + b.getUTCDate();
  const amd = (a.getUTCMonth() + 1) * 100 + a.getUTCDate();
  if (bmd < amd) years -= 1;
  const anniv = new Date(Date.UTC(a.getUTCFullYear() + years, a.getUTCMonth(), a.getUTCDate()));
  return [years, Math.round((b - anniv) / 86400000)];
}

/** Total years served on a skill — the sum of its stints. null if undated. */
export function skillYears(skill) {
  // Tolerate a bare date string, which is how this used to be called.
  const sk = typeof skill === "string" ? { start: skill } : skill;
  const today = new Date();
  const now = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  let years = 0, days = 0, counted = false;
  for (const p of periodsOf(sk)) {
    const a = asDate(p.start);
    if (!a) continue;
    let b = asDate(p.end) || now;
    if (b > now) b = now;
    if (b <= a) continue;
    const [y, d] = yearsAndDays(a, b);
    years += y; days += d; counted = true;
  }
  if (!counted) return null;
  return years + Math.floor(days / 365);
}

/** { active, lastPlayed } — 14 years still going is not 14 years that stopped
 *  in 2013, and a collaborator is choosing between those two. */
export function skillActivity(skill) {
  const periods = periodsOf(typeof skill === "string" ? { start: skill } : skill);
  if (!periods.length) return { active: false, lastPlayed: null };
  if (periods.some((p) => !p.end)) return { active: true, lastPlayed: null };
  return { active: false, lastPlayed: periods.map((p) => p.end).sort().pop() };
}
