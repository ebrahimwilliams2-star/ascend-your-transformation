import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useEffect } from "react";
import { ChevronLeft, Gift, Lock, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Reward Vault — ASCEND" }] }),
  component: () => <AppShell><Rewards /></AppShell>,
});

/**
 * Ethan's Reward Vault — discipline earns reward meals.
 * Auto-unlocks based on profile streak and badges.
 */
type RewardTemplate = {
  milestone: string;
  title: string;
  description: string;
  condition: (state: { streak: number; longestStreak: number; badges: Set<string>; workouts: number }) => boolean;
};

const TEMPLATES: RewardTemplate[] = [
  {
    milestone: "first_workout",
    title: "First Forge Feast",
    description: "Your first logged workout deserves a proper meal. Enjoy it with intention.",
    condition: ({ workouts }) => workouts >= 1,
  },
  {
    milestone: "streak_7",
    title: "7-Day Reward Meal",
    description: "Seven days of discipline. Eat what you love — guilt-free, fully earned.",
    condition: ({ longestStreak }) => longestStreak >= 7,
  },
  {
    milestone: "streak_14",
    title: "Two-Week Feast",
    description: "Two weeks locked in. This isn't cheating — this is the reward of the disciplined.",
    condition: ({ longestStreak }) => longestStreak >= 14,
  },
  {
    milestone: "streak_30",
    title: "Iron Discipline Meal",
    description: "Thirty days. You've become someone new. Honor it with a meal that matches.",
    condition: ({ longestStreak }) => longestStreak >= 30,
  },
  {
    milestone: "streak_60",
    title: "Ascendant Banquet",
    description: "Sixty days separates dabblers from the disciplined. Choose your favorite.",
    condition: ({ longestStreak }) => longestStreak >= 60,
  },
  {
    milestone: "challenger_badge",
    title: "Challenger's Plate",
    description: "First challenge conquered. Refuel the warrior.",
    condition: ({ badges }) => badges.has("challenger"),
  },
  {
    milestone: "iron_badge",
    title: "Iron Discipline Reward",
    description: "Monthly Ascent completed. Earn the meal that fuels the next month.",
    condition: ({ badges }) => badges.has("iron_discipline"),
  },
];

function Rewards() {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: badges } = useQuery({
    queryKey: ["user-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_badges").select("badge_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.badge_id));
    },
  });

  const { data: workouts } = useQuery({
    queryKey: ["workout-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: unlocked } = useQuery({
    queryKey: ["reward-meals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("reward_meals").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  // Auto-unlock newly earned rewards
  const autoUnlock = useMutation({
    mutationFn: async (templates: RewardTemplate[]) => {
      const rows = templates.map((t) => ({
        user_id: user!.id,
        milestone: t.milestone,
        title: t.title,
        description: t.description,
      }));
      const { error } = await supabase.from("reward_meals").insert(rows);
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reward-meals"] }),
  });

  useEffect(() => {
    if (!user || !profile || !badges || workouts === undefined || !unlocked) return;
    const state = {
      streak: profile.current_streak ?? 0,
      longestStreak: profile.longest_streak ?? 0,
      badges,
      workouts,
    };
    const alreadyUnlocked = new Set(unlocked.map((u) => u.milestone));
    const newlyEarned = TEMPLATES.filter((t) => t.condition(state) && !alreadyUnlocked.has(t.milestone));
    if (newlyEarned.length > 0) {
      autoUnlock.mutate(newlyEarned);
      toast.success(`${newlyEarned.length} reward meal${newlyEarned.length > 1 ? "s" : ""} unlocked!`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.longest_streak, badges?.size, workouts, unlocked?.length]);

  const claim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reward_meals").update({ claimed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward claimed. Enjoy it.");
      qc.invalidateQueries({ queryKey: ["reward-meals"] });
    },
  });

  const unlockedMap = new Map((unlocked ?? []).map((u) => [u.milestone, u]));
  const state = {
    streak: profile?.current_streak ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
    badges: badges ?? new Set<string>(),
    workouts: workouts ?? 0,
  };

  const totalUnlocked = unlocked?.length ?? 0;
  const totalClaimed = (unlocked ?? []).filter((u) => u.claimed_at).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <Link to="/dash" className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <p className="chip-label text-brand-red">Reward Vault</p>
          <p className="text-[10px] uppercase tracking-widest text-brand-silver">Discipline earns the meal</p>
        </div>
        <div className="size-10" />
      </header>

      <section className="px-6">
        <div className="relative overflow-hidden rounded-2xl border border-brand-red/30 bg-gradient-to-br from-brand-gray to-black p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-red/20 blur-3xl" />
          <Sparkles className="size-5 text-brand-red" />
          <p className="mt-2 text-display text-2xl font-bold italic">Ethan's Vault</p>
          <p className="mt-1 text-sm text-brand-silver leading-snug">
            "Reward meals aren't cheats. They're proof you stayed disciplined."
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Unlocked" value={totalUnlocked} />
            <Stat label="Claimed" value={totalClaimed} />
            <Stat label="Pending" value={totalUnlocked - totalClaimed} tone />
          </div>
        </div>
      </section>

      <section className="px-6 mt-6 space-y-3">
        {TEMPLATES.map((t) => {
          const earned = t.condition(state);
          const row = unlockedMap.get(t.milestone);
          const claimed = !!row?.claimed_at;
          return (
            <div
              key={t.milestone}
              className={`rounded-2xl border p-4 ${
                claimed ? "border-white/5 bg-brand-gray/40 opacity-70"
                : earned ? "border-brand-red/40 bg-brand-red/5"
                : "border-white/5 bg-brand-gray/40 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${earned ? "bg-brand-red text-white shadow-glow-red" : "bg-black/40 text-brand-silver"}`}>
                  {claimed ? <Check className="size-5" /> : earned ? <Gift className="size-5" /> : <Lock className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="mt-1 text-xs text-brand-silver leading-snug">{t.description}</p>
                  {row && !claimed && (
                    <button
                      onClick={() => claim.mutate(row.id)}
                      disabled={claim.isPending}
                      className="mt-3 w-full rounded-lg bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-glow-red"
                    >Claim Reward</button>
                  )}
                  {claimed && (
                    <p className="mt-2 chip-label text-brand-silver">
                      ✓ Claimed {new Date(row!.claimed_at!).toLocaleDateString()}
                    </p>
                  )}
                  {!row && !earned && (
                    <p className="mt-2 chip-label text-brand-silver">Locked · keep grinding</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>
      <div className="h-4" />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${tone ? "text-brand-red" : "text-white"}`}>{value}</p>
      <p className="chip-label text-brand-silver">{label}</p>
    </div>
  );
}
