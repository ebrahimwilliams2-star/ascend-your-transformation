import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  X,
  ChevronDown,
  Flame,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal — ASCEND" },
      {
        name: "description",
        content:
          "Reflect daily. Track mood, energy, and discipline. Build a journaling streak that compounds into transformation.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <Journal />
    </AppShell>
  ),
});

const MOODS = [
  "Motivated",
  "Focused",
  "Neutral",
  "Tired",
  "Frustrated",
  "Excited",
  "Proud",
  "Determined",
] as const;
type Mood = (typeof MOODS)[number];

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

const MAX_CHARS = 5000;
const DRAFT_KEY = "ascend.journal.draft.v2";

type Entry = {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  energy_level: number | null;
  discipline_score: number | null;
  created_at: string;
  updated_at: string;
};

type Stats = {
  total: number;
  current_streak: number;
  longest_streak: number;
  most_common_mood: string | null;
  avg_discipline: number;
  avg_energy: number;
  weekly_count: number;
  monthly_count: number;
};

function Journal() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"write" | "history" | "insights">("write");

  const { data: entries } = useQuery<Entry[]>({
    queryKey: ["journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  return (
    <>
      <header className="flex items-center justify-between p-6">
        <div>
          <p className="chip-label text-brand-red">The Mirror</p>
          <h1 className="text-display text-3xl font-bold">Journal</h1>
        </div>
      </header>

      <div className="mx-6 mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-brand-gray/60 p-1">
        {(
          [
            { id: "write", label: "Write", icon: Pencil },
            { id: "history", label: "History", icon: BookOpen },
            { id: "insights", label: "Insights", icon: BarChart3 },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              tab === t.id
                ? "bg-brand-red text-white shadow-glow-red"
                : "text-brand-silver"
            }`}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "write" && <WriteTab entries={entries ?? []} onSaved={() => qc.invalidateQueries({ queryKey: ["journal"] })} />}
      {tab === "history" && <HistoryTab entries={entries ?? []} />}
      {tab === "insights" && <InsightsTab entries={entries ?? []} />}
    </>
  );
}

// ───────────────────────── WRITE ─────────────────────────

function WriteTab({ entries, onSaved }: { entries: Entry[]; onSaved: () => void }) {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood | "">("");
  const [energy, setEnergy] = useState<number>(7);
  const [discipline, setDiscipline] = useState<number>(7);
  const restoredRef = useRef(false);

  // restore draft
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.content) setContent(d.content);
      if (d.mood) setMood(d.mood);
      if (typeof d.energy === "number") setEnergy(d.energy);
      if (typeof d.discipline === "number") setDiscipline(d.discipline);
    } catch {
      /* ignore */
    }
  }, []);

  // autosave draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!title && !content && !mood) {
          localStorage.removeItem(DRAFT_KEY);
          return;
        }
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, content, mood, energy, discipline }),
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [title, content, mood, energy, discipline]);

  const create = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Write something.");
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user!.id,
        title: title.trim() || null,
        content: content.trim(),
        mood: mood || null,
        energy_level: energy,
        discipline_score: discipline,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      setMood("");
      setEnergy(7);
      setDiscipline(7);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      onSaved();
      toast.success("Entry saved. +20 XP banked.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const today = new Date().toDateString();
  const journaledToday = entries.some(
    (e) => new Date(e.created_at).toDateString() === today,
  );

  return (
    <section className="px-6">
      {journaledToday && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-xs">
          <Flame className="size-4 text-brand-red" />
          <span className="text-brand-silver">
            You already reflected today. Adding more is welcome — only the first entry counts toward your streak.
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-brand-red/20 bg-brand-gray/70 p-5 backdrop-blur">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder="What did you conquer today? What broke you? What's the next move?"
          rows={8}
          className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-brand-silver/60">
          <span>Autosaved locally</span>
          <span>
            {content.length} / {MAX_CHARS}
          </span>
        </div>

        <p className="chip-label mt-4 mb-2 text-brand-silver">Mood</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? "" : m)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                mood === m
                  ? "border-brand-red bg-brand-red/20 text-white"
                  : "border-white/10 text-brand-silver hover:border-white/30"
              }`}
            >
              <span className="mr-1">{MOOD_EMOJI[m]}</span>
              {m}
            </button>
          ))}
        </div>

        <Slider label="Energy" value={energy} onChange={setEnergy} accent="energy" />
        <Slider
          label="Discipline"
          value={discipline}
          onChange={setDiscipline}
          accent="discipline"
        />

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !content.trim()}
          className="mt-5 w-full rounded-xl bg-brand-red px-4 py-3.5 font-bold uppercase tracking-widest text-white shadow-glow-red transition-all disabled:opacity-40"
        >
          {create.isPending ? "Saving..." : "Save Entry"}
        </button>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  accent: "energy" | "discipline";
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="chip-label text-brand-silver">{label}</p>
        <span
          className={`text-sm font-bold ${
            accent === "energy" ? "text-yellow-400" : "text-brand-red"
          }`}
        >
          {value} / 10
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ascend-slider w-full accent-brand-red"
      />
    </div>
  );
}

