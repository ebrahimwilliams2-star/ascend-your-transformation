/**
 * ETHAN'S BLUEPRINT — content layer.
 *
 * All programme content lives here, completely separate from UI logic.
 * Phase unlock milestones live in the `blueprint_phases` table so they can be
 * tuned without a code change; the values here are only fallbacks.
 * Adding a future phase = appending one entry to PHASES.
 */

export type ArtKey =
  | "bench"
  | "incline-press"
  | "fly"
  | "pushup"
  | "shoulder-press"
  | "lateral"
  | "rear-delt"
  | "curl"
  | "hammer"
  | "pushdown"
  | "overhead-ext"
  | "pulldown"
  | "row"
  | "straight-arm"
  | "squat"
  | "rdl"
  | "leg-press"
  | "lunge"
  | "leg-curl"
  | "calf"
  | "knee-raise"
  | "plank"
  | "dip"
  | "pullup"
  | "shrug"
  | "face-pull";

export type ExerciseDef = {
  name: string;
  art: ArtKey;
  muscles: string[];
  cues: string[];
};

export const EXERCISES: Record<string, ExerciseDef> = {
  "flat-bench": {
    name: "Flat Bench Press",
    art: "bench",
    muscles: ["Chest", "Front Delts", "Triceps"],
    cues: [
      "Feet planted firmly.",
      "Retract shoulder blades.",
      "Lower under control.",
      "Press explosively.",
      "Do not bounce the bar.",
    ],
  },
  "incline-db-press": {
    name: "Incline Dumbbell Press",
    art: "incline-press",
    muscles: ["Upper Chest", "Front Delts"],
    cues: [
      "Bench at 30 degrees.",
      "Elbows slightly tucked.",
      "Stretch at the bottom.",
      "Press up and slightly in.",
    ],
  },
  "chest-fly": {
    name: "Chest Fly (Machine / Cables)",
    art: "fly",
    muscles: ["Chest"],
    cues: [
      "Soft bend in the elbows.",
      "Chest proud, shoulders back.",
      "Squeeze for a beat at the top.",
      "Control the stretch — no swinging.",
    ],
  },
  "incline-pushup": {
    name: "Incline Push-ups",
    art: "pushup",
    muscles: ["Chest", "Triceps", "Core"],
    cues: [
      "Hands on a bench or bar.",
      "Body in one straight line.",
      "Lower to the chest.",
      "Take every set to failure.",
    ],
  },
  "seated-db-press": {
    name: "Seated Dumbbell Shoulder Press",
    art: "shoulder-press",
    muscles: ["Front Delts", "Side Delts", "Triceps"],
    cues: [
      "Brace your core, ribs down.",
      "Elbows just in front of the body.",
      "Press until arms lock softly.",
      "Lower to ear height.",
    ],
  },
  "lateral-raise": {
    name: "Dumbbell Lateral Raise",
    art: "lateral",
    muscles: ["Side Delts"],
    cues: [
      "Lead with the elbows.",
      "Raise to shoulder height.",
      "No swinging or shrugging.",
      "Slow on the way down.",
    ],
  },
  "rear-delt-fly": {
    name: "Rear Delt Fly",
    art: "rear-delt",
    muscles: ["Rear Delts", "Upper Back"],
    cues: [
      "Hinge forward, flat back.",
      "Think 'spread the arms wide'.",
      "Light weight, clean reps.",
      "Pause at the top.",
    ],
  },
  "barbell-curl": {
    name: "Barbell Curl",
    art: "curl",
    muscles: ["Biceps"],
    cues: [
      "Elbows pinned to your sides.",
      "No hip swing.",
      "Squeeze hard at the top.",
      "Full stretch at the bottom.",
    ],
  },
  "hammer-curl": {
    name: "Hammer Curl",
    art: "hammer",
    muscles: ["Biceps", "Brachialis", "Forearms"],
    cues: [
      "Neutral grip, thumbs up.",
      "Elbows stay still.",
      "Curl without leaning back.",
      "Control the negative.",
    ],
  },
  "rope-pushdown": {
    name: "Rope Pushdown",
    art: "pushdown",
    muscles: ["Triceps"],
    cues: [
      "Upper arms locked to your torso.",
      "Spread the rope at the bottom.",
      "Full lockout, no bouncing.",
      "Keep the shoulders down.",
    ],
  },
  "overhead-ext": {
    name: "Overhead Tricep Extension",
    art: "overhead-ext",
    muscles: ["Triceps (Long Head)"],
    cues: [
      "Elbows point forward.",
      "Deep stretch behind the head.",
      "Extend without flaring.",
      "Keep the ribs down.",
    ],
  },
  "lat-pulldown": {
    name: "Lat Pulldown",
    art: "pulldown",
    muscles: ["Lats", "Biceps"],
    cues: [
      "Chest up, slight lean back.",
      "Drive the elbows down.",
      "Pull to the collarbone.",
      "Control the stretch overhead.",
    ],
  },
  "chest-supported-row": {
    name: "Chest Supported Row",
    art: "row",
    muscles: ["Mid Back", "Lats", "Rear Delts"],
    cues: [
      "Chest glued to the pad.",
      "Row to the lower ribs.",
      "Squeeze the shoulder blades.",
      "No jerking the weight.",
    ],
  },
  "seated-cable-row": {
    name: "Seated Cable Row",
    art: "row",
    muscles: ["Mid Back", "Lats"],
    cues: [
      "Tall spine, no rocking.",
      "Pull to the belly button.",
      "Pause for a beat.",
      "Let the lats stretch forward.",
    ],
  },
  "straight-arm-pulldown": {
    name: "Straight Arm Pulldown",
    art: "straight-arm",
    muscles: ["Lats"],
    cues: [
      "Slight hinge at the hips.",
      "Arms nearly straight.",
      "Sweep the bar to your thighs.",
      "Feel the lats, not the triceps.",
    ],
  },
  "ez-bar-curl": {
    name: "EZ Bar Curl",
    art: "curl",
    muscles: ["Biceps"],
    cues: [
      "Angled grip, wrists relaxed.",
      "Elbows tight to the ribs.",
      "Curl with control.",
      "Stop the swing.",
    ],
  },
  "incline-db-curl": {
    name: "Incline Dumbbell Curl",
    art: "curl",
    muscles: ["Biceps (Long Head)"],
    cues: [
      "Bench at 45 degrees.",
      "Let the arms hang back.",
      "Curl without moving the elbow.",
      "Full stretch every rep.",
    ],
  },
  "barbell-squat": {
    name: "Barbell Squat",
    art: "squat",
    muscles: ["Quads", "Glutes", "Core"],
    cues: [
      "Brace before you descend.",
      "Knees track over the toes.",
      "Sit down, not forward.",
      "Drive through the mid-foot.",
    ],
  },
  rdl: {
    name: "Romanian Deadlift",
    art: "rdl",
    muscles: ["Hamstrings", "Glutes", "Lower Back"],
    cues: [
      "Soft knees, hips back.",
      "Bar stays close to the legs.",
      "Flat back throughout.",
      "Stop at the hamstring stretch.",
    ],
  },
  "leg-press": {
    name: "Leg Press",
    art: "leg-press",
    muscles: ["Quads", "Glutes"],
    cues: [
      "Feet shoulder width.",
      "Lower until 90 degrees.",
      "Don't let the lower back lift.",
      "Never lock the knees hard.",
    ],
  },
  "walking-lunge": {
    name: "Walking Lunges",
    art: "lunge",
    muscles: ["Quads", "Glutes", "Core"],
    cues: [
      "Long stride, tall chest.",
      "Back knee to just above the floor.",
      "Push through the front heel.",
      "Stay balanced, no rushing.",
    ],
  },
  "leg-curl": {
    name: "Leg Curl",
    art: "leg-curl",
    muscles: ["Hamstrings"],
    cues: [
      "Hips stay on the pad.",
      "Curl all the way in.",
      "Squeeze at the top.",
      "Slow release.",
    ],
  },
  "calf-raise": {
    name: "Standing Calf Raise",
    art: "calf",
    muscles: ["Calves"],
    cues: [
      "Full stretch at the bottom.",
      "Rise onto the big toe.",
      "Pause at the top.",
      "No bouncing.",
    ],
  },
  "knee-raise": {
    name: "Hanging Knee Raise",
    art: "knee-raise",
    muscles: ["Abs", "Hip Flexors"],
    cues: [
      "Hang without swinging.",
      "Curl the pelvis up.",
      "Knees to chest height.",
      "Lower slowly.",
    ],
  },
  plank: {
    name: "Plank",
    art: "plank",
    muscles: ["Core", "Glutes"],
    cues: [
      "Elbows under the shoulders.",
      "Squeeze glutes and abs.",
      "Straight line head to heels.",
      "Breathe — don't hold your breath.",
    ],
  },
  dip: {
    name: "Weighted Dip",
    art: "dip",
    muscles: ["Lower Chest", "Triceps"],
    cues: [
      "Lean forward slightly.",
      "Lower to a deep stretch.",
      "Elbows back, not flared.",
      "Lock out with control.",
    ],
  },
  pullup: {
    name: "Weighted Pull-up",
    art: "pullup",
    muscles: ["Lats", "Biceps"],
    cues: [
      "Dead hang start.",
      "Drive elbows to the hips.",
      "Chin clears the bar.",
      "No kipping.",
    ],
  },
  shrug: {
    name: "Barbell Shrug",
    art: "shrug",
    muscles: ["Traps"],
    cues: [
      "Straight up, not rolling.",
      "Pause at the top.",
      "Chin tucked.",
      "Full stretch down.",
    ],
  },
  "face-pull": {
    name: "Face Pull",
    art: "face-pull",
    muscles: ["Rear Delts", "Rotator Cuff"],
    cues: [
      "Rope to the forehead.",
      "Elbows high and wide.",
      "External rotate at the end.",
      "Light and strict.",
    ],
  },
};

