import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { ChevronLeft, Users, Plus, Copy, LogOut, Crown, Trophy, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/squads")({
  head: () => ({ meta: [{ title: "Squads — ASCEND" }] }),
  component: () => <AppShell><Squads /></AppShell>,
});


function Squads() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "create" | "join">("list");
  const [activeSquadId, setActiveSquadId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const { data: myMemberships } = useQuery({
    queryKey: ["my-squads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("squad_members")
        .select("squad_id, role")
        .eq("user_id", user!.id);
      if (!members?.length) return [];
      const ids = members.map((m) => m.squad_id);
      const { data: squads } = await supabase.from("squads").select("*").in("id", ids);
      return (squads ?? []).map((s) => ({
        ...s,
        role: members.find((m) => m.squad_id === s.id)?.role ?? "member",
      }));
    },
  });

  const createSquad = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name your squad");
      const { data, error } = await supabase.rpc("create_squad", {
        _name: name.trim(),
        _description: desc.trim() || "",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Failed to create squad");
      return row as { id: string; name: string; description: string | null; join_code: string };
    },
    onSuccess: (s) => {
      toast.success(`Squad "${s.name}" forged. Code: ${s.join_code}`);
      setName(""); setDesc(""); setView("list");
      qc.invalidateQueries({ queryKey: ["my-squads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const joinSquad = useMutation({
    mutationFn: async () => {
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Enter a code");
      const { data, error } = await supabase.rpc("join_squad_by_code", { _code: code });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("No squad found with that code");
      return row as { squad_id: string; name: string };
    },
    onSuccess: (s) => {
      toast.success(`Joined "${s.name}".`);
      setJoinCode(""); setView("list");
      qc.invalidateQueries({ queryKey: ["my-squads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (activeSquadId) {
    return <SquadDetail squadId={activeSquadId} onBack={() => setActiveSquadId(null)} />;
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <Link to="/dash" className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="text-center">
          <p className="chip-label text-brand-red">Squads</p>
          <p className="text-[10px] uppercase tracking-widest text-brand-silver">Brotherhood · Accountability</p>
        </div>
        <div className="size-10" />
      </header>

      {view === "list" && (
        <>
          <section className="px-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setView("create")}
              className="rounded-2xl border border-brand-red/40 bg-brand-red/10 p-5 text-left transition-all hover:shadow-glow-red"
            >
              <Plus className="size-5 text-brand-red" />
              <p className="mt-2 text-sm font-bold">Forge Squad</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-brand-silver">Create a new group</p>
            </button>
            <button
              onClick={() => setView("join")}
              className="rounded-2xl border border-white/10 bg-brand-gray/60 p-5 text-left transition-colors hover:bg-brand-gray"
            >
              <Users className="size-5 text-brand-red" />
              <p className="mt-2 text-sm font-bold">Join Squad</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-brand-silver">Enter a code</p>
            </button>
          </section>

          <section className="px-6 mt-6">
            <h3 className="chip-label text-brand-silver mb-3">Your Squads</h3>
            {!myMemberships?.length && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-brand-gray/40 p-10 text-center">
                <Users className="mx-auto size-8 text-brand-red mb-3" />
                <p className="text-sm font-bold">No squads yet.</p>
                <p className="mt-1 text-xs text-brand-silver">Forge one or join with a code.</p>
              </div>
            )}
            <div className="space-y-2.5">
              {(myMemberships ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSquadId(s.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-brand-gray/60 p-4 text-left transition-colors hover:bg-brand-gray"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{s.name}</p>
                      {s.role === "owner" && <Crown className="size-3 text-brand-red" />}
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-widest text-brand-silver">{s.role === "owner" ? "Owner" : "Member"}</p>
                  </div>
                  <span className="chip-label text-brand-red">Open →</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {view === "create" && (
        <section className="px-6">
          <div className="rounded-2xl border border-brand-red/40 bg-brand-gray p-5">
            <p className="chip-label text-brand-red">Forge Squad</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Squad name"
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Purpose (optional)"
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setView("list")} className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-brand-silver">Cancel</button>
              <button
                onClick={() => createSquad.mutate()}
                disabled={createSquad.isPending}
                className="flex-1 rounded-lg bg-brand-red px-4 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50"
              >Forge</button>
            </div>
          </div>
        </section>
      )}

      {view === "join" && (
        <section className="px-6">
          <div className="rounded-2xl border border-white/10 bg-brand-gray p-5">
            <p className="chip-label text-brand-red">Join Squad</p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center font-mono text-2xl uppercase tracking-widest text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setView("list")} className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-brand-silver">Cancel</button>
              <button
                onClick={() => joinSquad.mutate()}
                disabled={joinSquad.isPending}
                className="flex-1 rounded-lg bg-brand-red px-4 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50"
              >Join</button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function SquadDetail({ squadId, onBack }: { squadId: string; onBack: () => void }) {
  const { user } = useUser();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const { data: squad } = useQuery({
    queryKey: ["squad", squadId],
    queryFn: async () => {
      const { data } = await supabase.from("squads").select("*").eq("id", squadId).maybeSingle();
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["squad-members", squadId],
    queryFn: async () => {
      const { data: ms } = await supabase.from("squad_members").select("user_id, role").eq("squad_id", squadId);
      if (!ms?.length) return [];
      const ids = ms.map((m) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username, rank, level, xp, current_streak, longest_streak")
        .in("id", ids);
      return (profs ?? []).map((p) => ({
        ...p,
        role: ms.find((m) => m.user_id === p.id)?.role ?? "member",
      })).sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0));
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["squad-posts", squadId],
    queryFn: async () => {
      const { data } = await supabase.from("squad_posts").select("*").eq("squad_id", squadId)
        .order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const sendPost = useMutation({
    mutationFn: async () => {
      if (!content.trim()) return;
      const { error } = await supabase.from("squad_posts").insert({
        squad_id: squadId,
        user_id: user!.id,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["squad-posts", squadId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("squad_members").delete()
        .eq("squad_id", squadId).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Left squad.");
      qc.invalidateQueries({ queryKey: ["my-squads"] });
      onBack();
    },
  });

  const copyCode = () => {
    if (squad?.join_code) {
      navigator.clipboard.writeText(squad.join_code);
      toast.success("Code copied.");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <button onClick={onBack} className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white">
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center min-w-0 px-3">
          <p className="chip-label text-brand-red truncate">{squad?.name}</p>
          <button onClick={copyCode} className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-brand-silver hover:text-white">
            <Copy className="size-3" /> {squad?.join_code}
          </button>
        </div>
        <button
          onClick={() => { if (confirm("Leave this squad?")) leave.mutate(); }}
          className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-brand-red"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      <section className="px-6">
        <h3 className="chip-label text-brand-silver mb-3 flex items-center gap-2">
          <Trophy className="size-3 text-brand-red" /> Squad Leaderboard
        </h3>
        <div className="space-y-2">
          {(members ?? []).map((m, i) => (
            <div key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 ${i === 0 ? "border-brand-red/40 bg-brand-red/5" : "border-white/5 bg-brand-gray/60"}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-full font-bold text-xs ${i === 0 ? "bg-brand-red text-white" : "bg-black/40 text-brand-silver"}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold">{m.display_name ?? "Athlete"}</p>
                  {m.role === "owner" && <Crown className="size-3 shrink-0 text-brand-red" />}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-brand-silver">
                  {m.rank ?? "Initiate"} · LVL {m.level ?? 1}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-red">{(m.xp ?? 0).toLocaleString()} XP</p>
                <p className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-widest text-brand-silver">
                  <Flame className="size-3" /> {m.current_streak ?? 0}d
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 mt-6">
        <h3 className="chip-label text-brand-silver mb-3">Squad Feed</h3>
        <div className="rounded-xl border border-white/5 bg-brand-gray/60 p-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Update your squad..."
            className="w-full resize-none bg-transparent text-sm text-white placeholder:text-brand-silver/50 focus:outline-none"
          />
          <button
            onClick={() => sendPost.mutate()}
            disabled={!content.trim() || sendPost.isPending}
            className="mt-2 w-full rounded-lg bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50"
          >Post</button>
        </div>

        <div className="mt-3 space-y-2">
          {(posts ?? []).map((p) => {
            const author = members?.find((m) => m.id === p.user_id);
            return (
              <div key={p.id} className="rounded-xl border border-white/5 bg-brand-gray/40 p-3">
                <p className="text-[10px] uppercase tracking-widest text-brand-silver">
                  {author?.display_name ?? "Member"} · {new Date(p.created_at).toLocaleString()}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{p.content}</p>
              </div>
            );
          })}
        </div>
      </section>
      <div className="h-4" />
    </>
  );
}
