/**
 * Ethan's Nutrition Blueprint — content + calculation layer.
 * Pure functions only, safe to import from client and server.
 */

export const GOALS = [
  { key: "cut", label: "Lose Fat (Cut)", note: "Strip fat, keep the muscle" },
  { key: "lean_bulk", label: "Lean Bulk", note: "Slow, clean size" },
  { key: "build_muscle", label: "Build Muscle", note: "Push size hard" },
  { key: "recomp", label: "Body Recomposition", note: "Lose fat, add muscle" },
  { key: "maintain", label: "Maintain Weight", note: "Hold and perform" },
] as const;
export type GoalKey = (typeof GOALS)[number]["key"];

export const LIFESTYLES = [
  { key: "sedentary", label: "Sedentary", mult: 1.2 },
  { key: "light", label: "Lightly Active", mult: 1.375 },
  { key: "moderate", label: "Moderately Active", mult: 1.55 },
  { key: "very", label: "Very Active", mult: 1.725 },
] as const;

export const INTENSITIES = [
  { key: "light", label: "Light", bonus: 0 },
  { key: "moderate", label: "Moderate", bonus: 60 },
  { key: "hard", label: "Hard", bonus: 130 },
] as const;

export const CARDIO = [
  { key: "none", label: "None", bonus: 0 },
  { key: "some", label: "1–2× a week", bonus: 60 },
  { key: "regular", label: "3–4× a week", bonus: 140 },
  { key: "daily", label: "5+ a week", bonus: 220 },
] as const;

export const DIETS = [
  "Standard",
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Dairy-Free",
  "Gluten-Free",
] as const;

export const BUDGETS = [
  { key: "budget", label: "Budget", note: "Cheap staples, same nutrition" },
  { key: "standard", label: "Standard", note: "Everyday supermarket" },
  { key: "premium", label: "Premium", note: "Wider ingredient range" },
] as const;

export const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Eggs",
  "Shellfish",
  "Fish",
  "Soy",
  "Wheat / gluten",
  "Sesame",
];

export const MEAL_COUNTS = [3, 4, 5, 6] as const;

export type BlueprintProfile = {
  age: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number | null;
  goal_type: GoalKey;
  training_days: number;
  intensity: string;
  cardio_frequency: string;
  lifestyle: string;
  diet_preference: string;
  allergies: string[];
  budget: string;
  meals_per_day: number;
  country: string;
};

export type Targets = {
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  water_ml: number;
  weekly_change_kg: number;
};

const GOAL_DELTA: Record<GoalKey, number> = {
  cut: -500,
  lean_bulk: 250,
  build_muscle: 450,
  recomp: -100,
  maintain: 0,
};

/** Mifflin–St Jeor with lifestyle, training and cardio layered on top. */
export function computeTargets(p: BlueprintProfile, calorieOverride?: number | null): Targets {
  const w = Number(p.weight_kg) || 70;
  const h = Number(p.height_cm) || 175;
  const a = Number(p.age) || 25;
  const bmr = Math.round(
    p.sex === "female" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5,
  );
  const lifestyle = LIFESTYLES.find((l) => l.key === p.lifestyle)?.mult ?? 1.375;
  const intensity = INTENSITIES.find((i) => i.key === p.intensity)?.bonus ?? 60;
  const cardio = CARDIO.find((c) => c.key === p.cardio_frequency)?.bonus ?? 60;
  const trainingLoad = Math.round((intensity * (Number(p.training_days) || 0)) / 7) + cardio;
  const tdee = Math.round(bmr * lifestyle + trainingLoad);

  const calorie_target = Math.max(
    1300,
    Math.round(calorieOverride ?? tdee + GOAL_DELTA[p.goal_type]),
  );

  const proteinPerKg = p.goal_type === "cut" ? 2.2 : p.goal_type === "maintain" ? 1.8 : 2.0;
  const protein_g = Math.round(w * proteinPerKg);
  const fatPct = p.goal_type === "cut" ? 0.25 : 0.28;
  const fat_g = Math.round((calorie_target * fatPct) / 9);
  const carbs_g = Math.max(40, Math.round((calorie_target - protein_g * 4 - fat_g * 9) / 4));
  const fibre_g = Math.round((calorie_target / 1000) * 14);
  const water_ml = Math.round(w * 35 + (Number(p.training_days) || 0) * 90);
  const weekly_change_kg = Number((((calorie_target - tdee) * 7) / 7700).toFixed(2));

  return { bmr, tdee, calorie_target, protein_g, carbs_g, fat_g, fibre_g, water_ml, weekly_change_kg };
}

export function mealSlots(count: number): string[] {
  switch (count) {
    case 3:
      return ["Breakfast", "Lunch", "Dinner"];
    case 5:
      return ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"];
    case 6:
      return [
        "Breakfast",
        "Morning Snack",
        "Lunch",
        "Afternoon Snack",
        "Dinner",
        "Evening Snack",
      ];
    default:
      return ["Breakfast", "Lunch", "Afternoon Snack", "Dinner"];
  }
}

export type PlanFood = { item: string; portion: string };
export type PlanSwap = { from: string; to: string };
export type PlanMeal = {
  name: string;
  title: string;
  foods: PlanFood[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep: string;
  swaps: PlanSwap[];
  coach_note?: string;
};
export type GroceryGroup = { category: string; items: { name: string; quantity: string }[] };
export type MealPrep = { batch: string[]; portioning: string[]; storage: string[] };
export type BlueprintPlan = {
  meals: PlanMeal[];
  grocery_list: GroceryGroup[];
  meal_prep: MealPrep;
  coaching: string[];
};

export const GOAL_LABEL: Record<GoalKey, string> = {
  cut: "Fat Loss",
  lean_bulk: "Lean Bulk",
  build_muscle: "Build Muscle",
  recomp: "Recomposition",
  maintain: "Maintain",
};

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
