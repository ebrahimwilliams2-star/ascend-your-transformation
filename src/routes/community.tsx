import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { ChevronLeft, Heart, Send, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/community")({
  head: () => ({ meta: [{ title: "Community — ASCEND" }] }),
  component: () => <AppShell><Community /></AppShell>,
});

const REACTIONS = [
  { id: "respect", label: "Respect", emoji: "🫡" },
  { id: "salute", label: "Salute", emoji: "⚔️" },
  { id: "strong_work", label: "Strong Work", emoji: "💪" },
  { id: "legend", label: "Legend", emoji: "👑" },
] as const;

type Reaction = typeof REACTIONS[number]["id"];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Community() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"update" | "milestone" | "transformation" | "challenge">("update");

  const { data: posts } = useQuery({
    queryKey: ["community-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const authorIds = (posts ?? []).map((p) => p.user_id);
  const { data: authors } = useQuery({
    queryKey: ["post-authors", authorIds.sort().join(",")],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, rank, level")
        .in("id", authorIds);
      return new Map((data ?? []).map((p) => [p.id, p]));
    },
  });

  const postIds = (posts ?? []).map((p) => p.id);
  const { data: reactions } = useQuery({
    queryKey: ["post-reactions", postIds.sort().join(",")],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("post_reactions")
        .select("post_id, user_id, reaction")
        .in("post_id", postIds);
      return data ?? [];
    },
  });

  const reactionMap = new Map<string, { counts: Record<Reaction, number>; mine: Set<Reaction> }>();
  for (const r of reactions ?? []) {
    const e = reactionMap.get(r.post_id) ?? { counts: { respect: 0, salute: 0, strong_work: 0, legend: 0 }, mine: new Set<Reaction>() };
    e.counts[r.reaction as Reaction] += 1;
    if (r.user_id === user?.id) e.mine.add(r.reaction as Reaction);
    reactionMap.set(r.post_id, e);
  }

  const post = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Write something first");
      const { error } = await supabase.from("community_posts").insert({
        user_id: user!.id,
        content: content.trim(),
        post_type: postType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      setComposing(false);
      qc.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success("Posted to the brotherhood.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const react = useMutation({
    mutationFn: async ({ postId, reaction, currentlyOn }: { postId: string; reaction: Reaction; currentlyOn: boolean }) => {
      if (currentlyOn) {
        await supabase.from("post_reactions").delete()
          .eq("post_id", postId).eq("user_id", user!.id).eq("reaction", reaction);
      } else {
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user!.id,
          reaction,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post-reactions"] }),
  });

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <Link to="/dash" className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <p className="chip-label text-brand-red">Community</p>
          <p className="text-[10px] uppercase tracking-widest text-brand-silver">Brotherhood · Progress · Respect</p>
        </div>
        <button
          onClick={() => setComposing(!composing)}
          className="grid size-10 place-items-center rounded-full bg-brand-red text-white shadow-glow-red"
        >
          <Plus className={`size-5 transition-transform ${composing ? "rotate-45" : ""}`} />
        </button>
      </header>

      {composing && (
        <section className="px-6 mb-6">
          <div className="rounded-2xl border border-brand-red/40 bg-brand-gray p-4">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {(["update", "milestone", "transformation", "challenge"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPostType(t)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    postType === t ? "bg-brand-red text-white" : "bg-black/40 text-brand-silver"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Share a milestone, victory, or honest update..."
              className="w-full resize-none rounded-xl bg-black/40 px-4 py-3 text-sm text-white placeholder:text-brand-silver/50 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-brand-silver">{content.length}/1000</span>
              <button
                onClick={() => post.mutate()}
                disabled={post.isPending || !content.trim()}
                className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50"
              >
                <Send className="size-3" /> Post
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="px-6 space-y-4 pb-4">
        {(posts ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-brand-gray/40 p-10 text-center">
            <Heart className="mx-auto size-8 text-brand-red mb-3" />
            <p className="text-sm font-bold">The feed awaits its first warrior.</p>
            <p className="mt-1 text-xs text-brand-silver">Post a milestone to start the brotherhood.</p>
          </div>
        )}
        {(posts ?? []).map((p) => {
          const author = authors?.get(p.user_id);
          const rdata = reactionMap.get(p.id) ?? { counts: { respect: 0, salute: 0, strong_work: 0, legend: 0 }, mine: new Set<Reaction>() };
          return (
            <article key={p.id} className="rounded-2xl border border-white/5 bg-brand-gray/60 p-4">
              <header className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-red/20 text-brand-red font-bold">
                  {(author?.display_name ?? "A").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{author?.display_name ?? "Anonymous"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-brand-silver">
                    {author?.rank ?? "Initiate"} · LVL {author?.level ?? 1} · {timeAgo(p.created_at)}
                  </p>
                </div>
                <span className="chip-label text-brand-red">{p.post_type}</span>
              </header>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {REACTIONS.map((r) => {
                  const on = rdata.mine.has(r.id);
                  const count = rdata.counts[r.id];
                  return (
                    <button
                      key={r.id}
                      onClick={() => react.mutate({ postId: p.id, reaction: r.id, currentlyOn: on })}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        on
                          ? "bg-brand-red text-white shadow-glow-red"
                          : "bg-black/40 text-brand-silver hover:text-white"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.label}</span>
                      {count > 0 && <span className={on ? "text-white" : "text-brand-red"}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