export type BlueprintExercise = {
  slug: string;
  scheme: string;
  technique?: string;
};

export type BlueprintWorkout = {
  key: string;
  name: string;
  description: string;
  duration: string;
  difficulty: string;
  art: ArtKey;
  exercises: BlueprintExercise[];
};

export type BlueprintPhase = {
  key: string;
  name: string;
  tier: string;
  tagline: string;
  focus: string[];
  requiredLevel: number;
  requiredXp: number;
  workouts: BlueprintWorkout[];
};

const PHASE_1_WORKOUTS: BlueprintWorkout[] = [
  {
    key: "chest",
    name: "Chest Day",
    description: "Build pressing strength while developing a full chest.",
    duration: "45–60 Minutes",
    difficulty: "Beginner",
    art: "bench",
    exercises: [
      { slug: "flat-bench", scheme: "4 × 6–8" },
      { slug: "incline-db-press", scheme: "3 × 8–10" },
      { slug: "chest-fly", scheme: "3 × 12–15" },
      { slug: "incline-pushup", scheme: "3 Sets to Failure" },
    ],
  },
  {
    key: "shoulders-arms",
    name: "Shoulders & Arms",
    description: "Build wider shoulders and stronger arms.",
    duration: "45–60 Minutes",
    difficulty: "Beginner",
    art: "shoulder-press",
    exercises: [
      { slug: "seated-db-press", scheme: "4 × 8–10" },
      { slug: "lateral-raise", scheme: "4 × 12–15" },
      { slug: "rear-delt-fly", scheme: "3 × 12–15" },
      { slug: "barbell-curl", scheme: "3 × 8–10" },
      { slug: "hammer-curl", scheme: "3 × 10–12" },
      { slug: "rope-pushdown", scheme: "3 × 10–12" },
      { slug: "overhead-ext", scheme: "3 × 12" },
    ],
  },
  {
    key: "back-biceps",
    name: "Back & Biceps",
    description: "Develop width, thickness and pulling strength.",
    duration: "50–60 Minutes",
    difficulty: "Beginner",
    art: "pulldown",
    exercises: [
      { slug: "lat-pulldown", scheme: "4 × 8–10" },
      { slug: "chest-supported-row", scheme: "3 × 10" },
      { slug: "seated-cable-row", scheme: "3 × 10–12" },
      { slug: "straight-arm-pulldown", scheme: "3 × 12–15" },
      { slug: "ez-bar-curl", scheme: "3 × 8–10" },
      { slug: "incline-db-curl", scheme: "3 × 10–12" },
    ],
  },
  {
    key: "legs-core",
    name: "Legs & Core",
    description: "Build strength from the ground up.",
    duration: "60 Minutes",
    difficulty: "Beginner",
    art: "squat",
    exercises: [
      { slug: "barbell-squat", scheme: "4 × 6–8" },
      { slug: "rdl", scheme: "3 × 8–10" },
      { slug: "leg-press", scheme: "3 × 10" },
      { slug: "walking-lunge", scheme: "3 × 12 Each Leg" },
      { slug: "leg-curl", scheme: "3 × 12" },
      { slug: "calf-raise", scheme: "4 × 15" },
      { slug: "knee-raise", scheme: "3 × 15" },
      { slug: "plank", scheme: "3 × 60 Seconds" },
    ],
  },
];

