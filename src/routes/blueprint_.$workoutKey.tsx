import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/motion";
import { Celebration } from "@/components/motion/Celebration";
import { ExerciseArt, WorkoutArt } from "@/components/blueprint/ExerciseArt";
import { EXERCISES, getPhase, randomTip, setsFromScheme } from "@/lib/blueprint/data";
import { BLUEPRINT_XP } from "@/lib/blueprint/useBlueprint";

type Log = { done: boolean; weight: string; reps: string; notes: string };

export const Route = createFileRoute("/blueprint_/$workoutKey")({
  validateSearch: (s: Record<string, unknown>) => ({
    phase: typeof s.phase === "string" ? s.phase : "blueprint-1",
  }),
  head: () => ({
    meta: [
      { title: "Blueprint Session — ASCEND" },
      {
        name: "description",
        content: "Log every set of Ethan's Blueprint session — weights, reps, notes and rest.",
      },
      { property: "og:title", content: "Blueprint Session — ASCEND" },
      { property: "og:description", content: "Follow the blueprint. Train with intent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <BlueprintSession />
    </AppShell>
  ),
});

function BlueprintSession() {
  const { workoutKey } = Route.useParams();
  const { phase: phaseKey } = Route.useSearch();
  const { user } = useUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const phase = getPhase(phaseKey);
  const workout = phase?.workouts.find((w) => w.key === workoutKey);
  const storageKey = `ascend:blueprint:${phaseKey}:${workoutKey}`;

  const [logs, setLogs] = useState<Record<string, Log>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [summary, setSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());
  const tip = useMemo(() => randomTip(), []);

  // Offline-safe: restore any in-progress session from this device.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setLogs(JSON.parse(raw) as Record<string, Log>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch {
      /* ignore */
    }
  }, [logs, storageKey]);

  useEffect(() => {
    if (rest === null) return;
    if (rest <= 0) {
      haptic("success");
      setRest(null);
      return;
    }
    const t = window.setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [rest]);

  if (!phase || !workout) {
    return (
      <div className="p-6">
        <p className="text-sm text-brand-silver">That workout isn't part of the Blueprint.</p>
        <Link to="/blueprint" className="mt-3 inline-block text-sm font-bold text-brand-red">
          Back to Blueprint
        </Link>
      </div>
    );
  }

  const get = (slug: string): Log => logs[slug] ?? { done: false, weight: "", reps: "", notes: "" };
  const set = (slug: string, patch: Partial<Log>) =>
    setLogs((l) => ({ ...l, [slug]: { ...get(slug), ...patch } }));

  const doneCount = workout.exercises.filter((e) => get(e.slug).done).length;
  const total = workout.exercises.length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  const volume = workout.exercises.reduce((acc, e) => {
    const l = get(e.slug);
    const w = parseFloat(l.weight) || 0;
    const r = parseFloat(l.reps) || 0;
    return acc + w * r * setsFromScheme(e.scheme);
  }, 0);

  async function finish() {
    if (!user || saving) return;
    setSaving(true);
    const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    const exercises = workout!.exercises.map((e) => ({
      name: EXERCISES[e.slug]?.name ?? e.slug,
      sets: setsFromScheme(e.scheme),
      reps: parseInt(get(e.slug).reps) || 0,
      weight: parseFloat(get(e.slug).weight) || 0,
    }));
    const notes = workout!.exercises
      .map((e) => (get(e.slug).notes ? `${EXERCISES[e.slug]?.name}: ${get(e.slug).notes}` : ""))
      .filter(Boolean)
      .join(" · ")
      .slice(0, 500);

    try {
      // Reuses the existing workouts pipeline → XP, streaks, history, Ascendant.
      const { data: w, error } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          name: `${phase!.name} · ${workout!.name}`,
          duration_min: duration,
          notes: notes || null,
          exercises,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: sErr } = await supabase.from("blueprint_sessions").insert({
        user_id: user.id,
        phase_key: phase!.key,
        workout_key: workout!.key,
        workout_name: workout!.name,
        exercise_logs: workout!.exercises.map((e) => ({ slug: e.slug, ...get(e.slug) })),
        total_volume: Math.round(volume),
        duration_min: duration,
        workout_id: w?.id ?? null,
      });
      if (sErr) throw sErr;

      if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
      haptic("celebrate");
      setCelebrate(true);
      setSummary(true);
      setLogs({});
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["blueprint-sessions"] });
      qc.invalidateQueries({ queryKey: ["blueprint-profile"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-page-enter pb-8">
      <Celebration
        open={celebrate}
        onDone={() => setCelebrate(false)}
        title="Blueprint Complete"
        subtitle={`+${BLUEPRINT_XP} XP · ${workout.name}`}
      />

      <header className="flex items-center gap-3 p-6">
        <Link
          to="/blueprint"
          aria-label="Back to Blueprint"
          className="tap grid size-10 place-items-center rounded-xl border border-white/10 bg-brand-gray"
        >
          <ArrowLeft className="size-4 text-brand-silver" />
        </Link>
        <div className="min-w-0">
          <p className="chip-label text-brand-red">{phase.name}</p>
          <h1 className="text-display truncate text-2xl font-bold leading-none">{workout.name}</h1>
        </div>
      </header>

      <section className="glass-card mx-6 rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <WorkoutArt art={workout.art} className="size-16 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-brand-silver">{workout.description}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-brand-silver/80">
              {workout.duration} · {workout.difficulty}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-between text-xs text-brand-silver">
          <span>
            Exercise {Math.min(doneCount + (allDone ? 0 : 1), total)} / {total}
          </span>
          <span className="text-white">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand-red transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="mt-4 space-y-3 px-6">
        {workout.exercises.map((e, i) => {
          const def = EXERCISES[e.slug];
          const log = get(e.slug);
          const expanded = open === e.slug;
          return (
            <div
              key={e.slug + i}
              className={`glass-card animate-reveal-up rounded-2xl p-4 ${log.done ? "border-brand-red/40" : ""}`}
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/50 text-white/80">
                  <ExerciseArt art={def?.art ?? "bench"} className="size-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{def?.name ?? e.slug}</p>
                  <p className="mt-0.5 text-xs text-brand-red">{e.scheme}</p>
                  {e.technique && (
                    <p className="mt-0.5 text-[10px] uppercase tracking-widest text-brand-silver">
                      {e.technique}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    haptic(log.done ? "light" : "success");
                    set(e.slug, { done: !log.done });
                  }}
                  aria-label={log.done ? "Mark incomplete" : "Mark complete"}
                  className={`tap grid size-9 shrink-0 place-items-center rounded-xl border ${
                    log.done
                      ? "border-brand-red bg-brand-red text-white"
                      : "border-white/15 text-brand-silver"
                  }`}
                >
                  <Check className="size-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <input
                  value={log.weight}
                  onChange={(ev) => set(e.slug, { weight: ev.target.value.slice(0, 6) })}
                  inputMode="decimal"
                  placeholder="Weight (kg)"
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs focus:border-brand-red focus:outline-none"
                />
                <input
                  value={log.reps}
                  onChange={(ev) => set(e.slug, { reps: ev.target.value.slice(0, 4) })}
                  inputMode="numeric"
                  placeholder="Reps"
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs focus:border-brand-red focus:outline-none"
                />
              </div>
              <input
                value={log.notes}
                onChange={(ev) => set(e.slug, { notes: ev.target.value.slice(0, 160) })}
                placeholder="Personal notes"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs focus:border-brand-red focus:outline-none"
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setOpen(expanded ? null : e.slug)}
                  className="tap flex flex-1 items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-brand-silver"
                >
                  How To Perform
                  <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => {
                    haptic("light");
                    setRest(90);
                  }}
                  className="tap flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-brand-silver"
                >
                  <Timer className="size-3.5" /> Rest
                </button>
              </div>

              {expanded && (
                <div className="mt-3 animate-reveal-up rounded-xl border border-white/5 bg-black/40 p-3">
                  <p className="chip-label text-brand-silver">Muscles Worked</p>
                  <p className="mt-1 text-xs text-white/90">{def?.muscles.join(" · ")}</p>
                  <ul className="mt-3 space-y-1">
                    {def?.cues.map((c) => (
                      <li key={c} className="text-xs text-brand-silver">
                        • {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <p className="mx-6 mt-6 rounded-2xl border border-white/5 bg-brand-gray/50 p-4 text-center text-sm italic text-brand-silver">
        “{tip}” — Ethan
      </p>

      <div className="px-6 pt-4">
        <button
          onClick={() => void finish()}
          disabled={!allDone || saving || !user}
          className="tap w-full rounded-2xl bg-brand-red py-4 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-40"
        >
          {saving ? "Saving…" : allDone ? "Complete Blueprint Session" : `${total - doneCount} exercises left`}
        </button>
      </div>

      {rest !== null && (
        <div className="fixed inset-x-0 bottom-24 z-sticky mx-auto flex w-[calc(100%-3rem)] max-w-md items-center gap-3 rounded-2xl border border-brand-red/40 bg-brand-gray/95 px-4 py-3 backdrop-blur-xl">
          <Timer className="size-4 text-brand-red" />
          <p className="flex-1 text-sm font-bold">
            Rest · {String(Math.floor(rest / 60)).padStart(2, "0")}:
            {String(rest % 60).padStart(2, "0")}
          </p>
          <button onClick={() => setRest((r) => (r ?? 0) + 30)} className="tap text-xs text-brand-silver">
            +30s
          </button>
          <button onClick={() => setRest(null)} aria-label="Stop rest timer" className="tap">
            <X className="size-4 text-brand-silver" />
          </button>
        </div>
      )}

      {summary && (
        <div className="fixed inset-0 z-modal grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm animate-reveal-up rounded-3xl p-6 text-center">
            <p className="text-display text-2xl font-bold">🔥 Blueprint Complete</p>
            <p className="mt-2 text-sm text-brand-silver">
              Excellent work. Discipline isn't built in one workout. It's built by showing up.
            </p>
            <p className="mt-4 text-display text-3xl font-bold text-brand-red">+{BLUEPRINT_XP} XP</p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => navigate({ to: "/dash" })}
                className="tap w-full rounded-2xl bg-brand-red py-3 text-sm font-bold uppercase tracking-widest"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => navigate({ to: "/blueprint" })}
                className="tap w-full rounded-2xl border border-white/15 py-3 text-sm font-bold uppercase tracking-widest text-brand-silver"
              >
                View Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
