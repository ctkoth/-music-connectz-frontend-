// BodieZ data — Jefit-style muscle groups, equipment, locations, and an
// exercise library tagged by muscle + required equipment. Exercises surface
// only when the user's current location has all the required equipment
// (bodyweight is always available).

export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
  "Traps", "Neck", "Abs", "Quadriceps", "Hamstrings", "Glutes", "Calves",
];

export const EQUIPMENT = [
  "Barbell", "Dumbbell", "Kettlebell", "EZ Bar", "Weight Plate",
  "Flat Bench", "Incline Bench", "Decline Bench", "Pulley", "Machine",
  "Resistance Band", "Bodyweight",
];

// Location presets adapt which equipment is available (premium can switch).
export const LOCATIONS = {
  Gym: EQUIPMENT,
  Home: ["Dumbbell", "Kettlebell", "Flat Bench", "Resistance Band", "Bodyweight"],
  Travel: ["Resistance Band", "Bodyweight"],
  Custom: [], // uses user's toggled customEquipment
};

// [name, muscle, [required equipment]]
const E = (name, muscle, equipment) => ({ name, muscle, equipment });
export const EXERCISES = [
  // Chest
  E("Barbell Bench Press", "Chest", ["Barbell", "Flat Bench"]),
  E("Incline Barbell Press", "Chest", ["Barbell", "Incline Bench"]),
  E("Decline Barbell Press", "Chest", ["Barbell", "Decline Bench"]),
  E("Dumbbell Bench Press", "Chest", ["Dumbbell", "Flat Bench"]),
  E("Incline Dumbbell Press", "Chest", ["Dumbbell", "Incline Bench"]),
  E("Dumbbell Fly", "Chest", ["Dumbbell", "Flat Bench"]),
  E("Cable Crossover", "Chest", ["Pulley"]),
  E("Chest Press Machine", "Chest", ["Machine"]),
  E("Push-Up", "Chest", ["Bodyweight"]),
  // Back
  E("Deadlift", "Back", ["Barbell", "Weight Plate"]),
  E("Barbell Row", "Back", ["Barbell"]),
  E("Dumbbell Row", "Back", ["Dumbbell", "Flat Bench"]),
  E("Lat Pulldown", "Back", ["Pulley"]),
  E("Seated Cable Row", "Back", ["Pulley"]),
  E("Pull-Up", "Back", ["Bodyweight"]),
  E("Machine Row", "Back", ["Machine"]),
  // Shoulders
  E("Overhead Barbell Press", "Shoulders", ["Barbell"]),
  E("Dumbbell Shoulder Press", "Shoulders", ["Dumbbell"]),
  E("Lateral Raise", "Shoulders", ["Dumbbell"]),
  E("Front Raise", "Shoulders", ["Dumbbell"]),
  E("Face Pull", "Shoulders", ["Pulley"]),
  E("Arnold Press", "Shoulders", ["Dumbbell"]),
  E("Pike Push-Up", "Shoulders", ["Bodyweight"]),
  // Biceps
  E("Barbell Curl", "Biceps", ["Barbell"]),
  E("EZ Bar Curl", "Biceps", ["EZ Bar"]),
  E("Dumbbell Curl", "Biceps", ["Dumbbell"]),
  E("Hammer Curl", "Biceps", ["Dumbbell"]),
  E("Cable Curl", "Biceps", ["Pulley"]),
  E("Band Curl", "Biceps", ["Resistance Band"]),
  // Triceps
  E("Close-Grip Bench Press", "Triceps", ["Barbell", "Flat Bench"]),
  E("Triceps Pushdown", "Triceps", ["Pulley"]),
  E("Skull Crusher", "Triceps", ["EZ Bar", "Flat Bench"]),
  E("Overhead Dumbbell Extension", "Triceps", ["Dumbbell"]),
  E("Dip", "Triceps", ["Bodyweight"]),
  // Forearms
  E("Barbell Wrist Curl", "Forearms", ["Barbell"]),
  E("Reverse Curl", "Forearms", ["EZ Bar"]),
  E("Farmer's Carry", "Forearms", ["Dumbbell"]),
  // Traps
  E("Barbell Shrug", "Traps", ["Barbell"]),
  E("Dumbbell Shrug", "Traps", ["Dumbbell"]),
  E("Cable Shrug", "Traps", ["Pulley"]),
  // Neck
  E("Neck Curl", "Neck", ["Weight Plate"]),
  E("Neck Extension", "Neck", ["Bodyweight"]),
  // Abs
  E("Cable Crunch", "Abs", ["Pulley"]),
  E("Hanging Leg Raise", "Abs", ["Bodyweight"]),
  E("Plank", "Abs", ["Bodyweight"]),
  E("Weighted Sit-Up", "Abs", ["Weight Plate"]),
  // Quadriceps
  E("Barbell Back Squat", "Quadriceps", ["Barbell", "Weight Plate"]),
  E("Front Squat", "Quadriceps", ["Barbell"]),
  E("Leg Press", "Quadriceps", ["Machine"]),
  E("Goblet Squat", "Quadriceps", ["Kettlebell"]),
  E("Walking Lunge", "Quadriceps", ["Dumbbell"]),
  E("Bodyweight Squat", "Quadriceps", ["Bodyweight"]),
  // Hamstrings
  E("Romanian Deadlift", "Hamstrings", ["Barbell"]),
  E("Lying Leg Curl", "Hamstrings", ["Machine"]),
  E("Dumbbell RDL", "Hamstrings", ["Dumbbell"]),
  E("Kettlebell Swing", "Hamstrings", ["Kettlebell"]),
  // Glutes
  E("Hip Thrust", "Glutes", ["Barbell", "Flat Bench"]),
  E("Cable Kickback", "Glutes", ["Pulley"]),
  E("Glute Bridge", "Glutes", ["Bodyweight"]),
  // Calves
  E("Standing Calf Raise", "Calves", ["Machine"]),
  E("Dumbbell Calf Raise", "Calves", ["Dumbbell"]),
  E("Bodyweight Calf Raise", "Calves", ["Bodyweight"]),
];

// Available if every required piece is in the location's equipment set.
export function isAvailable(exercise, available) {
  return exercise.equipment.every((eq) => available.includes(eq));
}

export function availableEquipment(bodiez) {
  if (!bodiez) return LOCATIONS.Gym;
  const loc = bodiez.location || "Gym";
  // A per-location override (set by (un)selecting equipment) wins for any location.
  const override = bodiez.locationEquipment?.[loc];
  if (override) return override;
  return presetEquipment(loc, bodiez);
}

// The preset equipment a location starts from (before any user override).
export function presetEquipment(loc, bodiez) {
  if (loc === "Custom") return bodiez?.customEquipment || ["Bodyweight"];
  if (LOCATIONS[loc]) return LOCATIONS[loc];
  return ["Bodyweight"]; // a user-created location starts minimal
}

// Display name for a location key (Premium can rename any location).
export function locName(bodiez, key) {
  return bodiez?.locationMeta?.[key]?.name || key;
}

// Muscle groups the current location covers — a per-location (un)select, or all.
export function availableMuscles(bodiez) {
  const loc = bodiez?.location || "Gym";
  const sel = bodiez?.locationMuscles?.[loc];
  return sel && sel.length ? sel : MUSCLE_GROUPS;
}