const PHASE_2_WORKOUTS: BlueprintWorkout[] = [
  {
    key: "chest",
    name: "Chest Day",
    description: "More volume, tighter rest. Pressing power meets pump work.",
    duration: "55–70 Minutes",
    difficulty: "Intermediate",
    art: "bench",
    exercises: [
      { slug: "flat-bench", scheme: "5 × 5–8" },
      { slug: "incline-db-press", scheme: "4 × 8–10" },
      { slug: "dip", scheme: "3 × 8–10" },
      { slug: "chest-fly", scheme: "3 × 12–15", technique: "Superset with push-ups" },
      { slug: "incline-pushup", scheme: "3 Sets to Failure", technique: "Superset with flyes" },
    ],
  },
  {
    key: "shoulders-arms",
    name: "Shoulders & Arms",
    description: "Supersets and higher volume for wider delts and fuller arms.",
    duration: "55–70 Minutes",
    difficulty: "Intermediate",
    art: "shoulder-press",
    exercises: [
      { slug: "seated-db-press", scheme: "5 × 8–10" },
      { slug: "lateral-raise", scheme: "4 × 12–15", technique: "Superset with rear delt fly" },
      { slug: "rear-delt-fly", scheme: "4 × 12–15", technique: "Superset with laterals" },
      { slug: "face-pull", scheme: "3 × 15" },
      { slug: "barbell-curl", scheme: "4 × 8–10", technique: "Superset with pushdowns" },
      { slug: "rope-pushdown", scheme: "4 × 10–12", technique: "Superset with curls" },
      { slug: "hammer-curl", scheme: "3 × 10–12" },
      { slug: "overhead-ext", scheme: "3 × 12" },
    ],
  },
  {
    key: "back-biceps",
    name: "Back & Biceps",
    description: "Heavier pulls, more sets, deliberate stretch work.",
    duration: "60–70 Minutes",
    difficulty: "Intermediate",
    art: "pulldown",
    exercises: [
      { slug: "pullup", scheme: "4 × 6–8" },
      { slug: "chest-supported-row", scheme: "4 × 10" },
      { slug: "lat-pulldown", scheme: "3 × 10–12" },
      { slug: "seated-cable-row", scheme: "3 × 10–12" },
      { slug: "straight-arm-pulldown", scheme: "3 × 12–15" },
      { slug: "shrug", scheme: "3 × 12" },
      { slug: "ez-bar-curl", scheme: "4 × 8–10" },
      { slug: "incline-db-curl", scheme: "3 × 10–12" },
    ],
  },
  {
    key: "legs-core",
    name: "Legs & Core",
    description: "Bigger leg volume with a hard core finisher.",
    duration: "70 Minutes",
    difficulty: "Intermediate",
    art: "squat",
    exercises: [
      { slug: "barbell-squat", scheme: "5 × 5–8" },
      { slug: "rdl", scheme: "4 × 8–10" },
      { slug: "leg-press", scheme: "4 × 10–12" },
      { slug: "walking-lunge", scheme: "3 × 14 Each Leg" },
      { slug: "leg-curl", scheme: "4 × 12", technique: "Superset with calf raises" },
      { slug: "calf-raise", scheme: "4 × 15–20", technique: "Superset with leg curls" },
      { slug: "knee-raise", scheme: "3 × 15–20" },
      { slug: "plank", scheme: "3 × 90 Seconds" },
    ],
  },
];