// ───────────────────────── HISTORY ─────────────────────────

function HistoryTab({ entries }: { entries: Entry[] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("");
  const [minDiscipline, setMinDiscipline] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (moodFilter && e.mood !== moodFilter) return false;
      if (minDiscipline > 0 && (e.discipline_score ?? 0) < minDiscipline)
        return false;
      if (q) {
        const hay = `${e.title ?? ""} ${e.content}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, moodFilter, minDiscipline]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Entry deleted.");
    },
  });

  return (
    <section className="px-6 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-silver/60" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          className="w-full rounded-xl border border-white/10 bg-brand-gray/60 px-10 py-2.5 text-sm focus:border-brand-red focus:outline-none"
        />
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg ${
            showFilters || moodFilter || minDiscipline > 0
              ? "bg-brand-red/20 text-brand-red"
              : "text-brand-silver"
          }`}
        >
          <Filter className="size-4" />
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-white/5 bg-brand-gray/50 p-4">
          <p className="chip-label mb-2 text-brand-silver">Mood</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setMoodFilter("")}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                !moodFilter
                  ? "bg-brand-red text-white"
                  : "bg-white/5 text-brand-silver"
              }`}
            >
              All
            </button>
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMoodFilter(moodFilter === m ? "" : m)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  moodFilter === m
                    ? "bg-brand-red text-white"
                    : "bg-white/5 text-brand-silver"
                }`}
              >
                {MOOD_EMOJI[m]} {m}
              </button>
            ))}
          </div>
          <p className="chip-label mt-4 mb-2 text-brand-silver">
            Min discipline: {minDiscipline || "Any"}
          </p>
          <input
            type="range"
            min={0}
            max={10}
            value={minDiscipline}
            onChange={(e) => setMinDiscipline(Number(e.target.value))}
            className="w-full accent-brand-red"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <p className="chip-label text-brand-red mb-2">Empty Page</p>
          <p className="text-sm text-brand-silver">
            {entries.length === 0
              ? "Write the first entry. Reflect. Reset."
              : "No entries match those filters."}
          </p>
        </div>
      ) : (
        filtered.map((e) =>
          editingId === e.id ? (
            <EditCard
              key={e.id}
              entry={e}
              onClose={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                qc.invalidateQueries({ queryKey: ["journal"] });
              }}
            />
          ) : (
            <article
              key={e.id}
              className="rounded-xl border border-white/5 bg-brand-gray/60 p-4 transition-all"
            >
              <button
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="chip-label flex flex-wrap items-center gap-2 text-brand-silver">
                    <span>
                      {new Date(e.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {e.mood && (
                      <span className="text-brand-red">
                        · {MOOD_EMOJI[e.mood] ?? ""} {e.mood}
                      </span>
                    )}
                    {e.discipline_score != null && (
                      <span>· D {e.discipline_score}/10</span>
                    )}
                    {e.energy_level != null && (
                      <span>· E {e.energy_level}/10</span>
                    )}
                  </div>
                  {e.title && <h3 className="mt-1 font-bold">{e.title}</h3>}
                  <p
                    className={`mt-1.5 whitespace-pre-wrap text-sm text-brand-silver ${
                      expanded === e.id ? "" : "line-clamp-3"
                    }`}
                  >
                    {e.content}
                  </p>
                </div>
                <ChevronDown
                  className={`size-4 shrink-0 text-brand-silver transition-transform ${
                    expanded === e.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded === e.id && (
                <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => setEditingId(e.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-brand-silver hover:bg-white/10"
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this entry?")) remove.mutate(e.id);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-red/10 px-3 py-1.5 text-xs text-brand-red hover:bg-brand-red/20"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              )}
            </article>
          ),
        )
      )}
    </section>
  );
}

function EditCard({
  entry,
  onClose,
  onSaved,
}: {
  entry: Entry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [content, setContent] = useState(entry.content);
  const [mood, setMood] = useState<string>(entry.mood ?? "");
  const [energy, setEnergy] = useState<number>(entry.energy_level ?? 7);
  const [discipline, setDiscipline] = useState<number>(
    entry.discipline_score ?? 7,
  );

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("journal_entries")
        .update({
          title: title.trim() || null,
          content: content.trim(),
          mood: mood || null,
          energy_level: energy,
          discipline_score: discipline,
        })
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <article className="rounded-xl border border-brand-red/30 bg-brand-gray/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="chip-label text-brand-red">Editing</p>
        <button onClick={onClose} className="text-brand-silver">
          <X className="size-4" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
        rows={6}
        className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => setMood(mood === m ? "" : m)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              mood === m
                ? "border-brand-red bg-brand-red/20 text-white"
                : "border-white/10 text-brand-silver"
            }`}
          >
            {MOOD_EMOJI[m]} {m}
          </button>
        ))}
      </div>
      <Slider label="Energy" value={energy} onChange={setEnergy} accent="energy" />
      <Slider
        label="Discipline"
        value={discipline}
        onChange={setDiscipline}
        accent="discipline"
      />
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 w-full rounded-xl bg-brand-red px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
      >
        {save.isPending ? "Saving..." : "Save Changes"}
      </button>
    </article>
  );
}

