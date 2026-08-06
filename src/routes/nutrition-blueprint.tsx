import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Droplets,
  Flame,
  Loader2,
  RefreshCw,
  Repeat2,
  ShoppingCart,
  Sparkles,
  Timer,
  Utensils,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { haptic } from "@/lib/motion";
import { generateNutritionBlueprint } from "@/lib/nutrition/blueprint.functions";
import {
  BUDGETS,
  CARDIO,
  COMMON_ALLERGENS,
  DIETS,
  GOALS,
  GOAL_LABEL,
  INTENSITIES,
  LIFESTYLES,
  MEAL_COUNTS,
  computeTargets,
  mealSlots,
  todayISO,
  type BlueprintPlan,
  type BlueprintProfile,
  type GoalKey,
  type PlanMeal,
} from "@/lib/nutrition/blueprint";

export const Route = createFileRoute("/nutrition-blueprint")({
  head: () => ({
    meta: [
      { title: "Ethan's Nutrition Blueprint — ASCEND" },
      {
        name: "description",
        content:
          "A personalised day of eating built around your body, goal and budget — meals, macros, grocery list and prep plan.",
      },
      { property: "og:title", content: "Ethan's Nutrition Blueprint — ASCEND" },
      {
        property: "og:description",
        content: "Stop guessing what to eat. Ethan builds the plan, you follow it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <NutritionBlueprint />
    </AppShell>
  ),
});

type DbProfile = BlueprintProfile & {
  id: string;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  water_ml: number | null;
  weekly_change_kg: number | null;
};

function NutritionBlueprint() {
  const { user } = useUser();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["nb-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_blueprint_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as DbProfile | null) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-8 animate-breathe rounded-full bg-brand-red" />
      </div>
    );
  }

  return profile ? <PlanView profile={profile} /> : <Onboarding />;
}

/* ------------------------------------------------------------------ header */

function Header({ subtitle, right }: { subtitle: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-brand-black/85 p-6 backdrop-blur-md">
      <Link to="/nutrition" onClick={() => haptic("light")} className="tap text-brand-silver">
        <ArrowLeft className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="chip-label truncate text-brand-red">{subtitle}</p>
        <h1 className="text-display mt-0.5 text-2xl font-bold leading-none">Nutrition Blueprint</h1>
      </div>
      {right}
    </header>
  );
}

/* -------------------------------------------------------------- onboarding */

const EMPTY: BlueprintProfile = {
  age: 25,
  sex: "male",
  height_cm: 175,
  weight_kg: 75,
  goal_weight_kg: null,
  goal_type: "cut",
  training_days: 4,
  intensity: "moderate",
  cardio_frequency: "some",
  lifestyle: "moderate",
  diet_preference: "Standard",
  allergies: [],
  budget: "standard",
  meals_per_day: 4,
  country: "South Africa",
};

const STEPS = ["You", "Goal", "Training", "Lifestyle", "Food", "Meals", "Plan"];

function Onboarding() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BlueprintProfile>(EMPTY);
  const targets = useMemo(() => computeTargets(form), [form]);
  const generate = useServerFn(generateNutritionBlueprint);

  const save = useMutation({
    mutationFn: async () => {
      const plan = await generate({
        data: {
          profile: { ...form, allergies: form.allergies },
          targets: {
            calorie_target: targets.calorie_target,
            protein_g: targets.protein_g,
            carbs_g: targets.carbs_g,
            fat_g: targets.fat_g,
            fibre_g: targets.fibre_g,
            water_ml: targets.water_ml,
          },
          slots: mealSlots(form.meals_per_day),
        },
      });

      const { error: pErr } = await supabase.from("nutrition_blueprint_profiles").upsert(
        {
          user_id: user!.id,
          ...form,
          calorie_target: targets.calorie_target,
          protein_g: targets.protein_g,
          carbs_g: targets.carbs_g,
          fat_g: targets.fat_g,
          fibre_g: targets.fibre_g,
          water_ml: targets.water_ml,
          weekly_change_kg: targets.weekly_change_kg,
        },
        { onConflict: "user_id" },
      );
      if (pErr) throw pErr;

      const { error: plErr } = await supabase.from("nutrition_blueprint_plans").insert({
        user_id: user!.id,
        targets: targets as unknown as never,
        meals: plan.meals,
        grocery_list: plan.grocery_list,
        meal_prep: plan.meal_prep,
        coaching: plan.coaching,
        profile_snapshot: form as unknown as never,
      });
      if (plErr) throw plErr;
    },
    onSuccess: () => {
      haptic("heavy");
      toast.success("Your blueprint is locked in");
      qc.invalidateQueries({ queryKey: ["nb-profile"] });
      qc.invalidateQueries({ queryKey: ["nb-plan"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't build your plan"),
  });

  const set = <K extends keyof BlueprintProfile>(k: K, v: BlueprintProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="pb-8">
      <Header subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`} />

      <div className="px-6">
        <div className="mb-6 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand-red transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {step === 0 && (
          <div className="space-y-5">
            <Field label="Age">
              <Num value={form.age} onChange={(v) => set("age", v)} />
            </Field>
            <Field label="Sex">
              <Segmented
                options={[
                  { k: "male", label: "Male" },
                  { k: "female", label: "Female" },
                ]}
                value={form.sex}
                onChange={(v) => set("sex", v)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <Num value={form.height_cm} onChange={(v) => set("height_cm", v)} />
              </Field>
              <Field label="Weight (kg)">
                <Num value={form.weight_kg} onChange={(v) => set("weight_kg", v)} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field label="What are we chasing?">
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <Choice
                    key={g.key}
                    active={form.goal_type === g.key}
                    label={g.label}
                    note={g.note}
                    onClick={() => set("goal_type", g.key as GoalKey)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Goal weight (kg) — optional">
              <Num
                value={form.goal_weight_kg ?? 0}
                onChange={(v) => set("goal_weight_kg", v || null)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field label="Training days per week">
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <Pill
                    key={d}
                    active={form.training_days === d}
                    label={String(d)}
                    onClick={() => set("training_days", d)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Workout intensity">
              <Segmented
                options={INTENSITIES.map((i) => ({ k: i.key, label: i.label }))}
                value={form.intensity}
                onChange={(v) => set("intensity", v)}
              />
            </Field>
            <Field label="Cardio frequency">
              <div className="space-y-2">
                {CARDIO.map((c) => (
                  <Choice
                    key={c.key}
                    active={form.cardio_frequency === c.key}
                    label={c.label}
                    note={c.bonus ? `+${c.bonus} kcal/day` : "No extra fuel"}
                    onClick={() => set("cardio_frequency", c.key)}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Field label="Daily lifestyle activity">
              <div className="space-y-2">
                {LIFESTYLES.map((l) => (
                  <Choice
                    key={l.key}
                    active={form.lifestyle === l.key}
                    label={l.label}
                    note={`Activity ×${l.mult}`}
                    onClick={() => set("lifestyle", l.key)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Country">
              <input
                value={form.country}
                maxLength={60}
                onChange={(e) => set("country", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3 text-base font-semibold text-white focus:border-brand-red focus:outline-none"
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <Field label="Dietary preference">
              <div className="grid grid-cols-2 gap-2">
                {DIETS.map((d) => (
                  <Pill
                    key={d}
                    active={form.diet_preference === d}
                    label={d}
                    onClick={() => set("diet_preference", d)}
                  />
                ))}
              </div>
            </Field>
            <Field label="Allergies / foods to avoid">
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((a) => {
                  const on = form.allergies.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() =>
                        set(
                          "allergies",
                          on ? form.allergies.filter((x) => x !== a) : [...form.allergies, a],
                        )
                      }
                      className={`tap rounded-full border px-3 py-2 text-xs font-bold ${
                        on
                          ? "border-brand-red bg-brand-red/15 text-white"
                          : "border-white/10 bg-brand-gray text-brand-silver"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Budget">
              <div className="space-y-2">
                {BUDGETS.map((b) => (
                  <Choice
                    key={b.key}
                    active={form.budget === b.key}
                    label={b.label}
                    note={b.note}
                    onClick={() => set("budget", b.key)}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 5 && (
          <Field label="Meals per day">
            <div className="grid grid-cols-4 gap-2">
              {MEAL_COUNTS.map((m) => (
                <Pill
                  key={m}
                  active={form.meals_per_day === m}
                  label={String(m)}
                  onClick={() => set("meals_per_day", m)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-brand-silver">
              {mealSlots(form.meals_per_day).join(" · ")}
            </p>
          </Field>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-red/60 bg-gradient-to-br from-brand-gray to-black p-5 shadow-glow-red">
              <p className="chip-label mb-1 text-brand-red">Daily Target</p>
              <p className="text-display text-4xl font-bold italic">
                {targets.calorie_target.toLocaleString()} kcal
              </p>
              <p className="mt-2 text-xs text-brand-silver">
                Maintenance {targets.tdee.toLocaleString()} kcal ·{" "}
                {targets.weekly_change_kg === 0
                  ? "holding steady"
                  : `${targets.weekly_change_kg > 0 ? "+" : ""}${targets.weekly_change_kg} kg/week`}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Protein" value={`${targets.protein_g}g`} />
              <Stat label="Carbs" value={`${targets.carbs_g}g`} />
              <Stat label="Fat" value={`${targets.fat_g}g`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Fibre" value={`${targets.fibre_g}g`} />
              <Stat label="Water" value={`${(targets.water_ml / 1000).toFixed(1)}L`} />
            </div>
            <p className="text-xs leading-relaxed text-brand-silver">
              Ethan will build a full day of eating around these numbers using{" "}
              {form.diet_preference.toLowerCase()} foods you can actually buy in {form.country}.
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => {
                haptic("light");
                setStep(step - 1);
              }}
              className="tap flex-1 rounded-xl border border-white/10 bg-brand-gray py-3 text-sm font-bold uppercase tracking-widest text-brand-silver"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => {
                haptic("light");
                setStep(step + 1);
              }}
              className="tap flex-1 rounded-xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="tap flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-60"
            >
              {save.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Building…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Build My Blueprint
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- plan view */

type PlanRow = {
  id: string;
  meals: PlanMeal[];
  grocery_list: BlueprintPlan["grocery_list"];
  meal_prep: BlueprintPlan["meal_prep"];
  coaching: string[];
  generated_at: string;
};

function PlanView({ profile }: { profile: DbProfile }) {
  const { user } = useUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"plan" | "grocery" | "prep">("plan");
  const generate = useServerFn(generateNutritionBlueprint);
  const today = todayISO();

  const { data: plan, isLoading } = useQuery({
    queryKey: ["nb-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_blueprint_plans")
        .select("id, meals, grocery_list, meal_prep, coaching, generated_at")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PlanRow | null) ?? null;
    },
  });

  const { data: done = [] } = useQuery({
    queryKey: ["nb-meals-done", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_meal_completions")
        .select("meal_index")
        .eq("user_id", user!.id)
        .eq("log_date", today);
      if (error) throw error;
      return (data ?? []).map((r) => r.meal_index);
    },
  });

  const toggleMeal = useMutation({
    mutationFn: async ({ index, meal }: { index: number; meal: PlanMeal }) => {
      if (done.includes(index)) {
        const { error } = await supabase
          .from("nutrition_meal_completions")
          .delete()
          .eq("user_id", user!.id)
          .eq("log_date", today)
          .eq("meal_index", index);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("nutrition_meal_completions").insert({
        user_id: user!.id,
        plan_id: plan?.id ?? null,
        log_date: today,
        meal_index: index,
        meal_name: meal.name,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      haptic(added ? "medium" : "light");
      if (added) toast.success("Meal ticked · +15 XP");
      qc.invalidateQueries({ queryKey: ["nb-meals-done"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update meal"),
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const targets = computeTargets(profile, profile.calorie_target);
      const fresh = await generate({
        data: {
          profile: {
            age: profile.age,
            sex: profile.sex,
            height_cm: Number(profile.height_cm),
            weight_kg: Number(profile.weight_kg),
            goal_weight_kg: profile.goal_weight_kg ? Number(profile.goal_weight_kg) : null,
            goal_type: profile.goal_type,
            training_days: profile.training_days,
            intensity: profile.intensity,
            cardio_frequency: profile.cardio_frequency,
            lifestyle: profile.lifestyle,
            diet_preference: profile.diet_preference,
            allergies: profile.allergies ?? [],
            budget: profile.budget,
            meals_per_day: profile.meals_per_day,
            country: profile.country,
          },
          targets: {
            calorie_target: profile.calorie_target ?? targets.calorie_target,
            protein_g: profile.protein_g ?? targets.protein_g,
            carbs_g: profile.carbs_g ?? targets.carbs_g,
            fat_g: profile.fat_g ?? targets.fat_g,
            fibre_g: profile.fibre_g ?? targets.fibre_g,
            water_ml: profile.water_ml ?? targets.water_ml,
          },
          slots: mealSlots(profile.meals_per_day),
        },
      });

      await supabase
        .from("nutrition_blueprint_plans")
        .update({ is_active: false })
        .eq("user_id", user!.id)
        .eq("is_active", true);

      const { error } = await supabase.from("nutrition_blueprint_plans").insert({
        user_id: user!.id,
        targets: targets as unknown as never,
        meals: fresh.meals,
        grocery_list: fresh.grocery_list,
        meal_prep: fresh.meal_prep,
        coaching: fresh.coaching,
        profile_snapshot: {} as unknown as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      haptic("heavy");
      toast.success("Fresh plan ready");
      qc.invalidateQueries({ queryKey: ["nb-plan"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't rebuild the plan"),
  });

  const restart = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("nutrition_blueprint_profiles")
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nb-profile"] });
      toast.success("Blueprint reset");
    },
  });

  const totals = useMemo(() => {
    const meals = plan?.meals ?? [];
    return meals.reduce(
      (acc, m) => ({
        cal: acc.cal + Number(m.calories || 0),
        p: acc.p + Number(m.protein_g || 0),
        c: acc.c + Number(m.carbs_g || 0),
        f: acc.f + Number(m.fat_g || 0),
      }),
      { cal: 0, p: 0, c: 0, f: 0 },
    );
  }, [plan]);

  const proteinGap = Math.max(0, (profile.protein_g ?? 0) - Math.round(totals.p));
  const eatenCals = (plan?.meals ?? []).reduce(
    (sum, m, i) => (done.includes(i) ? sum + Number(m.calories || 0) : sum),
    0,
  );
  const target = profile.calorie_target ?? 0;

  return (
    <div className="pb-8">
      <Header
        subtitle={`${GOAL_LABEL[profile.goal_type as GoalKey] ?? profile.goal_type} · ${target.toLocaleString()} KCAL`}
        right={
          <button
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="tap grid size-10 place-items-center rounded-xl bg-brand-red/15 text-brand-red disabled:opacity-50"
            aria-label="Rebuild plan"
          >
            {regenerate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </button>
        }
      />

      {/* Targets */}
      <section className="mb-6 px-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand-red/35 bg-black p-6 shadow-glow-red">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-red/20 blur-3xl"
            aria-hidden
          />
          <p className="chip-label relative text-brand-red">Today's Blueprint</p>
          <p className="text-display relative mt-1 text-4xl font-bold italic">
            {eatenCals.toLocaleString()}
            <span className="text-lg font-semibold not-italic text-brand-silver">
              {" "}
              / {target.toLocaleString()} kcal
            </span>
          </p>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-red transition-all duration-500"
              style={{ width: `${target ? Math.min(100, (eatenCals / target) * 100) : 0}%` }}
            />
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <Stat label="Protein" value={`${profile.protein_g ?? 0}g`} />
            <Stat label="Carbs" value={`${profile.carbs_g ?? 0}g`} />
            <Stat label="Fat" value={`${profile.fat_g ?? 0}g`} />
          </div>
          <div className="relative mt-2 grid grid-cols-2 gap-2">
            <Stat label="Fibre" value={`${profile.fibre_g ?? 0}g`} />
            <Stat label="Water" value={`${((profile.water_ml ?? 0) / 1000).toFixed(1)}L`} />
          </div>
        </div>
      </section>

      <WeeklyReview profile={profile} />

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-3 gap-2 px-6">
        {(
          [
            { k: "plan", label: "Meals", Icon: Utensils },
            { k: "grocery", label: "Grocery", Icon: ShoppingCart },
            { k: "prep", label: "Prep", Icon: Timer },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => {
              haptic("light");
              setTab(t.k);
            }}
            className={`tap flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold uppercase tracking-widest ${
              tab === t.k
                ? "border-brand-red bg-brand-red/15 text-white"
                : "border-white/10 bg-brand-gray text-brand-silver"
            }`}
          >
            <t.Icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="px-6 text-sm text-brand-silver">Loading your plan…</p>
      )}

      {!isLoading && !plan && (
        <div className="px-6">
          <div className="rounded-2xl border border-white/10 bg-brand-gray p-6 text-center">
            <p className="text-sm text-brand-silver">No plan yet.</p>
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="tap mt-4 w-full rounded-xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-60"
            >
              {regenerate.isPending ? "Building…" : "Build My Plan"}
            </button>
          </div>
        </div>
      )}

      {plan && tab === "plan" && (
        <section className="space-y-4 px-6">
          {plan.meals.map((m, i) => (
            <MealCard
              key={`${m.name}-${i}`}
              meal={m}
              done={done.includes(i)}
              onToggle={() => toggleMeal.mutate({ index: i, meal: m })}
            />
          ))}

          {proteinGap > 0 && (
            <div className="rounded-2xl border border-brand-red/30 bg-brand-gray p-5">
              <div className="flex items-center gap-2">
                <Droplets className="size-4 text-brand-red" />
                <p className="chip-label text-brand-red">Smart Shake</p>
              </div>
              <p className="mt-2 text-sm text-white">
                You're {proteinGap}g of protein short today. That's{" "}
                {Math.max(1, Math.round(proteinGap / 25))} scoop
                {Math.round(proteinGap / 25) > 1 ? "s" : ""} of whey (~
                {Math.max(1, Math.round(proteinGap / 25)) * 120} kcal) in water.
              </p>
              <p className="mt-1 text-xs text-brand-silver">
                Prefer food? Add 150g Greek yoghurt or 4 egg whites instead.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-brand-gray p-5">
            <p className="chip-label mb-2 text-brand-silver">Plan totals</p>
            <p className="text-sm text-white">
              {Math.round(totals.cal).toLocaleString()} kcal · {Math.round(totals.p)}P /{" "}
              {Math.round(totals.c)}C / {Math.round(totals.f)}F
            </p>
          </div>

          {plan.coaching.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-brand-gray p-5">
              <p className="chip-label mb-3 text-brand-red">Ethan says</p>
              <ul className="space-y-2">
                {plan.coaching.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-brand-silver">
                    <Flame className="mt-0.5 size-3.5 shrink-0 text-brand-red" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => restart.mutate()}
            className="tap w-full rounded-xl border border-white/10 py-3 text-xs font-bold uppercase tracking-widest text-brand-silver"
          >
            Redo Blueprint Questions
          </button>
        </section>
      )}

      {plan && tab === "grocery" && (
        <section className="space-y-4 px-6">
          {plan.grocery_list.length === 0 && (
            <p className="text-sm text-brand-silver">No grocery list on this plan.</p>
          )}
          {plan.grocery_list.map((g) => (
            <div key={g.category} className="rounded-2xl border border-white/10 bg-brand-gray p-5">
              <p className="chip-label mb-3 text-brand-red">{g.category}</p>
              <ul className="space-y-2">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white">{it.name}</span>
                    <span className="shrink-0 text-brand-silver">{it.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {plan && tab === "prep" && (
        <section className="space-y-4 px-6">
          <PrepBlock title="Batch Cook" items={plan.meal_prep?.batch ?? []} />
          <PrepBlock title="Portioning" items={plan.meal_prep?.portioning ?? []} />
          <PrepBlock title="Storage" items={plan.meal_prep?.storage ?? []} />
        </section>
      )}
    </div>
  );
}

function MealCard({
  meal,
  done,
  onToggle,
}: {
  meal: PlanMeal;
  done: boolean;
  onToggle: () => void;
}) {
  const [showSwaps, setShowSwaps] = useState(false);
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-brand-gray p-5 transition-colors ${
        done ? "border-brand-red/50" : "border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="chip-label text-brand-red">{meal.name}</p>
          <p className="text-display mt-1 text-lg font-bold leading-tight">{meal.title}</p>
        </div>
        <button
          onClick={onToggle}
          aria-label={done ? "Mark meal as not eaten" : "Mark meal as eaten"}
          className={`tap grid size-9 shrink-0 place-items-center rounded-full border ${
            done ? "border-brand-red bg-brand-red text-white" : "border-white/20 text-brand-silver"
          }`}
        >
          <Check className="size-4" />
        </button>
      </div>

      <ul className="mt-3 space-y-1.5">
        {meal.foods.map((f, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-white">{f.item}</span>
            <span className="shrink-0 text-brand-silver">{f.portion}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
        <span className="rounded-full bg-black px-2.5 py-1 text-brand-red">
          {Math.round(Number(meal.calories))} kcal
        </span>
        <span className="rounded-full bg-black px-2.5 py-1 text-brand-silver">
          {Math.round(Number(meal.protein_g))}P
        </span>
        <span className="rounded-full bg-black px-2.5 py-1 text-brand-silver">
          {Math.round(Number(meal.carbs_g))}C
        </span>
        <span className="rounded-full bg-black px-2.5 py-1 text-brand-silver">
          {Math.round(Number(meal.fat_g))}F
        </span>
      </div>

      {meal.prep && <p className="mt-3 text-xs leading-relaxed text-brand-silver">{meal.prep}</p>}
      {meal.coach_note && (
        <p className="mt-2 text-xs font-semibold text-white/90">“{meal.coach_note}”</p>
      )}

      {meal.swaps?.length > 0 && (
        <>
          <button
            onClick={() => setShowSwaps((s) => !s)}
            className="tap mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-brand-silver"
          >
            <span className="flex items-center gap-2">
              <Repeat2 className="size-3.5" /> Swaps
            </span>
            <ChevronRight
              className={`size-3.5 transition-transform ${showSwaps ? "rotate-90" : ""}`}
            />
          </button>
          {showSwaps && (
            <ul className="mt-2 space-y-1.5">
              {meal.swaps.map((s, i) => (
                <li key={i} className="text-xs text-brand-silver">
                  <span className="text-white">{s.from}</span> → {s.to}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function PrepBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-brand-gray p-5">
      <p className="chip-label mb-3 text-brand-red">{title}</p>
      <ol className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-brand-silver">
            <span className="text-display shrink-0 font-bold text-brand-red">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ----------------------------------------------------------- weekly review */

function WeeklyReview({ profile }: { profile: DbProfile }) {
  const { user } = useUser();
  const qc = useQueryClient();

  const review = useMutation({
    mutationFn: async () => {
      const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("measurements")
        .select("weight_kg, recorded_at")
        .eq("user_id", user!.id)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });
      if (error) throw error;

      const points = (data ?? []).filter((d) => d.weight_kg != null);
      if (points.length < 2) {
        throw new Error("Log at least two weigh-ins so Ethan can read the trend.");
      }

      const first = Number(points[0].weight_kg);
      const last = Number(points[points.length - 1].weight_kg);
      const change = Number((last - first).toFixed(2));
      const expected = Number(profile.weekly_change_kg ?? 0);

      let delta = 0;
      let verdict = "on_track";
      let message = "Right on the money. Same plan, same effort — keep going.";

      if (expected < 0 && change > expected + 0.35) {
        delta = -150;
        verdict = "too_slow";
        message = `Only ${change}kg movement. Dropping ${Math.abs(delta)} kcal to get the fat loss going again.`;
      } else if (expected < 0 && change < expected - 0.5) {
        delta = 100;
        verdict = "too_fast";
        message = `Down ${Math.abs(change)}kg — too quick. Adding ${delta} kcal back to protect muscle.`;
      } else if (expected > 0 && change < expected - 0.25) {
        delta = 150;
        verdict = "too_slow";
        message = `Growth stalled at ${change}kg. Adding ${delta} kcal to keep building.`;
      } else if (expected > 0 && change > expected + 0.5) {
        delta = -100;
        verdict = "too_fast";
        message = `Up ${change}kg — that's getting sloppy. Pulling ${Math.abs(delta)} kcal back.`;
      }

      const newTarget = Math.max(1300, (profile.calorie_target ?? 2000) + delta);

      if (delta !== 0) {
        const t = computeTargets(profile, newTarget);
        const { error: uErr } = await supabase
          .from("nutrition_blueprint_profiles")
          .update({
            calorie_target: t.calorie_target,
            protein_g: t.protein_g,
            carbs_g: t.carbs_g,
            fat_g: t.fat_g,
            fibre_g: t.fibre_g,
          })
          .eq("user_id", user!.id);
        if (uErr) throw uErr;
      }

      const { error: rErr } = await supabase.from("nutrition_reviews").insert({
        user_id: user!.id,
        verdict,
        message,
        calorie_delta: delta,
        weight_change_kg: change,
      });
      if (rErr) throw rErr;

      return message;
    },
    onSuccess: (message) => {
      haptic("medium");
      toast.success(message);
      qc.invalidateQueries({ queryKey: ["nb-profile"] });
      qc.invalidateQueries({ queryKey: ["nb-reviews"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });

  const { data: last } = useQuery({
    queryKey: ["nb-reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("nutrition_reviews")
        .select("message, reviewed_at, calorie_delta")
        .eq("user_id", user!.id)
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <section className="mb-6 px-6">
      <div className="rounded-2xl border border-white/10 bg-brand-gray p-5">
        <p className="chip-label text-brand-red">Weekly Check-In</p>
        <p className="mt-2 text-sm text-brand-silver">
          {last?.message ?? "Ethan reads your weigh-ins and adjusts your calories automatically."}
        </p>
        <button
          onClick={() => review.mutate()}
          disabled={review.isPending}
          className="tap mt-4 w-full rounded-xl border border-brand-red/40 bg-brand-red/10 py-3 text-xs font-bold uppercase tracking-widest text-brand-red disabled:opacity-60"
        >
          {review.isPending ? "Reviewing…" : "Run Weekly Review"}
        </button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- inputs */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="chip-label mb-2 text-brand-silver">{label}</p>
      {children}
    </div>
  );
}

function Num({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3 text-lg font-bold text-white focus:border-brand-red focus:outline-none"
    />
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { k: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <Pill key={o.k} active={value === o.k} label={o.label} onClick={() => onChange(o.k)} />
      ))}
    </div>
  );
}

function Pill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className={`tap rounded-xl border py-3 text-sm font-bold ${
        active
          ? "border-brand-red bg-brand-red/15 text-white"
          : "border-white/10 bg-brand-gray text-brand-silver"
      }`}
    >
      {label}
    </button>
  );
}

function Choice({
  active,
  label,
  note,
  onClick,
}: {
  active: boolean;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className={`tap w-full rounded-xl border p-4 text-left ${
        active ? "border-brand-red bg-brand-red/10" : "border-white/10 bg-brand-gray"
      }`}
    >
      <p className={`text-sm font-bold ${active ? "text-white" : "text-brand-silver"}`}>{label}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-brand-silver">{note}</p>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-brand-gray/60 p-3 text-center">
      <p className="chip-label text-brand-silver">{label}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}
