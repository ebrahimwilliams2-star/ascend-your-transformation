import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { workoutSchema, LIMITS } from "@/lib/validation";
import { haptic } from "@/lib/motion";
import { Celebration } from "@/components/motion/Celebration";
import { BlueprintFeatureCard } from "@/components/blueprint/BlueprintFeatureCard";


export const Route = createFileRoute("/workouts")({
  head: () => ({ meta: [{ title: "Workouts — ASCEND" }] }),
  component: () => <AppShell><Workouts /></AppShell>,
});

type Exercise = { name: string; sets: number; reps: number; weight: number };

const EMPTY_EXERCISE: Exercise = { name: "", sets: 3, reps: 8, weight: 0 };

function Workouts() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([{ ...EMPTY_EXERCISE }]);

  const { data: workouts } = useQuery({
    queryKey: ["workouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user!.id)
        .order("performed_at", { ascending: false });
      return data ?? [];
    },
  });

  function resetForm() {
    setName("");
    setDuration("");
    setNotes("");
    setExercises([{ ...EMPTY_EXERCISE }]);
  }

  function closeForm() {
    setAdding(false);
    setEditingId(null);
    resetForm();
  }

  function startEdit(w: {
    id: string;
    name: string;
    duration_min: number | null;
    notes: string | null;
    exercises: unknown;
  }) {
    setEditingId(w.id);
    setAdding(true);
    setName(w.name ?? "");
    setDuration(w.duration_min != null ? String(w.duration_min) : "");
    setNotes(w.notes ?? "");
    const list = Array.isArray(w.exercises) ? (w.exercises as Exercise[]) : [];
    setExercises(list.length > 0 ? list.map((e) => ({ ...EMPTY_EXERCISE, ...e })) : [{ ...EMPTY_EXERCISE }]);
  }

  function buildPayload() {
    const parsed = workoutSchema.safeParse({
      name: name || "Untitled Session",
      notes: notes,
      duration_min: duration ? parseInt(duration) : null,
      exercises: exercises.filter((e) => e.name.trim()),
    });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid workout");
    return parsed.data;
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (editingId) {
        // Update in place — preserves the original performed_at timestamp and id.
        const { error } = await supabase
          .from("workouts")
          .update({
            name: payload.name,
            notes: payload.notes || null,
            duration_min: payload.duration_min ?? null,
            exercises: payload.exercises,
          })
          .eq("id", editingId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workouts").insert({
          user_id: user!.id,
          name: payload.name,
          notes: payload.notes || null,
          duration_min: payload.duration_min ?? null,
          exercises: payload.exercises,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (!editingId) {
        haptic("celebrate");
        setCelebrate(true);
      } else {
        haptic("success");
      }
      toast.success(editingId ? "Session updated." : "Session logged.");
      qc.invalidateQueries({ queryKey: ["workouts"] });
      closeForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session deleted.");
      qc.invalidateQueries({ queryKey: ["workouts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <>
      <Celebration
        open={celebrate}
        onDone={() => setCelebrate(false)}
        title="Session Logged"
        subtitle="1% better than yesterday."
      />
      <header className="flex items-center justify-between p-6">
        <div>
          <p className="chip-label text-brand-red">The Grind</p>
          <h1 className="text-display text-3xl font-bold">Workouts</h1>
        </div>
        <button
          onClick={() => (adding ? closeForm() : setAdding(true))}
          className="grid size-11 place-items-center rounded-full bg-brand-red shadow-glow-red"
          aria-label={adding ? "Close form" : "New session"}
        >
          <Plus className={`size-5 text-white transition-transform ${adding ? "rotate-45" : ""}`} />
        </button>
      </header>

      <div className="mb-6">
        <BlueprintFeatureCard />
      </div>



      {adding && (
        <section className="mx-6 mb-6 rounded-2xl border border-brand-red/30 bg-brand-gray p-5 animate-reveal-up" style={{ animationDelay: "70ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="chip-label text-brand-red">{editingId ? "Edit Session" : "New Session"}</p>
            {editingId && (
              <button onClick={closeForm} className="text-xs text-brand-silver hover:text-white flex items-center gap-1">
                <X className="size-3" /> Cancel
              </button>
            )}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={LIMITS.workoutName}
            placeholder="Push Day · Heavy"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
          />
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            type="number"
            placeholder="Duration (min)"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={LIMITS.workoutNotes}
            rows={2}
            placeholder="Notes (optional)"
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
          />
          <p className="mt-1 text-right text-[9px] text-brand-silver/60">{notes.length}/{LIMITS.workoutNotes}</p>
          <div className="mt-4 space-y-2">
            <p className="chip-label text-brand-silver">Exercises</p>
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-[1fr_50px_50px_60px_20px] gap-2">
                <input
                  value={ex.name}
                  maxLength={LIMITS.exerciseName}
                  onChange={(e) => setExercises(exercises.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Bench Press"
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-xs focus:border-brand-red focus:outline-none"
                />
                <input
                  type="number"
                  value={ex.sets}
                  onChange={(e) => setExercises(exercises.map((x, j) => j === i ? { ...x, sets: +e.target.value } : x))}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-xs focus:border-brand-red focus:outline-none"
                />
                <input
                  type="number"
                  value={ex.reps}
                  onChange={(e) => setExercises(exercises.map((x, j) => j === i ? { ...x, reps: +e.target.value } : x))}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-xs focus:border-brand-red focus:outline-none"
                />
                <input
                  type="number"
                  value={ex.weight}
                  onChange={(e) => setExercises(exercises.map((x, j) => j === i ? { ...x, weight: +e.target.value } : x))}
                  className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-xs focus:border-brand-red focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setExercises(exercises.length > 1 ? exercises.filter((_, j) => j !== i) : [{ ...EMPTY_EXERCISE }])}
                  className="text-brand-silver hover:text-brand-red"
                  aria-label="Remove exercise"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_50px_50px_60px_20px] gap-2 px-1">
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Name</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Sets</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Reps</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Wt</span>
              <span />
            </div>
            <button
              onClick={() => setExercises([...exercises, { ...EMPTY_EXERCISE }])}
              className="w-full rounded-md border border-dashed border-white/20 py-2 text-xs text-brand-silver hover:text-white"
            >
              + Add Exercise
            </button>
          </div>
          <button
            onClick={() => { haptic("medium"); save.mutate(); }}
            disabled={save.isPending}
            className="mt-4 w-full rounded-xl bg-brand-red px-4 py-3 font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {save.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 animate-pop rounded-full bg-white [animation-duration:1s] [animation-iteration-count:infinite]" />
                <span className="size-1.5 animate-pop rounded-full bg-white [animation-delay:150ms] [animation-duration:1s] [animation-iteration-count:infinite]" />
                <span className="size-1.5 animate-pop rounded-full bg-white [animation-delay:300ms] [animation-duration:1s] [animation-iteration-count:infinite]" />
              </span>
            ) : editingId ? "Save Changes" : "Log Session"}
          </button>
        </section>
      )}

      <section className="px-6 space-y-3 animate-reveal-up" style={{ animationDelay: "140ms" }}>
        {(workouts ?? []).length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="chip-label text-brand-red mb-2">No Sessions</p>
            <p className="text-sm text-brand-silver">Tap + to log your first lift.</p>
          </div>
        )}
        {(workouts ?? []).map((w, wi) => (
          <div
            key={w.id}
            className="animate-reveal-up rounded-xl border border-white/5 bg-brand-gray/60 p-4 transition-shadow duration-200 hover:shadow-glow-red"
            style={{ animationDelay: `${Math.min(wi, 8) * 55}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold truncate">{w.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-brand-silver mt-0.5">
                  {new Date(w.performed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {w.duration_min ? ` · ${w.duration_min}m` : ""}
                  {Array.isArray(w.exercises) ? ` · ${(w.exercises as Exercise[]).length} ex` : ""}
                </p>
                {Array.isArray(w.exercises) && (w.exercises as Exercise[]).length > 0 && (
                  <div className="mt-3 space-y-1">
                    {(w.exercises as Exercise[]).slice(0, 3).map((ex, i) => (
                      <p key={i} className="text-xs text-brand-silver">
                        <span className="text-white">{ex.name}</span> · {ex.sets}×{ex.reps} @ {ex.weight}
                      </p>
                    ))}
                  </div>
                )}
                {w.notes && <p className="mt-2 text-xs text-brand-silver/80">{w.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => {
                    startEdit(w);
                    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-brand-silver hover:text-white"
                  aria-label="Edit session"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this session? This can't be undone.")) remove.mutate(w.id);
                  }}
                  className="text-brand-silver hover:text-brand-red"
                  aria-label="Delete session"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
