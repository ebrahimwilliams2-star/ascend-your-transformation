import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import { Plus, Flame, Trash2, ChevronRight, Target, TrendingDown, TrendingUp, Repeat, Search, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — ASCEND" }] }),
  component: () => <AppShell><Nutrition /></AppShell>,
});

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  athlete: 1.9,
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  very: "Very Active",
  athlete: "Athlete",
};

type Profile = {
  age: number;
  gender: string;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number | null;
  activity_level: string;
  training_days: number;
  goal_type: "cut" | "bulk" | "recomp" | "maintain";
  goal_pace: string;
  bmr: number | null;
  tdee: number | null;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

function computeTargets(p: Omit<Profile, "bmr" | "tdee" | "calorie_target" | "protein_g" | "carbs_g" | "fat_g">) {
  // Mifflin–St Jeor
  const w = Number(p.weight_kg);
  const h = Number(p.height_cm);
  const a = Number(p.age);
  const bmr = Math.round(
    p.gender === "female" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5
  );
  const tdee = Math.round(bmr * (ACTIVITY_MULT[p.activity_level] ?? 1.2));
  const adjust: Record<string, number> = {
    "cut-mild": -250, "cut-standard": -500, "cut-aggressive": -750,
    "bulk-lean": 250, "bulk-standard": 500,
    "recomp-standard": 0, "maintain-standard": 0,
  };
  const key = `${p.goal_type}-${p.goal_pace}`;
  const calorie_target = Math.max(1200, tdee + (adjust[key] ?? 0));
  const protein_g = Math.round(w * 2.0);
  const fat_g = Math.round((calorie_target * 0.25) / 9);
  const carbs_g = Math.max(0, Math.round((calorie_target - protein_g * 4 - fat_g * 9) / 4));
  return { bmr, tdee, calorie_target, protein_g, carbs_g, fat_g };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Nutrition() {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["nutrition_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="size-8 animate-pulse rounded-full bg-brand-red" />
      </div>
    );
  }

  if (!profile) return <Onboarding onDone={() => qc.invalidateQueries({ queryKey: ["nutrition_profile"] })} />;

  return <NutritionDashboard profile={profile} onReset={() => qc.invalidateQueries({ queryKey: ["nutrition_profile"] })} />;
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    age: 28,
    gender: "male",
    height_cm: 178,
    weight_kg: 80,
    goal_weight_kg: 75,
    activity_level: "moderate",
    training_days: 4,
    goal_type: "cut" as "cut" | "bulk" | "recomp" | "maintain",
    goal_pace: "standard",
  });

  const save = useMutation({
    mutationFn: async () => {
      const t = computeTargets(form);
      const { error } = await supabase.from("nutrition_profiles").upsert({
        user_id: user!.id,
        ...form,
        ...t,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nutrition plan locked in");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const targets = computeTargets(form);

  return (
    <div className="min-h-screen px-6 py-8 pb-32">
      <header className="mb-6">
        <p className="chip-label text-brand-red">Step {step + 1} of 4</p>
        <h1 className="text-display text-3xl font-bold mt-1">Fuel the Ascend</h1>
        <p className="text-sm text-brand-silver mt-1">Dial in your numbers. No guessing.</p>
        <div className="mt-4 h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-brand-red transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
      </header>

      {step === 0 && (
        <div className="space-y-5">
          <Field label="Age">
            <NumInput value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
          </Field>
          <Field label="Gender">
            <div className="grid grid-cols-2 gap-2">
              {["male", "female"].map((g) => (
                <button key={g} onClick={() => setForm({ ...form, gender: g })}
                  className={`rounded-xl border p-3 text-sm font-bold uppercase tracking-widest ${form.gender === g ? "border-brand-red bg-brand-red/10 text-brand-red" : "border-white/10 bg-brand-gray text-brand-silver"}`}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Height (cm)">
            <NumInput value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} />
          </Field>
          <Field label="Weight (kg)">
            <NumInput value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Field label="Activity Level">
            <div className="space-y-2">
              {Object.entries(ACTIVITY_LABELS).map(([k, lbl]) => (
                <button key={k} onClick={() => setForm({ ...form, activity_level: k })}
                  className={`w-full rounded-xl border p-3 text-left text-sm font-medium ${form.activity_level === k ? "border-brand-red bg-brand-red/10 text-white" : "border-white/10 bg-brand-gray text-brand-silver"}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Training days per week">
            <NumInput value={form.training_days} onChange={(v) => setForm({ ...form, training_days: v })} min={0} max={7} />
          </Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Field label="Goal">
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "cut", label: "Fat Loss", Icon: TrendingDown, pace: "standard" },
                { k: "bulk", label: "Muscle Gain", Icon: TrendingUp, pace: "standard" },
                { k: "recomp", label: "Recomp", Icon: Repeat, pace: "standard" },
                { k: "maintain", label: "Maintain", Icon: Target, pace: "standard" },
              ].map((o) => (
                <button key={o.k} onClick={() => setForm({ ...form, goal_type: o.k as any, goal_pace: o.pace })}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 ${form.goal_type === o.k ? "border-brand-red bg-brand-red/10" : "border-white/10 bg-brand-gray"}`}>
                  <o.Icon className={`size-5 ${form.goal_type === o.k ? "text-brand-red" : "text-brand-silver"}`} />
                  <span className={`text-sm font-bold ${form.goal_type === o.k ? "text-white" : "text-brand-silver"}`}>{o.label}</span>
                </button>
              ))}
            </div>
          </Field>
          {form.goal_type === "cut" && (
            <Field label="Cut intensity">
              <div className="space-y-2">
                {[
                  { k: "mild", label: "Mild Cut (-250 cal)", note: "~0.25 kg/wk" },
                  { k: "standard", label: "Standard Cut (-500 cal)", note: "~0.5 kg/wk" },
                  { k: "aggressive", label: "Aggressive Cut (-750 cal)", note: "~0.75 kg/wk" },
                ].map((p) => (
                  <PaceBtn key={p.k} active={form.goal_pace === p.k} label={p.label} note={p.note} onClick={() => setForm({ ...form, goal_pace: p.k })} />
                ))}
              </div>
            </Field>
          )}
          {form.goal_type === "bulk" && (
            <Field label="Bulk intensity">
              <div className="space-y-2">
                {[
                  { k: "lean", label: "Lean Bulk (+250 cal)", note: "~0.25 kg/wk" },
                  { k: "standard", label: "Standard Bulk (+500 cal)", note: "~0.5 kg/wk" },
                ].map((p) => (
                  <PaceBtn key={p.k} active={form.goal_pace === p.k} label={p.label} note={p.note} onClick={() => setForm({ ...form, goal_pace: p.k })} />
                ))}
              </div>
            </Field>
          )}
          <Field label="Goal weight (kg)">
            <NumInput value={form.goal_weight_kg} onChange={(v) => setForm({ ...form, goal_weight_kg: v })} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-red/30 bg-brand-gray p-5">
            <p className="chip-label text-brand-red mb-1">Maintenance (TDEE)</p>
            <p className="text-display text-3xl font-bold">{targets.tdee.toLocaleString()} kcal</p>
            <p className="text-xs text-brand-silver mt-1">BMR {targets.bmr.toLocaleString()} × activity</p>
          </div>
          <div className="rounded-2xl border border-brand-red/60 bg-gradient-to-br from-brand-gray to-black p-5 shadow-glow-red">
            <p className="chip-label text-brand-red mb-1">Daily Goal</p>
            <p className="text-display text-4xl font-bold italic">{targets.calorie_target.toLocaleString()} kcal</p>
            <p className="text-xs text-brand-silver mt-2">
              {form.goal_type === "cut" && `Estimated ~${((targets.tdee - targets.calorie_target) * 7 / 7700).toFixed(2)} kg/week down`}
              {form.goal_type === "bulk" && `Estimated ~${((targets.calorie_target - targets.tdee) * 7 / 7700).toFixed(2)} kg/week up`}
              {form.goal_type === "recomp" && `Recomp at maintenance — build slow, lose fat`}
              {form.goal_type === "maintain" && `Hold the line — performance fuel`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MacroBox label="Protein" value={`${targets.protein_g}g`} />
            <MacroBox label="Carbs" value={`${targets.carbs_g}g`} />
            <MacroBox label="Fat" value={`${targets.fat_g}g`} />
          </div>
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 rounded-xl border border-white/10 bg-brand-gray py-3 text-sm font-bold uppercase tracking-widest text-brand-silver">
            Back
          </button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red">
            Continue
          </button>
        ) : (
          <button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50">
            {save.isPending ? "Locking in…" : "Lock It In"}
          </button>
        )}
      </div>
    </div>
  );
}

function PaceBtn({ active, label, note, onClick }: { active: boolean; label: string; note: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left ${active ? "border-brand-red bg-brand-red/10" : "border-white/10 bg-brand-gray"}`}>
      <p className={`text-sm font-bold ${active ? "text-white" : "text-brand-silver"}`}>{label}</p>
      <p className="text-[10px] uppercase tracking-widest text-brand-silver mt-0.5">{note}</p>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="chip-label text-brand-silver mb-2">{label}</p>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, min, max }: { value: number | null; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3 text-lg font-bold text-white focus:border-brand-red focus:outline-none"
    />
  );
}

function MacroBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-brand-gray p-3 text-center">
      <p className="chip-label text-brand-silver">{label}</p>
      <p className="text-base font-bold text-white mt-1">{value}</p>
    </div>
  );
}

const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

function NutritionDashboard({ profile, onReset }: { profile: Profile; onReset: () => void }) {
  const { user } = useUser();
  const qc = useQueryClient();
  const today = todayStr();
  const [adding, setAdding] = useState<string | null>(null);
  const [showResetMenu, setShowResetMenu] = useState(false);

  const { data: logs } = useQuery({
    queryKey: ["food_logs", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("log_date", today)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = (logs ?? []).reduce(
    (a, l) => ({
      cal: a.cal + Number(l.calories),
      p: a.p + Number(l.protein_g),
      c: a.c + Number(l.carbs_g),
      f: a.f + Number(l.fat_g),
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const target = profile.calorie_target ?? 2000;
  const remaining = Math.max(0, target - totals.cal);
  const pct = Math.min(100, Math.round((totals.cal / target) * 100));

  // Score
  const calOk = totals.cal <= target * 1.05 && totals.cal >= target * 0.85;
  const proteinPct = profile.protein_g ? Math.min(1, totals.p / profile.protein_g) : 0;
  const score = Math.round(
    (calOk ? 40 : Math.max(0, 40 - Math.abs(totals.cal - target) / target * 40)) +
    proteinPct * 40 +
    Math.min(1, (logs?.length ?? 0) / 3) * 20
  );

  const resetNutritionPlan = useMutation({
    mutationFn: async () => {
      // Delete the nutrition profile to go back to onboarding
      const { error } = await supabase
        .from("nutrition_profiles")
        .delete()
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nutrition plan reset. Choose your new goal!");
      onReset();
      setShowResetMenu(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to reset"),
  });

  const resetTodayLogs = useMutation({
    mutationFn: async () => {
      // Delete only today's food logs
      const { error } = await supabase
        .from("food_logs")
        .delete()
        .eq("user_id", user!.id)
        .eq("log_date", today);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Today's nutrition logs cleared");
      qc.invalidateQueries({ queryKey: ["food_logs"] });
      setShowResetMenu(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to reset logs"),
  });

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <div>
          <p className="chip-label text-brand-red">{profile.goal_type.toUpperCase()} · {target.toLocaleString()} KCAL</p>
          <h1 className="text-display text-2xl font-bold mt-0.5">Nutrition</h1>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowResetMenu(!showResetMenu)} 
            className="chip-label text-brand-silver hover:text-brand-red transition-colors flex items-center gap-1"
          >
            <RotateCcw className="size-4" />
          </button>
          {showResetMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-brand-black/95 backdrop-blur-md shadow-lg overflow-hidden z-50">
              <button
                onClick={() => resetTodayLogs.mutate()}
                disabled={resetTodayLogs.isPending}
                className="w-full text-left px-4 py-3 text-sm font-medium text-brand-silver hover:text-white hover:bg-brand-gray/40 transition-colors disabled:opacity-50"
              >
                {resetTodayLogs.isPending ? "Clearing…" : "Clear Today's Logs"}
              </button>
              <div className="border-t border-white/5" />
              <button
                onClick={() => resetNutritionPlan.mutate()}
                disabled={resetNutritionPlan.isPending}
                className="w-full text-left px-4 py-3 text-sm font-medium text-brand-red hover:bg-brand-red/10 transition-colors disabled:opacity-50"
              >
                {resetNutritionPlan.isPending ? "Resetting…" : "Reset Nutrition Plan"}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Calorie ring */}
      <section className="px-6 mb-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-brand-gray p-6">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-red/15 blur-3xl" />
          <div className="relative flex items-center gap-5">
            <Ring value={pct} />
            <div>
              <p className="chip-label text-brand-silver">Remaining</p>
              <p className="text-display text-4xl font-bold italic text-white">{remaining.toLocaleString()}</p>
              <p className="text-xs text-brand-silver mt-1">{Math.round(totals.cal).toLocaleString()} / {target.toLocaleString()} kcal</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MacroBar label="Protein" value={totals.p} target={profile.protein_g ?? 0} unit="g" />
            <MacroBar label="Carbs" value={totals.c} target={profile.carbs_g ?? 0} unit="g" />
            <MacroBar label="Fat" value={totals.f} target={profile.fat_g ?? 0} unit="g" />
          </div>
        </div>
      </section>

      {/* Score */}
      <section className="px-6 mb-6">
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-brand-gray/60 p-4">
          <div>
            <p className="chip-label text-brand-silver">Nutrition Score</p>
            <p className="text-2xl font-bold text-white mt-0.5">{score}<span className="text-sm text-brand-silver">/100</span></p>
          </div>
          <p className={`text-sm font-bold uppercase tracking-widest ${score >= 90 ? "text-brand-red" : score >= 70 ? "text-white" : "text-brand-silver"}`}>
            {score >= 90 ? "Excellent" : score >= 75 ? "Great" : score >= 55 ? "Good" : "Push Harder"}
          </p>
        </div>
      </section>

      {/* Meals */}
      <section className="px-6 pb-28 space-y-4">
        {MEALS.map((m) => {
          const items = (logs ?? []).filter((l) => l.meal_type === m);
          const mCal = items.reduce((a, l) => a + Number(l.calories), 0);
          return (
            <div key={m} className="rounded-2xl border border-white/5 bg-brand-gray/60 overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold text-white">{MEAL_LABELS[m]}</p>
                  <p className="chip-label text-brand-silver">{Math.round(mCal)} kcal</p>
                </div>
                <button onClick={() => setAdding(m)} className="grid size-9 place-items-center rounded-full bg-brand-red text-white shadow-glow-red">
                  <Plus className="size-4" />
                </button>
              </div>
              {items.length > 0 && (
                <ul className="divide-y divide-white/5 border-t border-white/5">
                  {items.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{f.food_name}</p>
                        <p className="chip-label text-brand-silver">
                          {Math.round(Number(f.calories))} kcal · P{Math.round(Number(f.protein_g))} C{Math.round(Number(f.carbs_g))} F{Math.round(Number(f.fat_g))}
                        </p>
                      </div>
                      <button onClick={async () => {
                        await supabase.from("food_logs").delete().eq("id", f.id);
                        qc.invalidateQueries({ queryKey: ["food_logs"] });
                      }} className="text-brand-silver hover:text-brand-red">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {adding && (
        <AddFoodModal meal={adding} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); qc.invalidateQueries({ queryKey: ["food_logs"] }); }} />
      )}
    </>
  );
}

function Ring({ value }: { value: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r={r} stroke="hsl(var(--brand-red, 0 73% 50%))" strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="text-brand-red transition-all duration-500" style={{ stroke: "currentColor" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-brand-red">
        <span className="text-xl font-bold">{value}%</span>
      </div>
    </div>
  );
}

function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="chip-label text-brand-silver">{label}</p>
        <p className="text-[10px] font-bold text-white">{Math.round(value)}/{target}{unit}</p>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-brand-red transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type FoodRow = {
  id: string;
  name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  cuisine: string;
  country: string | null;
};

function AddFoodModal({ meal, onClose, onSaved }: { meal: string; onClose: () => void; onSaved: () => void }) {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodRow[]>([]);
  const [f, setF] = useState({ food_name: "", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, serving_size: "1 serving" });

  // Initial: show SA staples; live search as user types.
  useEffect(() => {
    let active = true;
    (async () => {
      const q = supabase
        .from("foods")
        .select("id,name,serving_size,calories,protein_g,carbs_g,fat_g,cuisine,country")
        .order("cuisine", { ascending: false })
        .limit(20);
      const { data } = query.trim().length >= 2
        ? await q.ilike("name", `%${query.trim()}%`)
        : await q.eq("country", "ZA");
      if (active) setResults((data ?? []) as FoodRow[]);
    })();
    return () => { active = false; };
  }, [query]);

  const pick = (row: FoodRow) => {
    setF({
      food_name: row.name,
      calories: Number(row.calories),
      protein_g: Number(row.protein_g),
      carbs_g: Number(row.carbs_g),
      fat_g: Number(row.fat_g),
      serving_size: row.serving_size,
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!f.food_name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("food_logs").insert({
        user_id: user!.id,
        meal_type: meal,
        log_date: todayStr(),
        ...f,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Logged"); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-brand-black p-6"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
        <p className="chip-label text-brand-red">{MEAL_LABELS[meal]}</p>
        <h2 className="text-display text-2xl font-bold mb-4">Log Food</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-silver" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SA foods (pap, biltong, bunny chow…)"
            className="w-full rounded-xl border border-white/10 bg-brand-gray pl-10 pr-4 py-3 text-sm text-white placeholder:text-brand-silver focus:border-brand-red focus:outline-none"
          />
        </div>

        {results.length > 0 && (
          <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-white/5 bg-brand-gray/60 divide-y divide-white/5">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => pick(r)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {r.name}
                    {r.cuisine === "south_african" && <span className="ml-1.5 text-[10px] uppercase tracking-widest text-brand-red">SA</span>}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-brand-silver">
                    {r.serving_size} · {Math.round(Number(r.calories))} kcal · P{Math.round(Number(r.protein_g))}
                  </p>
                </div>
                <Plus className="size-4 shrink-0 text-brand-red" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <input
            placeholder="Food name"
            value={f.food_name}
            onChange={(e) => setF({ ...f, food_name: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3 text-white placeholder:text-brand-silver focus:border-brand-red focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <LabeledNum label="Calories" value={f.calories} onChange={(v) => setF({ ...f, calories: v })} />
            <LabeledNum label="Protein (g)" value={f.protein_g} onChange={(v) => setF({ ...f, protein_g: v })} />
            <LabeledNum label="Carbs (g)" value={f.carbs_g} onChange={(v) => setF({ ...f, carbs_g: v })} />
            <LabeledNum label="Fat (g)" value={f.fat_g} onChange={(v) => setF({ ...f, fat_g: v })} />
          </div>
          <input
            placeholder="Serving size"
            value={f.serving_size}
            onChange={(e) => setF({ ...f, serving_size: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3 text-sm text-white placeholder:text-brand-silver focus:border-brand-red focus:outline-none"
          />
        </div>
        <div className="mt-5 flex gap-2 pb-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 bg-brand-gray py-3 text-sm font-bold uppercase tracking-widest text-brand-silver">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50">
            {save.isPending ? "Saving…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="chip-label text-brand-silver mb-1">{label}</p>
      <input
        type="number"
        inputMode="decimal"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-white/10 bg-brand-gray px-3 py-2.5 text-base font-bold text-white focus:border-brand-red focus:outline-none"
      />
    </div>
  );
}
