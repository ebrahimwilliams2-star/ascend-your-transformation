import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { PHASES, type BlueprintPhase } from "@/lib/blueprint/data";

export const BLUEPRINT_XP = 50; // awarded by the shared workouts XP trigger

export type ResolvedPhase = BlueprintPhase & { unlocked: boolean; isActive: boolean };

export type BlueprintSession = {
  id: string;
  phase_key: string;
  workout_key: string;
  workout_name: string;
  total_volume: number;
  duration_min: number | null;
  completed_at: string;
};

/**
 * Single source of truth for Blueprint phase unlocks, progress and stats.
 * Unlock milestones come from the `blueprint_phases` table so they can be
 * tuned without shipping code; the bundled constants are the fallback.
 */
export function useBlueprint() {
  const { user } = useUser();

  const phasesQ = useQuery({
    queryKey: ["blueprint-phases"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blueprint_phases")
        .select("key, required_level, required_xp, is_active, sort_order")
        .order("sort_order");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const profileQ = useQuery({
    queryKey: ["blueprint-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("xp, level, rank, current_streak")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const sessionsQ = useQuery({
    queryKey: ["blueprint-sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("blueprint_sessions")
        .select("id, phase_key, workout_key, workout_name, total_volume, duration_min, completed_at")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      return (data ?? []) as BlueprintSession[];
    },
  });

  const xp = profileQ.data?.xp ?? 0;
  const level = profileQ.data?.level ?? 1;
  const overrides = new Map((phasesQ.data ?? []).map((p) => [p.key, p]));

  const resolved: ResolvedPhase[] = PHASES.filter(
    (p) => overrides.get(p.key)?.is_active !== false,
  ).map((p) => {
    const o = overrides.get(p.key);
    const requiredLevel = o?.required_level ?? p.requiredLevel;
    const requiredXp = o?.required_xp ?? p.requiredXp;
    return {
      ...p,
      requiredLevel,
      requiredXp,
      unlocked: level >= requiredLevel || xp >= requiredXp,
      isActive: false,
    };
  });

  const unlocked = resolved.filter((p) => p.unlocked);
  const current = unlocked[unlocked.length - 1] ?? resolved[0];
  for (const p of resolved) p.isActive = p.key === current?.key;

  const sessions = sessionsQ.data ?? [];
  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = sessions.filter((s) => new Date(s.completed_at).getTime() >= weekAgo);
  const weekKeys = new Set(
    thisWeek.filter((s) => s.phase_key === current?.key).map((s) => s.workout_key),
  );
  const workoutCount = current?.workouts.length ?? 4;

  return {
    user,
    loading: profileQ.isLoading || sessionsQ.isLoading,
    phases: resolved,
    currentPhase: current,
    sessions,
    stats: {
      xp,
      level,
      rank: profileQ.data?.rank ?? "Initiate",
      streak: profileQ.data?.current_streak ?? 0,
      totalSessions: sessions.length,
      totalVolume: sessions.reduce((a, s) => a + Number(s.total_volume ?? 0), 0),
      xpEarned: sessions.length * BLUEPRINT_XP,
      weeklySessions: thisWeek.length,
      weeklyCompletion: Math.round((weekKeys.size / workoutCount) * 100),
      completedThisWeek: weekKeys,
    },
  };
}