// ───────────────────────── INSIGHTS ─────────────────────────

function InsightsTab({ entries }: { entries: Entry[] }) {
  const { user } = useUser();
  const { data: stats } = useQuery<Stats>({
    queryKey: ["journal-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("journal_stats", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  // last 14 days trend
  const trend = useMemo(() => {
    const days: { date: string; d: number | null; e: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const dayEntries = entries.filter(
        (e) => new Date(e.created_at).toDateString() === key,
      );
      const ds = dayEntries
        .map((e) => e.discipline_score)
        .filter((v): v is number => v != null);
      const es = dayEntries
        .map((e) => e.energy_level)
        .filter((v): v is number => v != null);
      days.push({
        date: d.toLocaleDateString("en", { weekday: "short" })[0],
        d: ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null,
        e: es.length ? es.reduce((a, b) => a + b, 0) / es.length : null,
      });
    }
    return days;
  }, [entries]);

  const moodCounts = useMemo(() => {
    const m: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.mood) m[e.mood] = (m[e.mood] ?? 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  if (!stats) {
    return (
      <section className="px-6">
        <div className="h-40 animate-pulse rounded-2xl bg-brand-gray/40" />
      </section>
    );
  }

  return (
    <section className="px-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total Entries" value={stats.total} />
        <StatTile
          label="Current Streak"
          value={`${stats.current_streak}d`}
          accent
        />
        <StatTile label="Longest Streak" value={`${stats.longest_streak}d`} />
        <StatTile
          label="Top Mood"
          value={
            stats.most_common_mood
              ? `${MOOD_EMOJI[stats.most_common_mood] ?? ""} ${stats.most_common_mood}`
              : "—"
          }
        />
        <StatTile label="Avg Discipline" value={`${stats.avg_discipline}/10`} />
        <StatTile label="Avg Energy" value={`${stats.avg_energy}/10`} />
        <StatTile label="This Week" value={stats.weekly_count} />
        <StatTile label="This Month" value={stats.monthly_count} />
      </div>

      <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-5">
        <p className="chip-label mb-3 text-brand-red">14-Day Discipline Trend</p>
        <TrendBars data={trend.map((d) => ({ label: d.date, v: d.d }))} color="red" />
      </div>

      <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-5">
        <p className="chip-label mb-3 text-yellow-400">14-Day Energy Trend</p>
        <TrendBars
          data={trend.map((d) => ({ label: d.date, v: d.e }))}
          color="yellow"
        />
      </div>

      {moodCounts.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-5">
          <p className="chip-label mb-3 text-brand-silver">Mood Distribution</p>
          <div className="space-y-2">
            {moodCounts.map(([m, n]) => {
              const pct = Math.round((n / entries.length) * 100);
              return (
                <div key={m}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>
                      {MOOD_EMOJI[m] ?? ""} {m}
                    </span>
                    <span className="text-brand-silver">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-brand-red"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-brand-red/40 bg-brand-red/10"
          : "border-white/5 bg-brand-gray/60"
      }`}
    >
      <p className="chip-label text-brand-silver">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          accent ? "text-brand-red" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TrendBars({
  data,
  color,
}: {
  data: { label: string; v: number | null }[];
  color: "red" | "yellow";
}) {
  const max = 10;
  const bar = color === "red" ? "bg-brand-red" : "bg-yellow-400";
  return (
    <div className="flex h-32 items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-full w-full items-end">
            <div
              className={`w-full rounded-t ${d.v != null ? bar : "bg-white/5"}`}
              style={{
                height: `${d.v != null ? (d.v / max) * 100 : 4}%`,
                minHeight: "2px",
              }}
              title={d.v != null ? d.v.toFixed(1) : "no entry"}
            />
          </div>
          <span className="text-[9px] text-brand-silver/60">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
