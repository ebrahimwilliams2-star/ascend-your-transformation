import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import {
  Flame,
  BookOpen,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface JournalEntry {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  energy_level: number | null;
  discipline_score: number | null;
  created_at: string;
  updated_at: string;
}

interface JournalStats {
  total: number;
  current_streak: number;
  longest_streak: number;
  most_common_mood: string | null;
  avg_discipline: number;
  avg_energy: number;
  weekly_count: number;
  monthly_count: number;
}

const MOOD_EMOJI: Record<string, string> = {
  Motivated: "⚡",
  Focused: "🎯",
  Neutral: "⚪",
  Tired: "🌙",
  Frustrated: "💢",
  Excited: "🔥",
  Proud: "🏆",
  Determined: "🛡️",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Today's Journal Status Widget
export function TodayJournalWidget() {
  const { user } = useUser();
  const today = todayStr();

  const { data: entries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
  });

  const journaledToday = entries?.some(
    (e) => e.created_at.startsWith(today)
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to="/journal"
      className="group rounded-2xl border transition-all overflow-hidden"
      style={{
        borderColor: journaledToday ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.05)",
        backgroundColor: journaledToday ? "rgba(239, 68, 68, 0.05)" : "rgba(55, 65, 81, 0.6)",
      }}
    >
      <div className="relative p-4">
        <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-brand-red/10 blur-2xl group-hover:blur-3xl transition-all" />
        <div className="relative flex items-center gap-3">
          <div
            className="grid size-10 place-items-center rounded-lg"
            style={{
              backgroundColor: journaledToday ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
              color: journaledToday ? "rgb(239, 68, 68)" : "rgba(239, 68, 68, 0.6)",
            }}
          >
            <Calendar className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="chip-label text-brand-silver text-[10px]">Today's Entry</p>
            <p className="text-sm font-bold">
              {journaledToday ? "Reflected ✓" : "Not Yet"}
            </p>
            <p className="text-[10px] text-brand-silver/70 mt-0.5">
              {journaledToday ? "Streak active" : "Write to start"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Current Streak Widget
export function StreakWidget() {
  const { user } = useUser();

  const { data: stats, isLoading } = useQuery<JournalStats>({
    queryKey: ["journal-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("journal_stats", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as JournalStats;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
            <div className="h-6 w-16 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-12 w-12 rounded-lg bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  const streak = stats?.current_streak ?? 0;
  const longest = stats?.longest_streak ?? 0;

  return (
    <Link
      to="/journal?tab=insights"
      className="group relative block rounded-2xl border border-brand-red/40 bg-gradient-to-br from-brand-red/15 to-black p-4 transition-all hover:shadow-glow-red overflow-hidden"
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-red/30 blur-3xl" />
      <div className="relative">
        <p className="chip-label text-brand-red text-[10px]">Streak</p>
        <div className="flex items-end justify-between mt-2">
          <div>
            <p className="text-3xl font-bold text-white">{streak}d</p>
            <p className="text-[10px] text-brand-silver/80 mt-1">
              Best: {longest}d
            </p>
          </div>
          <Flame className="size-8 text-brand-red opacity-60" />
        </div>
      </div>
    </Link>
  );
}

// Latest Entry Preview Widget
export function LatestEntryWidget() {
  const { user } = useUser();

  const { data: entries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const latest = entries?.[0];

  if (!latest) {
    return (
      <Link
        to="/journal"
        className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4 text-center"
      >
        <BookOpen className="size-5 text-brand-silver/40 mx-auto mb-2" />
        <p className="text-sm font-bold">No entries yet</p>
        <p className="text-[10px] text-brand-silver/70">Write your first entry</p>
      </Link>
    );
  }

  const date = new Date(latest.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const preview = latest.content.substring(0, 80);
  const isLonger = latest.content.length > 80;

  return (
    <Link
      to="/journal?tab=history"
      className="group rounded-2xl border border-white/5 bg-brand-gray/60 p-4 transition-all hover:border-brand-red/40 hover:bg-brand-gray"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="chip-label text-brand-silver text-[10px]">{date}</p>
        {latest.mood && (
          <span className="text-xs">
            {MOOD_EMOJI[latest.mood] ?? ""} {latest.mood}
          </span>
        )}
      </div>
      {latest.title ? (
        <>
          <h4 className="text-sm font-bold line-clamp-1">{latest.title}</h4>
          <p className="text-xs text-brand-silver/70 mt-1 line-clamp-2">
            {preview}
            {isLonger && "..."}
          </p>
        </>
      ) : (
        <p className="text-xs text-brand-silver/80 line-clamp-3">
          {preview}
          {isLonger && "..."}
        </p>
      )}
      {latest.discipline_score != null && (
        <p className="text-[10px] text-brand-red mt-2 font-bold">
          D {latest.discipline_score}/10
        </p>
      )}
    </Link>
  );
}

// Discipline Trend Widget (7-day mini chart)
export function DisciplineTrendWidget() {
  const { user } = useUser();

  const { data: entries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
  });

  const trend = entries ? calculateTrend(entries) : [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
        <div className="h-20 rounded bg-white/10 animate-pulse" />
      </div>
    );
  }

  const avgDiscipline =
    trend.filter((t) => t.v !== null).length > 0
      ? Math.round(
          trend
            .filter((t) => t.v !== null)
            .reduce((a, b) => a + (b.v ?? 0), 0) /
            trend.filter((t) => t.v !== null).length
        )
      : 0;

  return (
    <Link
      to="/journal?tab=insights"
      className="group rounded-2xl border border-white/5 bg-brand-gray/60 p-4 transition-all hover:border-brand-red/40"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="chip-label text-brand-red text-[10px]">7-Day Trend</p>
        <p className="text-sm font-bold">{avgDiscipline}/10</p>
      </div>
      <MiniTrendBars data={trend} />
    </Link>
  );
}

function calculateTrend(entries: JournalEntry[]) {
  const days: { date: string; v: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const dayEntries = entries.filter(
      (e) => new Date(e.created_at).toDateString() === key
    );
    const ds = dayEntries
      .map((e) => e.discipline_score)
      .filter((v): v is number => v != null);
    days.push({
      date: d.toLocaleDateString("en", { weekday: "short" })[0],
      v: ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null,
    });
  }
  return days;
}

function MiniTrendBars({
  data,
}: {
  data: { date: string; v: number | null }[];
}) {
  const max = 10;
  return (
    <div className="flex h-16 items-end gap-1">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <div className="flex h-full w-full items-end">
            <div
              className={`w-full rounded-t transition-all ${
                d.v != null ? "bg-brand-red" : "bg-white/5"
              }`}
              style={{
                height: `${d.v != null ? (d.v / max) * 100 : 4}%`,
                minHeight: "2px",
              }}
              title={d.v != null ? `${d.v.toFixed(1)}` : "no entry"}
            />
          </div>
          <span className="text-[8px] text-brand-silver/40 mt-1">{d.date}</span>
        </div>
      ))}
    </div>
  );
}
