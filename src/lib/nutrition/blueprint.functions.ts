import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const InputSchema = z.object({
  profile: z.object({
    age: z.number(),
    sex: z.string(),
    height_cm: z.number(),
    weight_kg: z.number(),
    goal_weight_kg: z.number().nullable(),
    goal_type: z.string(),
    training_days: z.number(),
    intensity: z.string(),
    cardio_frequency: z.string(),
    lifestyle: z.string(),
    diet_preference: z.string(),
    allergies: z.array(z.string()),
    budget: z.string(),
    meals_per_day: z.number(),
    country: z.string(),
  }),
  targets: z.object({
    calorie_target: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fibre_g: z.number(),
    water_ml: z.number(),
  }),
  slots: z.array(z.string()),
});

const SYSTEM = `You are Ethan, a no-nonsense strength coach who writes practical eating plans for real people.
You build ONE full day of eating that hits the given calorie and macro targets, using everyday supermarket foods available in the user's country.

RULES
- Total calories must land within 60 kcal of the target, protein within 10g.
- Respect diet preference, allergies and budget absolutely. Never include a listed allergen.
- Portions must be specific and weighable ("150g chicken breast", "60g dry oats", "1 medium banana").
- Prep instructions: one or two plain sentences, no chef language.
- Swaps: cheap, realistic alternatives with similar macros.
- Grocery list: grouped by supermarket aisle, quantities for 7 days of this plan.
- Coaching notes: short, direct, in Ethan's voice. Max 18 words each.
- Never mention that you are an AI. Never add commentary outside the JSON.

Return STRICT JSON only, no markdown fence:
{"meals":[{"name":"Breakfast","title":"short meal name","foods":[{"item":"","portion":""}],"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"prep":"","swaps":[{"from":"","to":""}],"coach_note":""}],
"grocery_list":[{"category":"","items":[{"name":"","quantity":""}]}],
"meal_prep":{"batch":[""],"portioning":[""],"storage":[""]},
"coaching":[""]}`;

const PlanSchema = z.object({
  meals: z
    .array(
      z.object({
        name: z.string().default("Meal"),
        title: z.string().default(""),
        foods: z
          .array(z.object({ item: z.string().default(""), portion: z.string().default("") }))
          .default([]),
        calories: z.coerce.number().default(0),
        protein_g: z.coerce.number().default(0),
        carbs_g: z.coerce.number().default(0),
        fat_g: z.coerce.number().default(0),
        prep: z.string().default(""),
        swaps: z
          .array(z.object({ from: z.string().default(""), to: z.string().default("") }))
          .default([]),
        coach_note: z.string().default(""),
      }),
    )
    .default([]),
  grocery_list: z
    .array(
      z.object({
        category: z.string().default("Other"),
        items: z
          .array(z.object({ name: z.string().default(""), quantity: z.string().default("") }))
          .default([]),
      }),
    )
    .default([]),
  meal_prep: z
    .object({
      batch: z.array(z.string()).default([]),
      portioning: z.array(z.string()).default([]),
      storage: z.array(z.string()).default([]),
    })
    .default({ batch: [], portioning: [], storage: [] }),
  coaching: z.array(z.string()).default([]),
});

function parseJsonBlock(raw: string): unknown {

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

export const generateNutritionBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured right now.");

    const { profile, targets, slots } = data;
    const prompt = `Build today's plan.

TARGETS
Calories: ${targets.calorie_target} kcal
Protein: ${targets.protein_g}g · Carbs: ${targets.carbs_g}g · Fat: ${targets.fat_g}g
Fibre: ${targets.fibre_g}g · Water: ${Math.round(targets.water_ml / 100) / 10}L

PERSON
${profile.age}y ${profile.sex}, ${profile.height_cm}cm, ${profile.weight_kg}kg${profile.goal_weight_kg ? ` (goal ${profile.goal_weight_kg}kg)` : ""}
Goal: ${profile.goal_type}
Trains ${profile.training_days} days/week at ${profile.intensity} intensity, cardio: ${profile.cardio_frequency}
Daily lifestyle: ${profile.lifestyle}
Diet: ${profile.diet_preference}
Allergies / avoid: ${profile.allergies.length ? profile.allergies.join(", ") : "none"}
Budget: ${profile.budget}
Country: ${profile.country}

Use exactly these ${slots.length} meal slots in this order, using the slot name as "name": ${slots.join(", ")}.`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Ethan's busy — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep building plans.");
    if (!res.ok) throw new Error("Couldn't build your plan right now. Try again.");

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty plan returned. Try again.");

    const parsed = PlanSchema.safeParse(parseJsonBlock(raw));

    if (!parsed.success || parsed.data.meals.length === 0) {
      throw new Error("Plan came back malformed. Try again.");
    }

    return parsed.data;
  });

