import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { ChevronLeft, Flame, Trophy, Check, Calendar, CalendarDays, CalendarRange, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges")({
  head: () => ({ meta: [{ title: "Challenges — ASCEND" }] }),
  component: () => <AppShell><Challenges /></AppShell>,
});

type Challenge = {
  id: string;
  title: string;
  description: string;
  cadence: "daily" | "weekly" | "monthly";
  metric: "workouts" | "checkins" | "journals" | "photos" | "weights" | "nutrition_days";
  target_value: number;
  xp_reward: number;
  badge_id: string | null;
  icon: string;
};

function windowStart(cadence: "daily" | "weekly" | "monthly") {
  const d = new Date();
  if (cadence === "daily") {
    d.setHours(0, 0, 0, 0);
  } else if (cadence === "weekly") {
    const day = d.getDay();
    const diff = (day + 6) % 7; // Monday start
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

async function countMetric(
  userId: string,
  metric: Challenge["metric"],
  sinceIso: string,
) {
  if (metric === "workouts") {
    const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("performed_at", sinceIso);
    return count ?? 0;
  }
  if (metric === "checkins") {
    const { count } = await supabase.from("discipline_checkins").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("checkin_date", sinceIso.slice(0, 10));
    return count ?? 0;
  }
  if (metric === "journals") {
    const { count } = await supabase.from("journal_entries").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", sinceIso);
    return count ?? 0;
  }
  if (metric === "photos") {
    const { count } = await supabase.from("progress_photos").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("taken_at", sinceIso);
    return count ?? 0;
  }
  if (metric === "weights") {
    const { count } = await supabase.from("measurements").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("recorded_at", sinceIso);
    return count ?? 0;
  }
  if (metric === "nutrition_days") {
    const { data } = await supabase.from("food_logs").select("log_date")
      .eq("user_id", userId).gte("log_date", sinceIso.slice(0, 10));
    const days = new Set((data ?? []).map((r) => r.log_date as string));
    return days.size;
  }
  return 0;
}

const cadenceIcon = {
  daily: Calendar,
  weekly: CalendarDays,
  monthly: CalendarRange,
};

function Challenges() {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: challenges } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenges").select("*").eq("is_active", true).order("cadence");
      if (error) throw error;
      return (data ?? []) as Challenge[];
    },
  });

  const { data: participations } = useQuery({
    queryKey: ["challenge-participants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("challenge_participants").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["challenge-progress", user?.id, challenges?.map((c) => c.id).join(",")],
    enabled: !!user && !!challenges,
    queryFn: async () => {
      const out: Record<string, number> = {};
      await Promise.all(
        (challenges ?? []).map(async (c) => {
          out[c.id] = await countMetric(user!.id, c.metric, windowStart(c.cadence));
        }),
      );
      return out;
    },
  });

  const { data: earnedBadges } = useQuery({
    queryKey: ["user-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_badges").select("badge_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.badge_id));
    },
  });

  const claim = useMutation({
    mutationFn: async (c: Challenge) => {
      const progress = progressMap?.[c.id] ?? 0;
      if (progress < c.target_value) throw new Error("Not complete yet");
      const { error } = await supabase.rpc("claim_challenge_xp", { _challenge_id: c.id });
      if (error) throw error;
    },
    onSuccess: (_d, c) => {
      toast.success(`+${c.xp_reward} XP claimed`);
      qc.invalidateQueries({ queryKey: ["challenge-participants"] });
      qc.invalidateQueries({ queryKey: ["user-badges"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const completedSet = new Set(
    (participations ?? []).filter((p) => p.completed).map((p) => p.challenge_id),
  );

  const grouped = {
    daily: (challenges ?? []).filter((c) => c.cadence === "daily"),
    weekly: (challenges ?? []).filter((c) => c.cadence === "weekly"),
    monthly: (challenges ?? []).filter((c) => c.cadence === "monthly"),
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <Link to="/dash" className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <p className="chip-label text-brand-red">Challenges</p>
          <p className="text-[10px] uppercase tracking-widest text-brand-silver">Earn XP · Earn Badges</p>
        </div>
        <div className="size-10" />
      </header>

      <section className="px-6">
        <div className="rounded-2xl border border-brand-red/30 bg-gradient-to-br from-brand-gray to-black p-5">
          <Trophy className="size-5 text-brand-red" />
          <p className="mt-2 text-display text-2xl font-bold italic">Prove It.</p>
          <p className="mt-1 text-sm text-brand-silver leading-snug">
            Complete challenges to earn XP, unlock badges, and climb the ranks.
          </p>
        </div>
      </section>

      {(["daily", "weekly", "monthly"] as const).map((cadence) => (
        <section key={cadence} className="px-6 mt-6">
          <h3 className="chip-label text-brand-silver mb-3 capitalize">{cadence}</h3>
          <div className="space-y-2.5">
            {grouped[cadence].map((c) => {
              const progress = progressMap?.[c.id] ?? 0;
              const pct = Math.min(100, Math.round((progress / c.target_value) * 100));
              const isComplete = progress >= c.target_value;
              const claimed = completedSet.has(c.id);
              const Icon = cadenceIcon[c.cadence];
              const badgeEarned = c.badge_id ? earnedBadges?.has(c.badge_id) : false;
              return (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 ${claimed ? "border-brand-red/40 bg-brand-red/5" : "border-white/5 bg-brand-gray/60"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${claimed ? "bg-brand-red text-white" : "bg-brand-red/20 text-brand-red"}`}>
                      {claimed ? <Check className="size-5" /> : <Icon className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold">{c.title}</p>
                        <span className="chip-label text-brand-red whitespace-nowrap">+{c.xp_reward} XP</span>
                      </div>
                      <p className="mt-0.5 text-xs text-brand-silver leading-snug">{c.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                          <div
                            className={`h-full transition-all duration-700 ${claimed ? "bg-brand-red" : "bg-white/60"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-brand-silver">
                          {Math.min(progress, c.target_value)}/{c.target_value}
                        </span>
                      </div>
                      {c.badge_id && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Trophy className={`size-3 ${badgeEarned ? "text-brand-red" : "text-brand-silver"}`} />
                          <span className={`text-[10px] uppercase tracking-widest ${badgeEarned ? "text-brand-red" : "text-brand-silver"}`}>
                            Unlocks badge
                          </span>
                        </div>
                      )}
                      {!claimed && (
                        <button
                          onClick={() => claim.mutate(c)}
                          disabled={!isComplete || claim.isPending}
                          className={`mt-3 w-full rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                            isComplete
                              ? "bg-brand-red text-white shadow-glow-red hover:bg-brand-red-glow"
                              : "bg-black/40 text-brand-silver/60"
                          }`}
                        >
                          {isComplete ? "Claim Reward" : <span className="inline-flex items-center gap-1"><Lock className="size-3" /> In Progress</span>}
                        </button>
                      )}
                      {claimed && (
                        <p className="mt-3 chip-label text-brand-red">✓ Claimed</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <BadgeWall />

      <div className="h-4" />
    </>
  );
}

function BadgeWall() {
  const { user } = useUser();
  const { data: allBadges } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data } = await supabase.from("badges").select("*").order("tier");
      return data ?? [];
    },
  });
  const { data: earned } = useQuery({
    queryKey: ["user-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_badges").select("badge_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r) => r.badge_id));
    },
  });

  return (
    <section className="px-6 mt-6">
      <h3 className="chip-label text-brand-silver mb-3">Badge Wall</h3>
      <div className="grid grid-cols-4 gap-3">
        {(allBadges ?? []).map((b) => {
          const got = earned?.has(b.id);
          return (
            <div
              key={b.id}
              className={`flex flex-col items-center rounded-xl border p-3 text-center ${got ? "border-brand-red/50 bg-brand-red/5" : "border-white/5 bg-brand-gray/40 opacity-50"}`}
              title={b.description}
            >
              <div className={`grid size-10 place-items-center rounded-full ${got ? "bg-brand-red text-white shadow-glow-red" : "bg-black/40 text-brand-silver"}`}>
                {got ? <Trophy className="size-5" /> : <Lock className="size-4" />}
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest leading-tight">{b.name}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