const PHASE_3_WORKOUTS: BlueprintWorkout[] = [
  {
    key: "chest",
    name: "Chest Day",
    description: "Paused reps, tempo work and dropsets on the finisher.",
    duration: "60–75 Minutes",
    difficulty: "Advanced",
    art: "bench",
    exercises: [
      { slug: "flat-bench", scheme: "5 × 4–6", technique: "2-second pause on the chest" },
      { slug: "incline-db-press", scheme: "4 × 8–10", technique: "3-1-1 tempo" },
      { slug: "dip", scheme: "4 × 8–10", technique: "Weighted, last set to failure" },
      { slug: "chest-fly", scheme: "3 × 12–15", technique: "Double dropset on the last set" },
      { slug: "incline-pushup", scheme: "3 Sets to Failure", technique: "Rest-pause finisher" },
    ],
  },
  {
    key: "shoulders-arms",
    name: "Shoulders & Arms",
    description: "Advanced intensity: dropsets, partials and short rest.",
    duration: "60–75 Minutes",
    difficulty: "Advanced",
    art: "shoulder-press",
    exercises: [
      { slug: "seated-db-press", scheme: "5 × 6–8", technique: "1-second pause at the bottom" },
      { slug: "lateral-raise", scheme: "5 × 12–15", technique: "Dropset on the final set" },
      { slug: "rear-delt-fly", scheme: "4 × 15" },
      { slug: "face-pull", scheme: "3 × 15–20" },
      { slug: "barbell-curl", scheme: "4 × 6–8", technique: "Slow 4-second negatives" },
      { slug: "hammer-curl", scheme: "4 × 10–12", technique: "Superset with pushdowns" },
      { slug: "rope-pushdown", scheme: "4 × 12", technique: "Dropset on the final set" },
      { slug: "overhead-ext", scheme: "4 × 12–15" },
    ],
  },
  {
    key: "back-biceps",
    name: "Back & Biceps",
    description: "Heavy pulling with tempo, pauses and extended sets.",
    duration: "65–75 Minutes",
    difficulty: "Advanced",
    art: "pulldown",
    exercises: [
      { slug: "pullup", scheme: "5 × 5–8", technique: "Weighted, 3-second negatives" },
      { slug: "chest-supported-row", scheme: "4 × 8–10", technique: "1-second squeeze" },
      { slug: "lat-pulldown", scheme: "4 × 10–12", technique: "Dropset on the last set" },
      { slug: "seated-cable-row", scheme: "4 × 10–12" },
      { slug: "straight-arm-pulldown", scheme: "3 × 15" },
      { slug: "shrug", scheme: "4 × 12", technique: "2-second hold at the top" },
      { slug: "ez-bar-curl", scheme: "4 × 8", technique: "21s on the final set" },
      { slug: "incline-db-curl", scheme: "4 × 10–12" },
    ],
  },
  {
    key: "legs-core",
    name: "Legs & Core",
    description: "The hardest session in the system. Earn it.",
    duration: "75–85 Minutes",
    difficulty: "Advanced",
    art: "squat",
    exercises: [
      { slug: "barbell-squat", scheme: "5 × 4–6", technique: "2-second pause in the hole" },
      { slug: "rdl", scheme: "4 × 8", technique: "3-second eccentric" },
      { slug: "leg-press", scheme: "4 × 12", technique: "Dropset on the final set" },
      { slug: "walking-lunge", scheme: "4 × 16 Each Leg" },
      { slug: "leg-curl", scheme: "4 × 12–15", technique: "Dropset on the final set" },
      { slug: "calf-raise", scheme: "5 × 15–20", technique: "2-second stretch at the bottom" },
      { slug: "knee-raise", scheme: "4 × 20" },
      { slug: "plank", scheme: "3 × 120 Seconds" },
    ],
  },
];

