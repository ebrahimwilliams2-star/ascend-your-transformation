import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { conversationsService, messagesService } from "@/services/messaging";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — ASCEND" }] }),
  component: () => (
    <AppShell>
      <MessagesPage />
    </AppShell>
  ),
});

function formatTime(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return "Yesterday";
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ url, name, className }: { url: string | null; name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url)
    return (
      <img
        src={url}
        alt={name}
        className={`rounded-full object-cover ring-1 ring-brand-red/40 ${className ?? "size-12"}`}
      />
    );
  return (
    <div
      className={`grid place-items-center rounded-full bg-brand-red/20 text-sm font-bold text-brand-red ring-1 ring-brand-red/40 ${className ?? "size-12"}`}
    >
      {initials || "?"}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-white/5 bg-brand-gray/40 p-4">
      <div className="size-12 rounded-full bg-brand-gray/60" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-brand-gray/60" />
        <div className="h-3 w-48 rounded bg-brand-gray/60" />
      </div>
    </div>
  );
}

function MessagesPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const result = await conversationsService.getConversations();

      return Promise.all(
        result.data.map(async (conv) => {
          const otherId =
            conv.user_id_1 === user!.id ? conv.user_id_2 : conv.user_id_1;

          const [profileRes, lastMsgRes, memberRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, display_name, username, full_name, avatar_url")
              .eq("id", otherId)
              .maybeSingle(),
            messagesService.getMessages(conv.id, 1, 0),
            (supabase as any)
              .from("conversation_members")
              .select("unread_count")
              .eq("conversation_id", conv.id)
              .eq("user_id", user!.id)
              .maybeSingle(),
          ]);

          return {
            conv,
            profile: profileRes.data,
            lastMessage: lastMsgRes.data[0] ?? null,
            unreadCount: (memberRes.data as any)?.unread_count ?? 0,
          };
        })
      );
    },
  });

  return (
    <>
      <header className="sticky top-0 z-30 bg-brand-black/80 p-6 backdrop-blur-md">
        <p className="chip-label text-brand-red">Your Circle</p>
        <h1 className="text-display mt-0.5 text-2xl font-bold">Messages</h1>
      </header>

      <section className="space-y-2 px-4 pb-6">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

        {!isLoading && conversations.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <MessageCircle className="size-12 text-brand-silver/40" />
            <p className="text-sm font-bold">No conversations yet</p>
            <p className="text-xs text-brand-silver">
              Message a GymBro to get started
            </p>
          </div>
        )}

        {conversations.map(({ conv, profile, lastMessage, unreadCount }) => {
          const name =
            profile?.display_name ??
            profile?.username ??
            profile?.full_name ??
            "Unknown";
          const rawContent = lastMessage?.content ?? "";
          const preview = lastMessage
            ? rawContent.slice(0, 40) + (rawContent.length > 40 ? "…" : "")
            : "Start a conversation";

          return (
            <button
              key={conv.id}
              onClick={() =>
                navigate({
                  to: "/messages/$conversationId",
                  params: { conversationId: conv.id },
                })
              }
              className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-brand-gray/40 p-4 text-left transition-colors hover:border-white/10"
            >
              <div className="relative shrink-0">
                <Avatar
                  url={profile?.avatar_url ?? null}
                  name={name}
                  className="size-12"
                />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-red text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold">{name}</p>
                  <p className="ml-2 shrink-0 chip-label text-brand-silver">
                    {formatTime(conv.last_message_at)}
                  </p>
                </div>
                <p
                  className={`mt-0.5 truncate text-xs ${
                    unreadCount > 0
                      ? "font-medium text-white/80"
                      : "text-brand-silver"
                  }`}
                >
                  {preview}
                </p>
              </div>
            </button>
          );
        })}
      </section>
    </>
  );
}
