import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, signOut } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, LogOut, Scale, Sparkles, Flame, Apple, Trophy, Users, Heart, Gift } from "lucide-react";
import beforeImg from "@/assets/progress-before.jpg";
import afterImg from "@/assets/progress-after.jpg";
import { AscendLogo } from "@/components/AscendLogo";

export const Route = createFileRoute("/dash")({
  head: () => ({ meta: [{ title: "Dashboard — ASCEND" }] }),
  component: () => <AppShell><Dashboard /></AppShell>,
});

const DEFAULT_HABITS = [
  { id: "training", label: "Training Session", xp: 50 },
  { id: "nutrition", label: "Nutrition Locked In", xp: 30 },
  { id: "water", label: "1 Gallon Water", xp: 20 },
  { id: "sleep", label: "8 Hours Sleep", xp: 30 },
  { id: "journal", label: "Journal Entry", xp: 20 },
];

const RANKS = ["Initiate", "Warrior", "Vanguard", "Titan", "Elite", "Legend"];

function rankFor(level: number) {
  return RANKS[Math.min(Math.floor((level - 1) / 5), RANKS.length - 1)];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Dashboard() {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const today = todayStr();
  const { data: checkin } = useQuery({
    queryKey: ["checkin", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("discipline_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("checkin_date", today)
        .maybeSingle();
      return data;
    },
  });

  const completed = (checkin?.items as { id: string; done: boolean }[] | undefined) ?? [];

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const existing = (checkin?.items as { id: string; done: boolean }[] | undefined) ?? [];
      const map = new Map(existing.map((i) => [i.id, i.done]));
      map.set(id, !map.get(id));
      const items = Array.from(map.entries()).map(([id, done]) => ({ id, done }));
      const xp = items.reduce((acc, i) => acc + (i.done ? DEFAULT_HABITS.find((h) => h.id === i.id)?.xp ?? 0 : 0), 0);

      const { error } = await supabase
        .from("discipline_checkins")
        .upsert(
          { user_id: user!.id, checkin_date: today, items, xp_earned: xp },
          { onConflict: "user_id,checkin_date" }
        );
      if (error) throw error;

      // Update profile XP
      const currentXp = profile?.xp ?? 0;
      const newXp = currentXp + (xp - (checkin?.xp_earned ?? 0));
      const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
      await supabase
        .from("profiles")
        .update({ xp: newXp, level: newLevel, rank: rankFor(newLevel) })
        .eq("id", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const { data: recentPhotos } = useQuery({
    queryKey: ["photos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("user_id", user!.id)
        .order("taken_at", { ascending: false })
        .limit(2);
      return data ?? [];
    },
  });

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const nextLevelXp = level * 500;
  const progress = Math.min(100, Math.round(((xp % 500) / 500) * 100));
  const streak = profile?.current_streak ?? 0;
  const displayName = profile?.display_name ?? "Athlete";
  const firstName = displayName.split(" ")[0];
  const rank = profile?.rank ?? "Initiate";
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Still grinding" : hour < 12 ? "Rise up" : hour < 18 ? "Stay sharp" : "Finish strong";

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <div className="flex items-center gap-3">
          <AscendLogo className="size-11" />
          <div>
            <p className="chip-label text-brand-red">{rank} · LVL {level}</p>
            <h1 className="text-display text-xl font-bold mt-0.5">
              {greeting}, {firstName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="chip-label text-brand-silver">{xp.toLocaleString()} XP</p>
            <p className="text-xs font-bold text-white">{streak}d streak</p>
          </div>
          <button
            onClick={() => signOut()}
            className="grid size-10 place-items-center rounded-full border border-brand-red/30 text-brand-red hover:bg-brand-red/10"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Hero progress */}
      <section className="px-6 mb-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-brand-gray p-6">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-red/15 blur-3xl" />
          <div className="relative">
            <h2 className="text-display text-3xl font-bold italic tracking-tight">1% Better</h2>
            <p className="text-sm text-brand-silver mt-1">
              {streak > 0 ? `${streak}-day discipline streak.` : "Start your streak today."}
            </p>
            <div className="mt-6 flex items-end gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-brand-red transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="chip-label text-white">{xp % 500} / 500</span>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-brand-silver">
              {nextLevelXp - xp} XP to {rankFor(level + 1)}
            </p>
          </div>
        </div>
      </section>

      {/* The Ascendant card */}
      <section className="px-6 mb-6">
        <Link
          to="/ascendant"
          className="group relative block overflow-hidden rounded-2xl border border-brand-red/40 bg-gradient-to-br from-brand-gray to-black p-5 transition-all hover:shadow-glow-red"
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-red/30 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-brand-red/20 ring-1 ring-brand-red/50">
              <Flame className="size-6 text-brand-red" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="chip-label text-brand-red mb-0.5">The Ascendant</p>
              <p className="text-sm font-bold italic leading-snug text-white">
                Meet the future version of yourself.
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-brand-red" />
          </div>
        </Link>
      </section>

      {/* AI Coach card */}
      <section className="px-6 mb-6">
        <Link
          to="/coach"
          className="group block rounded-2xl bg-brand-red p-5 shadow-glow-red transition-all hover:shadow-glow-red-strong"
        >
          <div className="flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-black">
              <Sparkles className="size-5 text-brand-red" />
              <span className="absolute size-2 animate-pulse rounded-full bg-brand-red" style={{ marginLeft: 14, marginTop: 14 }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="chip-label text-black/70 mb-1">AI Coach Briefing</p>
              <p className="text-sm font-medium italic leading-snug text-white">
                "Discipline equals freedom. Open the chat — let's plan the next 24 hours."
              </p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-white" />
          </div>
        </Link>
      </section>

      {/* Brotherhood grid */}
      <section className="px-6 mb-6">
        <h3 className="chip-label text-brand-silver mb-3">Brotherhood</h3>
        <div className="grid grid-cols-2 gap-3">
          <FeatureTile to="/challenges" Icon={Trophy} label="Challenges" sub="Earn XP · Badges" tone />
          <FeatureTile to="/community" Icon={Heart} label="Community" sub="Feed · Reactions" />
          <FeatureTile to="/squads" Icon={Users} label="Squads" sub="Groups · Leaderboards" />
          <FeatureTile to="/rewards" Icon={Gift} label="Reward Vault" sub="Earned Meals" tone />
        </div>
      </section>

      {/* Transformation */}
      <section className="px-6 mb-6">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="chip-label text-brand-silver">Transformation</h3>
          <Link to="/photos" className="chip-label text-brand-red">View All →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PhotoSlot
            label={recentPhotos?.[1] ? "Baseline" : "Day 01"}
            tone="silver"
            path={recentPhotos?.[1]?.photo_path}
            fallback={beforeImg}
          />
          <PhotoSlot
            label={recentPhotos?.[0] ? "Current" : "Today"}
            tone="red"
            path={recentPhotos?.[0]?.photo_path}
            fallback={afterImg}
          />
        </div>
      </section>

      {/* Daily Discipline */}
      <section className="px-6 mb-6">
        <h3 className="chip-label text-brand-silver mb-3">Daily Discipline</h3>
        <div className="space-y-2.5">
          {DEFAULT_HABITS.map((h) => {
            const done = completed.find((c) => c.id === h.id)?.done ?? false;
            return (
              <button
                key={h.id}
                onClick={() => toggle.mutate(h.id)}
                disabled={toggle.isPending}
                className={`flex w-full items-center justify-between rounded-xl border border-white/5 p-4 transition-colors ${
                  done ? "bg-brand-gray/30 opacity-60" : "bg-brand-gray/60 hover:bg-brand-gray"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid size-5 place-items-center rounded border-2 ${done ? "bg-brand-red border-brand-red" : "border-brand-red/60"}`}>
                    {done && <span className="text-[10px] font-bold text-white">✓</span>}
                  </div>
                  <span className={`text-sm ${done ? "line-through" : ""}`}>{h.label}</span>
                </div>
                <span className={`chip-label ${done ? "text-brand-red" : "text-brand-silver"}`}>
                  {done ? "Claimed" : `+${h.xp} XP`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Metrics & Nutrition quick links */}
      <section className="px-6 space-y-3">
        <Link
          to="/nutrition"
          className="flex items-center justify-between rounded-xl border border-white/5 bg-brand-gray/60 p-4 transition-colors hover:bg-brand-gray"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-brand-red/20 text-brand-red">
              <Apple className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Nutrition</p>
              <p className="text-[10px] uppercase tracking-widest text-brand-silver">Calories · Macros · Meals</p>
            </div>
          </div>
          <ChevronRight className="size-5 text-brand-silver" />
        </Link>
        <Link
          to="/metrics"
          className="flex items-center justify-between rounded-xl border border-white/5 bg-brand-gray/60 p-4 transition-colors hover:bg-brand-gray"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-brand-red/20 text-brand-red">
              <Scale className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Body Metrics</p>
              <p className="text-[10px] uppercase tracking-widest text-brand-silver">Weight · Measurements</p>
            </div>
          </div>
          <ChevronRight className="size-5 text-brand-silver" />
        </Link>
      </section>
    </>
  );
}

function PhotoSlot({ label, tone, path, fallback }: { label: string; tone: "silver" | "red"; path?: string; fallback: string }) {
  const [signed, setSigned] = useState<string | null>(null);
  useState(() => {
    if (!path) return;
    supabase.storage.from("progress-photos").createSignedUrl(path, 60 * 60).then(({ data }) => {
      if (data?.signedUrl) setSigned(data.signedUrl);
    });
  });
  const src = signed ?? fallback;
  return (
    <div className="space-y-2">
      <div className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-brand-gray ${tone === "red" ? "ring-1 ring-brand-red/50" : ""}`}>
        <img src={src} alt={label} className="h-full w-full object-cover" loading="lazy" />
        <span className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${tone === "red" ? "bg-brand-red text-white" : "bg-black/80 text-white"}`}>
          {label}
        </span>
      </div>
      <p className={`text-center text-[10px] uppercase tracking-widest ${tone === "red" ? "text-brand-red font-bold" : "text-brand-silver"}`}>
        {tone === "red" ? "Current" : "Baseline"}
      </p>
    </div>
  );
}
