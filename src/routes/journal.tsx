import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/journal")({
  head: () => ({ meta: [{ title: "Journal — ASCEND" }] }),
  component: () => <AppShell><Journal /></AppShell>,
});

const MOODS = ["⚡ Locked In", "🔥 Fired Up", "🧊 Calm", "🌀 Off"];

function Journal() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("");

  const { data: entries } = useQuery({
    queryKey: ["journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Write something.");
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user!.id,
        title: title || null,
        content,
        mood: mood || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      setOpen(false); setTitle(""); setContent(""); setMood("");
      toast.success("Entry saved.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  return (
    <>
      <header className="flex items-center justify-between p-6">
        <div>
          <p className="chip-label text-brand-red">The Mirror</p>
          <h1 className="text-display text-3xl font-bold">Journal</h1>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="grid size-11 place-items-center rounded-full bg-brand-red shadow-glow-red"
        >
          <Plus className={`size-5 text-white transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </header>

      {open && (
        <section className="mx-6 mb-6 rounded-2xl border border-brand-red/30 bg-brand-gray p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you conquer today? What broke you? What's the next move?"
            rows={6}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? "" : m)}
                className={`rounded-full border px-3 py-1.5 text-xs ${mood === m ? "border-brand-red bg-brand-red/20 text-white" : "border-white/10 text-brand-silver"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="mt-4 w-full rounded-xl bg-brand-red px-4 py-3 font-bold uppercase tracking-widest text-white disabled:opacity-50"
          >
            {create.isPending ? "..." : "Save Entry"}
          </button>
        </section>
      )}

      <section className="px-6 space-y-3">
        {(entries ?? []).length === 0 && !open && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="chip-label text-brand-red mb-2">Empty Page</p>
            <p className="text-sm text-brand-silver">Write the first entry. Reflect. Reset.</p>
          </div>
        )}
        {(entries ?? []).map((e) => (
          <article key={e.id} className="rounded-xl border border-white/5 bg-brand-gray/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 chip-label text-brand-silver">
                  <span>{new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {e.mood && <span className="text-brand-red">· {e.mood}</span>}
                </div>
                {e.title && <h3 className="mt-1 font-bold">{e.title}</h3>}
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-brand-silver">{e.content}</p>
              </div>
              <button onClick={() => remove.mutate(e.id)} className="text-brand-silver hover:text-brand-red">
                <Trash2 className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
