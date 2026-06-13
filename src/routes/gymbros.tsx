import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Search, UserPlus, X, Trophy, Flame, Crown, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/gymbros")({
  head: () => ({ meta: [{ title: "Gymbros — ASCEND" }] }),
  component: () => (
    <AppShell>
      <Gymbros />
    </AppShell>
  ),
});

type Bro = {
  friendship_id: string;
  friend_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  rank: string;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  status: "pending" | "accepted";
  direction: "friend" | "incoming" | "outgoing";
};

type SearchHit = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  rank: string;
  level: number;
};

function Gymbros() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: me } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: bros = [] } = useQuery({
    queryKey: ["gymbros"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gymbros");
      if (error) throw error;
      return (data ?? []) as Bro[];
    },
  });

  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ["search_profiles", query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_profiles", { q: query.trim() });
      if (error) throw error;
      return (data ?? []) as SearchHit[];
    },
  });

  const sendRequest = useMutation({
    mutationFn: async (addressee_id: string) => {
      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: user!.id, addressee_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request sent");
      qc.invalidateQueries({ queryKey: ["gymbros"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "accepted" : "declined" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gymbros"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["gymbros"] });
    },
  });

  const nudge = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.rpc("send_nudge", {
        _friend_id: friendId,
        _message: "Get the session in. Don't break the chain.",
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Nudge sent. Iron sharpens iron."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't nudge"),
  });

  const friends = bros.filter((b) => b.direction === "friend");
  const incoming = bros.filter((b) => b.direction === "incoming");
  const outgoing = bros.filter((b) => b.direction === "outgoing");
  const linkedIds = new Set(bros.map((b) => b.friend_id));

  const myLevel = me?.level ?? 1;
  const myXp = me?.xp ?? 0;

  // Leaderboard combining self + friends
  const board = [
    ...(me
      ? [{
          friend_id: me.id,
          display_name: me.display_name ?? "You",
          username: me.username,
          avatar_url: me.avatar_url,
          rank: me.rank,
          level: me.level,
          xp: me.xp,
          current_streak: me.current_streak,
          isMe: true,
        }]
      : []),
    ...friends.map((f) => ({ ...f, isMe: false })),
  ].sort((a, b) => b.xp - a.xp);

  const firstName = (me?.display_name ?? "").split(" ")[0] || "Athlete";

  return (
    <>
      <header className="sticky top-0 z-30 p-6 backdrop-blur-md bg-brand-black/80">
        <p className="chip-label text-brand-red">Your Circle</p>
        <h1 className="text-display text-2xl font-bold mt-0.5">Gymbros</h1>
        <p className="text-xs text-brand-silver mt-1 italic">
          {firstName}, iron sharpens iron. Pick your circle wisely.
        </p>
      </header>

      {/* Search */}
      <section className="px-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-silver" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a brother by name…"
            className="w-full rounded-xl border border-white/10 bg-brand-gray/60 py-3 pl-10 pr-4 text-sm placeholder:text-brand-silver/60 focus:border-brand-red focus:outline-none"
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {searching && <p className="chip-label text-brand-silver">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="chip-label text-brand-silver">No athletes found.</p>
            )}
            {results.map((r) => {
              const linked = linkedIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-brand-gray/60 p-3"
                >
                  <Avatar url={r.avatar_url} name={r.display_name ?? r.username ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{r.display_name ?? r.username}</p>
                    <p className="chip-label text-brand-silver">
                      {r.rank} · LVL {r.level}
                    </p>
                  </div>
                  <button
                    disabled={linked || sendRequest.isPending}
                    onClick={() => sendRequest.mutate(r.id)}
                    className="grid size-9 place-items-center rounded-lg bg-brand-red text-white disabled:bg-brand-gray disabled:text-brand-silver"
                  >
                    <UserPlus className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Incoming */}
      {incoming.length > 0 && (
        <section className="px-6 mb-6">
          <h3 className="chip-label text-brand-silver mb-3">Pending Invites</h3>
          <div className="space-y-2">
            {incoming.map((b) => (
              <div
                key={b.friendship_id}
                className="flex items-center gap-3 rounded-xl border border-brand-red/30 bg-brand-red/5 p-3"
              >
                <Avatar url={b.avatar_url} name={b.display_name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{b.display_name ?? b.username}</p>
                  <p className="chip-label text-brand-silver">
                    {b.rank} · LVL {b.level} · wants in
                  </p>
                </div>
                <button
                  onClick={() => respond.mutate({ id: b.friendship_id, accept: true })}
                  className="grid size-9 place-items-center rounded-lg bg-brand-red text-white"
                >
                  <Check className="size-4" />
                </button>
                <button
                  onClick={() => respond.mutate({ id: b.friendship_id, accept: false })}
                  className="grid size-9 place-items-center rounded-lg border border-white/10 text-brand-silver"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard */}
      <section className="px-6 mb-6">
        <div className="mb-3 flex items-end justify-between">
          <h3 className="chip-label text-brand-silver">Leaderboard</h3>
          <span className="chip-label text-brand-red">{board.length} athletes</span>
        </div>

        {friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-brand-gray/30 p-6 text-center">
            <Trophy className="mx-auto size-6 text-brand-red" />
            <p className="mt-2 text-sm font-bold">No bros yet</p>
            <p className="mt-1 text-xs text-brand-silver">
              Find athletes above to start your accountability circle.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-brand-gray/60">
            {board.map((row, i) => {
              const pos = i + 1;
              const diff = row.isMe ? 0 : row.level - myLevel;
              return (
                <div
                  key={row.friend_id}
                  className={`flex items-center gap-3 border-b border-white/5 p-3 last:border-b-0 ${
                    row.isMe ? "bg-brand-red/10" : ""
                  }`}
                >
                  <div className="w-6 text-center">
                    {pos === 1 ? (
                      <Crown className="mx-auto size-4 text-brand-red" />
                    ) : (
                      <span className="chip-label text-brand-silver">#{pos}</span>
                    )}
                  </div>
                  <Avatar url={row.avatar_url} name={row.display_name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {row.display_name ?? row.username}
                      {row.isMe && <span className="ml-2 text-brand-red">· you</span>}
                    </p>
                    <p className="chip-label text-brand-silver">
                      {row.rank} · {row.xp.toLocaleString()} XP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">LVL {row.level}</p>
                    {!row.isMe && (
                      <p
                        className={`chip-label ${
                          diff > 0
                            ? "text-brand-red"
                            : diff < 0
                            ? "text-emerald-400"
                            : "text-brand-silver"
                        }`}
                      >
                        {diff > 0 ? `+${diff} ahead` : diff < 0 ? `${diff} behind` : "even"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {friends.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {friends.map((b) => (
              <div
                key={`streak-${b.friendship_id}`}
                className="rounded-xl border border-white/5 bg-brand-gray/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-brand-red" />
                  <p className="chip-label text-brand-silver truncate">
                    {b.display_name?.split(" ")[0] ?? b.username}
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold">
                  {b.current_streak}
                  <span className="ml-1 text-xs text-brand-silver">day streak</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => nudge.mutate(b.friend_id)}
                    disabled={nudge.isPending}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-red/15 px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-red hover:bg-brand-red/25 disabled:opacity-50"
                  >
                    <Zap className="size-3" /> Nudge
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${b.display_name ?? "this bro"}?`)) {
                        remove.mutate(b.friendship_id);
                      }
                    }}
                    className="chip-label text-brand-silver hover:text-brand-red"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing */}
      {outgoing.length > 0 && (
        <section className="px-6 mb-6">
          <h3 className="chip-label text-brand-silver mb-3">Sent Invites</h3>
          <div className="space-y-2">
            {outgoing.map((b) => (
              <div
                key={b.friendship_id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-brand-gray/40 p-3"
              >
                <Avatar url={b.avatar_url} name={b.display_name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{b.display_name ?? b.username}</p>
                  <p className="chip-label text-brand-silver">Awaiting response…</p>
                </div>
                <button
                  onClick={() => remove.mutate(b.friendship_id)}
                  className="chip-label text-brand-silver"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-6 pb-4">
        <p className="text-center text-[10px] uppercase tracking-widest text-brand-silver">
          You at {myXp.toLocaleString()} XP · keep climbing
        </p>
      </section>
    </>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="size-10 rounded-full object-cover ring-1 ring-brand-red/40"
      />
    );
  }
  return (
    <div className="grid size-10 place-items-center rounded-full bg-brand-red/20 text-xs font-bold text-brand-red ring-1 ring-brand-red/40">
      {initials || "?"}
    </div>
  );
}
