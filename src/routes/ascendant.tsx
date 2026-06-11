import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { ChevronLeft, Flame, Trophy, Sparkles, Shield, Activity, Heart, TrendingUp, Lock } from "lucide-react";

export const Route = createFileRoute("/ascendant")({
  head: () => ({ meta: [{ title: "The Ascendant — ASCEND" }] }),
  component: () => <AppShell><Ascendant /></AppShell>,
});

const RANKS = [
  { name: "Beginner",    minXp: 0,     stage: 1 },
  { name: "Initiate",    minXp: 500,   stage: 1 },
  { name: "Disciplined", minXp: 1500,  stage: 2 },
  { name: "Relentless",  minXp: 3500,  stage: 3 },
  { name: "Ascendant",   minXp: 7000,  stage: 4 },
  { name: "Elite",       minXp: 12000, stage: 5 },
  { name: "Legend",      minXp: 20000, stage: 5 },
];

function rankFor(xp: number) {
  let r = RANKS[0];
  for (const next of RANKS) if (xp >= next.minXp) r = next;
  return r;
}

function nextRank(xp: number) {
  return RANKS.find((r) => r.minXp > xp) ?? null;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function Ascendant() {
  const { user } = useUser();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const since30 = daysAgo(30);
  const since7 = daysAgo(7);

  const { data: stats } = useQuery({
    queryKey: ["ascendant-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [workouts, journals, photos, weights, checkins] = await Promise.all([
        supabase.from("workouts").select("id, performed_at", { count: "exact", head: false })
          .eq("user_id", user!.id).gte("performed_at", since30),
        supabase.from("journal_entries").select("id", { count: "exact", head: true })
          .eq("user_id", user!.id).gte("created_at", since30),
        supabase.from("progress_photos").select("id", { count: "exact", head: true })
          .eq("user_id", user!.id),
        supabase.from("measurements").select("id", { count: "exact", head: true })
          .eq("user_id", user!.id).gte("recorded_at", since30),
        supabase.from("discipline_checkins").select("items, xp_earned, checkin_date")
          .eq("user_id", user!.id).gte("checkin_date", since7.slice(0, 10)),
      ]);
      return {
        workouts30: workouts.count ?? 0,
        journals30: journals.count ?? 0,
        photos: photos.count ?? 0,
        weights30: weights.count ?? 0,
        checkins7: checkins.data ?? [],
      };
    },
  });

  const xp = profile?.xp ?? 0;
  const streak = profile?.current_streak ?? 0;
  const current = rankFor(xp);
  const next = nextRank(xp);
  const span = next ? next.minXp - current.minXp : 1;
  const into = xp - current.minXp;
  const rankProgress = next ? clamp((into / span) * 100) : 100;

  // Score calculations
  const strength = clamp(((stats?.workouts30 ?? 0) / 16) * 100); // 16 workouts/mo = 100
  const consistency = clamp((streak / 30) * 100);
  const transformation = clamp(((stats?.photos ?? 0) / 12) * 100);
  const recoveryHabits = (stats?.checkins7 ?? []).reduce((acc, c) => {
    const items = (c.items as { id: string; done: boolean }[] | null) ?? [];
    return acc + items.filter((i) => (i.id === "sleep" || i.id === "water") && i.done).length;
  }, 0);
  const recovery = clamp((recoveryHabits / 14) * 100); // 2 habits * 7 days
  const journalScore = clamp(((stats?.journals30 ?? 0) / 20) * 100);
  const discipline = clamp((strength + consistency + recovery + journalScore) / 4);
  const transformationOverall = clamp((discipline * 0.5) + (transformation * 0.3) + (consistency * 0.2));

  const stage = current.stage;
  const message = motivationalMessage(streak, stats?.workouts30 ?? 0, stats?.photos ?? 0);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <Link to="/dash" className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <p className="chip-label text-brand-red">The Ascendant</p>
          <p className="text-[10px] uppercase tracking-widest text-brand-silver">Your future self</p>
        </div>
        <div className="size-10" />
      </header>

      {/* Hero — character visualization */}
      <section className="px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-brand-gray to-black p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-red/20 blur-3xl animate-pulse" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-brand-red/10 blur-3xl" />

          <div className="relative flex flex-col items-center">
            <p className="chip-label text-brand-red animate-fade-in">Stage {stage} of 5</p>
            <h1 className="text-display text-3xl font-bold italic mt-1">{current.name}</h1>

            <AscendantAvatar stage={stage} />

            <p className="mt-4 max-w-xs text-center text-sm italic text-brand-silver leading-snug">
              "{message}"
            </p>
          </div>
        </div>
      </section>

      {/* Rank progress */}
      <section className="px-6 mt-6">
        <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="chip-label text-brand-silver">Current Rank</p>
              <p className="text-display text-lg font-bold">{current.name}</p>
            </div>
            <div className="text-right">
              <p className="chip-label text-brand-silver">XP</p>
              <p className="text-display text-lg font-bold">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/60">
            <div
              className="h-full bg-gradient-to-r from-brand-red to-brand-red/70 shadow-glow-red transition-all duration-700"
              style={{ width: `${rankProgress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="text-brand-silver">{rankProgress}% there</span>
            <span className="text-brand-red flex items-center gap-1">
              {next ? <>Next: {next.name} <Lock className="size-3" /></> : "Max rank reached"}
            </span>
          </div>
        </div>
      </section>

      {/* Score grid */}
      <section className="px-6 mt-6">
        <h3 className="chip-label text-brand-silver mb-3">Ascendant Profile</h3>
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard Icon={Shield}     label="Discipline"     value={discipline}     tone />
          <ScoreCard Icon={Activity}   label="Strength"       value={strength} />
          <ScoreCard Icon={Flame}      label="Consistency"    value={consistency} />
          <ScoreCard Icon={Heart}      label="Recovery"       value={recovery} />
          <ScoreCard Icon={TrendingUp} label="Transformation" value={transformationOverall} wide />
        </div>
      </section>

      {/* Streak + photos */}
      <section className="px-6 mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
          <Flame className="size-5 text-brand-red" />
          <p className="mt-2 text-2xl font-bold">{streak}</p>
          <p className="chip-label text-brand-silver">Day Streak</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
          <Trophy className="size-5 text-brand-red" />
          <p className="mt-2 text-2xl font-bold">{stats?.photos ?? 0}</p>
          <p className="chip-label text-brand-silver">Photos Logged</p>
        </div>
      </section>

      {/* Next evolution */}
      <section className="px-6 mt-6">
        <div className="rounded-2xl border border-brand-red/30 bg-brand-red/5 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 shrink-0 text-brand-red mt-0.5" />
            <div>
              <p className="chip-label text-brand-red">Next Evolution</p>
              <p className="mt-1 text-sm font-bold">
                {next ? `${next.minXp - xp} XP until ${next.name}` : "You've reached the final form."}
              </p>
              <p className="mt-1 text-xs text-brand-silver leading-snug">
                Log a workout (+50), check in (+20), or journal (+25) to keep climbing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* XP breakdown */}
      <section className="px-6 mt-6 mb-4">
        <h3 className="chip-label text-brand-silver mb-3">How You Earn</h3>
        <div className="space-y-2">
          {[
            { label: "Progress Photo", xp: 100 },
            { label: "Workout Logged", xp: 50 },
            { label: "Journal Entry", xp: 25 },
            { label: "Daily Check-In", xp: 20 },
            { label: "Weight Log", xp: 15 },
            { label: "7-Day Streak Bonus", xp: 100 },
            { label: "30-Day Streak Bonus", xp: 500 },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/5 bg-brand-gray/40 px-4 py-2.5">
              <span className="text-sm">{row.label}</span>
              <span className="chip-label text-brand-red">+{row.xp} XP</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-4">
        <p className="text-center text-[10px] uppercase tracking-widest text-brand-silver">
          {transformationOverall}% transformation complete · keep climbing
        </p>
      </section>
    </>
  );
}

function ScoreCard({
  Icon, label, value, tone, wide,
}: { Icon: typeof Shield; label: string; value: number; tone?: boolean; wide?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${wide ? "col-span-2" : ""} ${tone ? "border-brand-red/30 bg-brand-red/5" : "border-white/5 bg-brand-gray/60"}`}>
      <div className="flex items-center justify-between">
        <Icon className={`size-4 ${tone ? "text-brand-red" : "text-brand-silver"}`} />
        <span className={`text-xl font-bold ${tone ? "text-brand-red" : "text-white"}`}>{value}</span>
      </div>
      <p className="mt-1 chip-label text-brand-silver">{label}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
        <div
          className={`h-full transition-all duration-700 ${tone ? "bg-brand-red" : "bg-white/70"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function AscendantAvatar({ stage }: { stage: number }) {
  // Cinematic silhouette that gains definition by stage (1..5)
  const glow = ["opacity-20", "opacity-30", "opacity-50", "opacity-70", "opacity-100"][stage - 1];
  const detail = stage >= 3;
  const elite = stage >= 4;
  const legend = stage >= 5;

  return (
    <div className="relative mt-6 grid size-56 place-items-center">
      {/* Floor reflection */}
      <div className="absolute bottom-2 h-2 w-32 rounded-full bg-brand-red/40 blur-md" />
      {/* Radial glow */}
      <div className={`absolute inset-0 rounded-full bg-gradient-radial from-brand-red/40 to-transparent ${glow} transition-opacity duration-1000`} style={{ background: "radial-gradient(circle at center, rgba(220,38,38,0.35), transparent 65%)" }} />

      <svg viewBox="0 0 200 240" className="relative h-52 w-44 drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]">
        <defs>
          <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={legend ? "#fff" : elite ? "#fca5a5" : "#1a1a1a"} stopOpacity={legend ? 0.9 : elite ? 0.7 : 1} />
            <stop offset="100%" stopColor={elite ? "#dc2626" : "#0a0a0a"} />
          </linearGradient>
          <linearGradient id="outline" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor={legend ? "#fff" : "#7f1d1d"} />
          </linearGradient>
        </defs>

        {/* Head */}
        <circle cx="100" cy="40" r="22" fill="url(#body)" stroke="url(#outline)" strokeWidth={detail ? 2 : 1} />

        {/* Torso */}
        <path
          d={
            elite
              ? "M70 70 L130 70 L138 130 L128 160 L72 160 L62 130 Z" // broader, defined
              : detail
              ? "M74 70 L126 70 L134 130 L124 158 L76 158 L66 130 Z"
              : "M78 70 L122 70 L128 130 L120 158 L80 158 L72 130 Z" // narrower silhouette
          }
          fill="url(#body)"
          stroke="url(#outline)"
          strokeWidth={detail ? 2 : 1}
        />

        {/* Chest/abs lines on stage 3+ */}
        {detail && (
          <>
            <line x1="100" y1="80" x2="100" y2="150" stroke="#dc2626" strokeOpacity={0.4} strokeWidth="1.5" />
            <line x1="82" y1="105" x2="118" y2="105" stroke="#dc2626" strokeOpacity={0.3} strokeWidth="1" />
            <line x1="84" y1="125" x2="116" y2="125" stroke="#dc2626" strokeOpacity={0.3} strokeWidth="1" />
          </>
        )}

        {/* Arms */}
        <path
          d={elite ? "M70 75 L52 140 L60 145 L82 90 Z" : "M74 75 L60 140 L66 144 L82 88 Z"}
          fill="url(#body)" stroke="url(#outline)" strokeWidth={detail ? 2 : 1}
        />
        <path
          d={elite ? "M130 75 L148 140 L140 145 L118 90 Z" : "M126 75 L140 140 L134 144 L118 88 Z"}
          fill="url(#body)" stroke="url(#outline)" strokeWidth={detail ? 2 : 1}
        />

        {/* Legs */}
        <path d="M80 160 L78 220 L94 220 L98 162 Z" fill="url(#body)" stroke="url(#outline)" strokeWidth={detail ? 2 : 1} />
        <path d="M120 160 L122 220 L106 220 L102 162 Z" fill="url(#body)" stroke="url(#outline)" strokeWidth={detail ? 2 : 1} />

        {/* Legend aura sparks */}
        {legend && (
          <>
            <circle cx="40" cy="60" r="2" fill="#fff" opacity="0.8">
              <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="160" cy="80" r="2" fill="#fff" opacity="0.6">
              <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="170" cy="180" r="2" fill="#dc2626" opacity="0.8">
              <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}

function motivationalMessage(streak: number, workouts: number, photos: number) {
  if (streak >= 30) return "Consistency is becoming your identity.";
  if (streak >= 7) return "Another step closer.";
  if (photos >= 5) return "You are no longer who you were when you started.";
  if (workouts >= 10) return "The work is reshaping you.";
  if (workouts >= 1) return "The version of you that you promised to become is being built.";
  return "The version of you that you promised to become is still waiting.";
}