export const PHASES: BlueprintPhase[] = [
  {
    key: "blueprint-1",
    name: "Blueprint I",
    tier: "Beginner",
    tagline: "Master the basics. Build consistency.",
    focus: ["Learning technique", "Consistency", "Strength foundation"],
    requiredLevel: 1,
    requiredXp: 0,
    workouts: PHASE_1_WORKOUTS,
  },
  {
    key: "blueprint-2",
    name: "Blueprint II",
    tier: "Intermediate",
    tagline: "More volume. More intent.",
    focus: ["Additional exercises", "Supersets", "Higher training volume"],
    requiredLevel: 6,
    requiredXp: 2500,
    workouts: PHASE_2_WORKOUTS,
  },
  {
    key: "blueprint-3",
    name: "Blueprint III",
    tier: "Advanced",
    tagline: "Advanced intensity. Earned strength.",
    focus: ["Dropsets", "Paused reps", "Tempo work", "Advanced split"],
    requiredLevel: 12,
    requiredXp: 6000,
    workouts: PHASE_3_WORKOUTS,
  },
];

export const ETHAN_TIPS = [
  "Perfect reps build perfect physiques.",
  "The strongest lifters master the basics.",
  "Consistency beats motivation.",
  "Progress isn't found in shortcuts.",
  "Leave your ego at the door.",
  "Train with intent.",
];

export function randomTip(seed = Math.random()) {
  return ETHAN_TIPS[Math.floor(seed * ETHAN_TIPS.length) % ETHAN_TIPS.length];
}

export function getPhase(key: string) {
  return PHASES.find((p) => p.key === key);
}

export function getWorkout(phaseKey: string, workoutKey: string) {
  return getPhase(phaseKey)?.workouts.find((w) => w.key === workoutKey);
}

/** Parses the leading set count out of a scheme like "4 × 6–8". */
export function setsFromScheme(scheme: string) {
  const n = parseInt(scheme, 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}
