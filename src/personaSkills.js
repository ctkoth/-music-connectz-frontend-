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

export const PERSONA_SKILLS = {
  indieartist: {
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
export function skillYears(start) {
  if (!start) return null;
  const [y, m, d] = String(start).split("-").map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  let years = today.getFullYear() - y;
  const md = (today.getMonth() + 1) * 100 + today.getDate();
  if (md < m * 100 + d) years -= 1;
  return years >= 0 ? years : null;
}
