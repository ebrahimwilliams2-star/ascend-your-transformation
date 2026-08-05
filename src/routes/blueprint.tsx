import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useBlueprint } from "@/lib/blueprint/useBlueprint";
import { WorkoutArt } from "@/components/blueprint/ExerciseArt";
import { CountUp } from "@/components/motion/CountUp";
import { ArrowLeft, Check, ChevronRight, Lock, Flame } from "lucide-react";
import { haptic } from "@/lib/motion";
import { useState } from "react";

export const Route = createFileRoute("/blueprint")({
  head: () => ({
    meta: [
      { title: "Ethan's Blueprint — ASCEND" },
      {
        name: "description",
        content:
          "Ethan's official training system: four proven sessions, progressive phases and zero decision fatigue.",
      },
      { property: "og:title", content: "Ethan's Blueprint — ASCEND" },
      {
        property: "og:description",
        content: "Stop wondering what to train. Follow the blueprint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Blueprint />
    </AppShell>
  ),
});

function Blueprint() {
  const navigate = useNavigate();
  const { phases, currentPhase, stats } = useBlueprint();
  const [phaseKey, setPhaseKey] = useState<string | null>(null);
  const active = phases.find((p) => p.key === (phaseKey ?? currentPhase?.key)) ?? phases[0];

  if (!active) return null;

  return (
    <div className="animate-page-enter pb-6">
      <header className="flex items-center gap-3 p-6">
        <Link
          to="/workouts"
          aria-label="Back to workouts"
          className="tap grid size-10 place-items-center rounded-xl border border-white/10 bg-brand-gray"
        >
          <ArrowLeft className="size-4 text-brand-silver" />
        </Link>
        <div>
          <p className="chip-label text-brand-red">The System</p>
          <h1 className="text-display text-3xl font-bold leading-none">Ethan's Blueprint</h1>
        </div>
      </header>

      <section className="px-6 animate-reveal-up">
        <p className="text-sm leading-relaxed text-brand-silver">
          Stop wondering what to train. Follow the blueprint.
          <br />
          Master the basics. Build consistency. Earn your strength.
        </p>
      </section>

      {/* Progress */}
      <section
        className="glass-card mx-6 mt-6 animate-reveal-up rounded-3xl p-5"
        style={{ animationDelay: "70ms" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="chip-label text-brand-red">Current Blueprint</p>
            <p className="text-display text-xl font-bold">
              {currentPhase?.name} · {currentPhase?.tier}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-brand-silver">
            <Flame className="size-3 text-brand-red" /> {stats.streak}d
          </span>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-brand-silver">
            <span>Weekly completion</span>
            <span className="text-white">{stats.weeklyCompletion}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="animate-bar h-full rounded-full bg-brand-red transition-[width] duration-500"
              style={{ width: `${Math.min(100, stats.weeklyCompletion)}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <Stat label="Sessions" value={stats.totalSessions} />
          <Stat label="XP Earned" value={stats.xpEarned} />
          <Stat label="Total Lifted" value={Math.round(stats.totalVolume)} suffix=" kg" />
          <Stat label="This Week" value={stats.weeklySessions} />
        </div>
      </section>

      {/* Phase selector */}
      <section className="mt-6 flex gap-2 overflow-x-auto px-6 no-scrollbar">
        {phases.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              haptic("light");
              setPhaseKey(p.key);
            }}
            className={`tap flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest ${
              p.key === active.key
                ? "border-brand-red bg-brand-red/15 text-white"
                : "border-white/10 text-brand-silver"
            }`}
          >
            {!p.unlocked && <Lock className="size-3" />}
            {p.name}
          </button>
        ))}
      </section>

      {!active.unlocked && (
        <p className="mx-6 mt-3 rounded-2xl border border-white/10 bg-brand-gray/60 p-4 text-xs text-brand-silver">
          Locked — reach <span className="text-white">Level {active.requiredLevel}</span> or{" "}
          <span className="text-white">{active.requiredXp.toLocaleString()} XP</span> to unlock{" "}
          {active.name}. Focus: {active.focus.join(" · ")}.
        </p>
      )}

      {/* Workout cards */}
      <section className="mt-4 space-y-3 px-6">
        {active.workouts.map((w, i) => {
          const done = active.key === currentPhase?.key && stats.completedThisWeek.has(w.key);
          return (
            <button
              key={w.key}
              disabled={!active.unlocked}
              onClick={() => {
                haptic("medium");
                navigate({
                  to: "/blueprint/$workoutKey",
                  params: { workoutKey: w.key },
                  search: { phase: active.key },
                });
              }}
              className="tap glass-card animate-reveal-up flex w-full items-center gap-4 rounded-2xl p-4 text-left disabled:opacity-40"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <WorkoutArt art={w.art} className="size-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-display truncate text-lg font-bold">{w.name}</p>
                  {done && <Check className="size-4 shrink-0 text-brand-red" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-brand-silver">{w.description}</p>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-brand-silver/80">
                  {w.duration} · {w.difficulty} · {w.exercises.length} exercises
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-brand-silver" />
            </button>
          );
        })}
      </section>

      {/* Philosophy */}
      <section className="glass-card mx-6 mt-6 rounded-3xl p-6">
        <p className="chip-label text-brand-red">The Ethan Philosophy</p>
        <p className="text-display mt-2 text-2xl font-bold leading-tight">
          Simple.
          <br />
          Consistent.
          <br />
          Progressive.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-brand-silver">
          You don't need twenty exercises. You don't need complicated routines. Master the
          fundamentals. Train with intensity. Recover properly.
        </p>
        <p className="mt-3 text-sm font-semibold">Become 1% Better Than Yesterday.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 p-3">
      <p className="text-display text-xl font-bold">
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="chip-label mt-0.5 text-brand-silver">{label}</p>
    </div>
  );
}
