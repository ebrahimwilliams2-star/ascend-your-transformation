import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, signOut } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, LogOut, Scale, Sparkles, Flame, Apple, Trophy, Users, Heart, Gift, Share2, MapPin, Edit3, User } from "lucide-react";
import beforeImg from "@/assets/progress-before.jpg";
import afterImg from "@/assets/progress-after.jpg";
import { AscendLogo } from "@/components/AscendLogo";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ShareCardModal } from "@/components/ShareCardModal";
import { LocationSheet } from "@/components/LocationSheet";
import { TodayJournalWidget, StreakWidget, LatestEntryWidget, DisciplineTrendWidget } from "@/components/JournalWidgets";

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
      const { error } = await supabase.rpc("toggle_discipline_habit", { _habit_id: id });
      if (error) throw error;
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

  const [shareOpen, setShareOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const city = (profile as { city?: string | null } | null)?.city ?? null;
  const province = (profile as { province?: string | null } | null)?.province ?? null;

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <div className="flex items-center gap-3">
          <Link to="/profile">
            <ProfileAvatar profile={profile} size="size-11" />
          </Link>
          <div>
            <p className="chip-label text-brand-red">{rank} · LVL {level}</p>
            <h1 className="text-display text-xl font-bold mt-0.5">
              {greeting}, {firstName}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocationOpen(true)}
            className="hidden sm:flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-silver hover:text-white"
          >
            <MapPin className="size-3" />
            {city ?? "Set city"}
          </button>
          <div className="text-right">
            <p className="chip-label text-brand-silver">{xp.toLocaleString()} XP</p>
            <p className="text-xs font-bold text-white">{streak}d streak</p>
          </div>
          <NotificationsBell />
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-display text-3xl font-bold italic tracking-tight">1% Better</h2>
                <p className="text-sm text-brand-silver mt-1">
                  {streak > 0 ? `${streak}-day discipline streak.` : "Start your streak today."}
                </p>
              </div>
              {streak >= 3 && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-brand-red/40 text-brand-red hover:bg-brand-red/10"
                  aria-label="Share streak"
                >
                  <Share2 className="size-4" />
                </button>
              )}
            </div>
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

      <ShareCardModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        kind="streak"
        headline={`${rank} · LVL ${level}`}
        big={`${streak}d`}
        caption="Discipline streak — and counting."
        athlete={displayName}
      />

      <LocationSheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        initial={profile as any}
        onSaved={() => qc.invalidateQueries({ queryKey: ["profile"] })}
      />

      {city ? (
        <section className="px-6 mb-6">
          <button
            onClick={() => setLocationOpen(true)}
            className="w-full group relative block overflow-hidden rounded-2xl border border-brand-red/30 bg-brand-red/5 p-5 transition-all hover:bg-brand-red/10 text-left"
          >
            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-brand-red/15 blur-2xl group-hover:blur-3xl transition-all" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-brand-red/15 text-brand-red">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <p className="chip-label text-brand-red mb-0.5">Your Territory</p>
                  <p className="text-sm font-bold text-white">{city}{province ? `, ${province}` : ""}</p>
                  <p className="text-[11px] text-brand-silver mt-0.5">Connect with local gym bros in your area.</p>
                </div>
              </div>
              <Edit3 className="size-5 shrink-0 text-brand-red opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        </section>
      ) : (
        <section className="px-6 mb-6">
          <button
            onClick={() => setLocationOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-brand-red/30 bg-brand-red/5 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-red/15 text-brand-red">
                <MapPin className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Plant Your Flag</p>
                <p className="text-[11px] text-brand-silver">Set your South African city — fuel local brotherhood.</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-brand-red" />
          </button>
        </section>
      )}

      {/* Journal Widgets Section */}
      <section className="px-6 mb-6">
        <h3 className="chip-label text-brand-silver mb-3">The Mirror</h3>
        <div className="grid grid-cols-2 gap-3">
          <TodayJournalWidget />
          <StreakWidget />
        </div>
        <div className="mt-3 space-y-3">
          <LatestEntryWidget />
          <DisciplineTrendWidget />
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
              <p className="chip-label text-black/70 mb-1">Ethan · Your Coach</p>
              <p className="text-sm font-medium italic leading-snug text-white">
                "Show up today. The next action matters most — let's plan it together."
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
      <section className="px-6 space-y-3 pb-8">
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

function FeatureTile({ to, Icon, label, sub, tone }: { to: string; Icon: typeof Trophy; label: string; sub: string; tone?: boolean }) {
  return (
    <Link
      to={to}
      className={`group relative block overflow-hidden rounded-2xl border p-4 transition-all ${
        tone
          ? "border-brand-red/40 bg-gradient-to-br from-brand-red/15 to-black hover:shadow-glow-red"
          : "border-white/5 bg-brand-gray/60 hover:bg-brand-gray"
      }`}
    >
      <div className={`grid size-10 place-items-center rounded-xl ${tone ? "bg-brand-red text-white shadow-glow-red" : "bg-brand-red/20 text-brand-red"}`}>
        <Icon className="size-5" />
      </div>
      <p className="mt-3 text-sm font-bold">{label}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-brand-silver">{sub}</p>
    </Link>
  );
}

type ProfileAvatarProps = {
  profile: { avatar_url?: string | null; display_name?: string | null; username?: string | null } | null | undefined;
  size?: string;
};

function ProfileAvatar({ profile, size = "size-10" }: ProfileAvatarProps) {
  const initials = (() => {
    const name = profile?.display_name ?? profile?.username;
    return name ? name.slice(0, 2).toUpperCase() : null;
  })();

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt="Profile"
        className={`${size} rounded-full object-cover ring-1 ring-brand-red/40 shadow-glow-red`}
      />
    );
  }

  return (
    <div className={`${size} rounded-full bg-brand-red/20 flex items-center justify-center ring-1 ring-brand-red/40`}>
      {initials ? (
        <span className="text-xs font-bold text-brand-red">{initials}</span>
      ) : (
        <User className="size-5 text-brand-red" />
      )}
    </div>
  );
}
