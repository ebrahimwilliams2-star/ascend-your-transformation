import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workouts")({
  head: () => ({ meta: [{ title: "Workouts — ASCEND" }] }),
  component: () => <AppShell><Workouts /></AppShell>,
});

type Exercise = { name: string; sets: number; reps: number; weight: number };

function Workouts() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([{ name: "", sets: 3, reps: 8, weight: 0 }]);

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

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("workouts").insert({
        user_id: user!.id,
        name: name || "Untitled Session",
        duration_min: duration ? parseInt(duration) : null,
        exercises: exercises.filter((e) => e.name),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session logged.");
      qc.invalidateQueries({ queryKey: ["workouts"] });
      setAdding(false);
      setName("");
      setDuration("");
      setExercises([{ name: "", sets: 3, reps: 8, weight: 0 }]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  return (
    <>
      <header className="flex items-center justify-between p-6">
        <div>
          <p className="chip-label text-brand-red">The Grind</p>
          <h1 className="text-display text-3xl font-bold">Workouts</h1>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="grid size-11 place-items-center rounded-full bg-brand-red shadow-glow-red"
        >
          <Plus className={`size-5 text-white transition-transform ${adding ? "rotate-45" : ""}`} />
        </button>
      </header>

      {adding && (
        <section className="mx-6 mb-6 rounded-2xl border border-brand-red/30 bg-brand-gray p-5">
          <p className="chip-label text-brand-red mb-3">New Session</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <div className="mt-4 space-y-2">
            <p className="chip-label text-brand-silver">Exercises</p>
            {exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-[1fr_50px_50px_60px] gap-2">
                <input
                  value={ex.name}
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
              </div>
            ))}
            <div className="grid grid-cols-[1fr_50px_50px_60px] gap-2 px-1">
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Name</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Sets</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Reps</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-silver">Wt</span>
            </div>
            <button
              onClick={() => setExercises([...exercises, { name: "", sets: 3, reps: 8, weight: 0 }])}
              className="w-full rounded-md border border-dashed border-white/20 py-2 text-xs text-brand-silver hover:text-white"
            >
              + Add Exercise
            </button>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="mt-4 w-full rounded-xl bg-brand-red px-4 py-3 font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {create.isPending ? "..." : "Log Session"}
          </button>
        </section>
      )}

      <section className="px-6 space-y-3">
        {(workouts ?? []).length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="chip-label text-brand-red mb-2">No Sessions</p>
            <p className="text-sm text-brand-silver">Tap + to log your first lift.</p>
          </div>
        )}
        {(workouts ?? []).map((w) => (
          <div key={w.id} className="rounded-xl border border-white/5 bg-brand-gray/60 p-4">
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
              </div>
              <button onClick={() => remove.mutate(w.id)} className="text-brand-silver hover:text-brand-red">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
