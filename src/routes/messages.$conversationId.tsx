import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, Send, ImagePlus, Zap, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import {
  conversationsService,
  messagesService,
  reactionsService,
  readReceiptsService,
  typingService,
  presenceService,
} from "@/services/messaging";
import type { Message, PresenceStatus } from "@/types/messaging";

export const Route = createFileRoute("/messages/$conversationId")({
  head: () => ({ meta: [{ title: "Chat — ASCEND" }] }),
  component: ChatPage,
});

const QUICK_ACTIONS = [
  { type: "workout_today", label: "Worked out today", emoji: "💪" },
  { type: "challenge_me", label: "Challenge me", emoji: "🏆" },
  { type: "respect", label: "Respect", emoji: "🫡" },
  { type: "need_accountability", label: "Need accountability", emoji: "🔥" },
  { type: "check_progress", label: "Check progress", emoji: "📊" },
  { type: "congratulations", label: "Congrats", emoji: "🎉" },
  { type: "stay_consistent", label: "Stay consistent", emoji: "⚡" },
] as const;

const REACTION_EMOJIS = ["👍", "❤️", "💪", "🔥", "😂"];

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  online: "bg-emerald-400",
  working_out: "bg-brand-red",
  away: "bg-yellow-400",
  offline: "bg-brand-silver/40",
};

function Avatar({
  url,
  name,
  className,
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls = `rounded-full object-cover ring-1 ring-brand-red/40 ${className ?? "size-10"}`;
  if (url) return <img src={url} alt={name} className={cls} />;
  return (
    <div
      className={`grid place-items-center rounded-full bg-brand-red/20 text-xs font-bold text-brand-red ring-1 ring-brand-red/40 ${className ?? "size-10"}`}
    >
      {initials || "?"}
    </div>
  );
}

function ChatPage() {
  const { conversationId } = Route.useParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ message: Message } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch conversation info + other user profile ──────────────────────────
  const { data: convInfo } = useQuery({
    queryKey: ["conversation-info", conversationId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const conv = await conversationsService.getConversation(conversationId);
      const otherId = conv.user_id_1 === user!.id ? conv.user_id_2 : conv.user_id_1;

      const [profileRes, presence] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .eq("id", otherId)
          .maybeSingle(),
        presenceService.getPresence(otherId),
      ]);

      return { conv, profile: profileRes.data, presence, otherId };
    },
  });

  // ── Initial messages fetch ────────────────────────────────────────────────
  const { isLoading: loadingMessages } = useQuery({
    queryKey: ["messages-initial", conversationId],
    enabled: !!user,
    queryFn: async () => {
      const result = await messagesService.getMessages(conversationId, 50, 0);
      setMessages(result.data);
      return result.data;
    },
  });

  // ── Mark as read on mount, update presence ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    readReceiptsService.markConversationAsRead(conversationId).catch(() => {});
    presenceService.updatePresence("online").catch(() => {});
  }, [conversationId, user]);

  // ── Auto-scroll to bottom ────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  // ── Real-time: new / updated messages ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-messages:${conversationId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== user.id) {
            readReceiptsService.markConversationAsRead(conversationId).catch(() => {});
          }
        },
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // ── Real-time: typing status ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`chat-typing:${conversationId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const users = await typingService
            .getTypingUsers(conversationId)
            .catch(() => [] as string[]);
          setIsOtherTyping(users.some((id) => id !== user.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // ── Cleanup typing on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current);
      typingService.clearTyping(conversationId).catch(() => {});
    };
  }, [conversationId]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: ({
      content,
      type = "text",
      metadata,
    }: {
      content: string;
      type?: string;
      metadata?: Record<string, any>;
    }) => messagesService.send(conversationId, content, type, metadata),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send"),
  });

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    clearTimeout(typingTimerRef.current);
    typingService.clearTyping(conversationId).catch(() => {});
    sendMutation.mutate({ content: text, type: "text" });
  }, [input, sendMutation, conversationId]);

  const handleInputChange = (value: string) => {
    setInput(value);
    // Auto-resize textarea
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    }
    // Typing indicator
    typingService.setTyping(conversationId).catch(() => {});
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingService.clearTyping(conversationId).catch(() => {});
    }, 2000);
  };

  // ── Quick actions ────────────────────────────────────────────────────────
  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    setShowQuickActions(false);
    sendMutation.mutate({
      content: `${action.label} ${action.emoji}`,
      type: "quick_action",
      metadata: {
        action_type: action.type,
        label: action.label,
        emoji: action.emoji,
      },
    });
  };

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    try {
      const { url } = await messagesService.uploadImage(conversationId, file);
      // Send via service — pass URL in metadata since the service insert covers the row
      await messagesService.send(conversationId, null, "image", {
        image_url: url,
      });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      toast.error("Failed to upload image");
    }
  };

  // ── Reactions ─────────────────────────────────────────────────────────────
  const handleReaction = async (messageId: string, emoji: string) => {
    setContextMenu(null);
    try {
      await reactionsService.add(messageId, emoji);
    } catch {}
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const startEdit = (message: Message) => {
    setEditingId(message.id);
    setEditContent(message.content ?? "");
    setContextMenu(null);
  };

  const submitEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      const updated = await messagesService.edit(editingId, editContent.trim());
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      toast.error("Failed to edit message");
    }
    setEditingId(null);
    setEditContent("");
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (messageId: string) => {
    setContextMenu(null);
    try {
      await messagesService.delete(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deleted_at: new Date().toISOString() } : m)),
      );
    } catch {
      toast.error("Failed to delete message");
    }
  };

  // ── Report ────────────────────────────────────────────────────────────────
  const handleReport = async (messageId: string) => {
    setContextMenu(null);
    try {
      await messagesService.report(messageId, "Reported by user");
      toast.success("Message reported");
    } catch {
      toast.error("Failed to report");
    }
  };

  // ── Long press / right-click ──────────────────────────────────────────────
  const openContextMenu = (message: Message) => setContextMenu({ message });

  const handleLongPressStart = (message: Message) => {
    longPressTimerRef.current = setTimeout(() => openContextMenu(message), 500);
  };
  const handleLongPressEnd = () => clearTimeout(longPressTimerRef.current);

  // ── Derived values ────────────────────────────────────────────────────────
  const profile = convInfo?.profile;
  const otherName = profile?.display_name ?? profile?.username ?? "GymBro";
  const presenceStatus: PresenceStatus =
    (convInfo?.presence?.status as PresenceStatus) ?? "offline";

  return (
    <div className="flex h-dvh flex-col bg-brand-black">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-brand-black/95 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate({ to: "/messages" })}
          className="grid size-9 place-items-center rounded-lg text-brand-silver hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Avatar url={profile?.avatar_url ?? null} name={otherName} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{otherName}</p>
          <div className="flex items-center gap-1.5">
            <div className={`size-2 rounded-full ${PRESENCE_DOT[presenceStatus]}`} />
            <p className="chip-label text-brand-silver capitalize">
              {presenceStatus.replace("_", " ")}
            </p>
          </div>
        </div>
      </header>

      {/* ── Messages list ── */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loadingMessages && (
          <div className="flex justify-center pt-8">
            <div className="size-6 animate-pulse rounded-full bg-brand-red/40" />
          </div>
        )}

        {messages.map((message) => {
          const isMe = message.sender_id === user?.id;
          const isDeleted = !!message.deleted_at;

          if (isDeleted) {
            return (
              <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <p className="px-3 py-2 text-xs italic text-brand-silver">Message deleted</p>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex max-w-[78%] flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(message);
                }}
                onTouchStart={() => handleLongPressStart(message)}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleLongPressEnd}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "rounded-br-sm bg-brand-red text-white"
                      : "rounded-bl-sm bg-brand-gray/80 text-white"
                  }`}
                >
                  {editingId === message.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitEdit()}
                        className="flex-1 bg-transparent text-sm outline-none"
                        autoFocus
                      />
                      <button
                        onClick={submitEdit}
                        className="shrink-0 text-xs opacity-70 hover:opacity-100"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="shrink-0 text-xs opacity-70 hover:opacity-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : message.message_type === "image" ? (
                    (() => {
                      const imageUrl = message.metadata?.image_url ?? message.image_url;

                      return imageUrl ? (
                        <img src={imageUrl} alt="Shared image" className="max-w-full rounded-xl" />
                      ) : (
                        <p className="text-sm text-brand-silver">Image unavailable</p>
                      );
                    })()
                  ) : [
                      "workout_share",
                      "achievement_share",
                      "reward_unlock",
                      "badge_unlock",
                      "challenge_invite",
                      "xp_milestone",
                      "streak_milestone",
                    ].includes(message.message_type) ? (
                    <div className="space-y-1">
                      <p className="chip-label text-white/70">
                        {message.message_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm">{message.content}</p>
                      {message.metadata && Object.keys(message.metadata).length > 0 && (
                        <p className="text-xs text-white/50">{JSON.stringify(message.metadata)}</p>
                      )}
                    </div>
                  ) : message.message_type === "system_notification" ? (
                    <p className="text-xs italic text-brand-silver">{message.content}</p>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>

                {message.edited_at && <p className="px-1 text-[10px] text-brand-silver">edited</p>}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-brand-gray/80 px-4 py-3">
              <div className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-brand-silver [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-brand-silver [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-brand-silver [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div
        className="border-t border-white/5 bg-brand-black/95 px-4 py-3"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gray/60 text-brand-silver hover:text-white"
            aria-label="Attach image"
          >
            <ImagePlus className="size-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => setShowQuickActions(true)}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gray/60 text-brand-silver hover:text-white"
            aria-label="Quick actions"
          >
            <Zap className="size-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Say something…"
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-white/10 bg-brand-gray/60 px-4 py-2.5 text-sm placeholder:text-brand-silver/60 focus:border-brand-red focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-red text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Quick Actions sheet ── */}
      {showQuickActions && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
          onClick={() => setShowQuickActions(false)}
        >
          <div
            className="rounded-t-2xl border-t border-white/10 bg-brand-black p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="chip-label text-brand-red">Quick Actions</p>
              <button onClick={() => setShowQuickActions(false)}>
                <X className="size-4 text-brand-silver" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.type}
                  onClick={() => handleQuickAction(action)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-brand-gray/60 px-3 py-2.5 text-left hover:border-brand-red/40"
                >
                  <span className="text-lg">{action.emoji}</span>
                  <span className="text-xs font-bold">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Context menu ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="rounded-t-2xl border-t border-white/10 bg-brand-black p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reaction row */}
            <div className="mb-4 flex justify-around">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(contextMenu.message.id, emoji)}
                  className="text-2xl transition-transform hover:scale-125 active:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {contextMenu.message.sender_id === user?.id ? (
                <>
                  <button
                    onClick={() => startEdit(contextMenu.message)}
                    className="w-full rounded-xl bg-brand-gray/60 py-3 text-sm font-bold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contextMenu.message.id)}
                    className="w-full rounded-xl bg-brand-red/10 py-3 text-sm font-bold text-brand-red"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleReport(contextMenu.message.id)}
                  className="w-full rounded-xl bg-brand-gray/60 py-3 text-sm font-bold"
                >
                  Report
                </button>
              )}
              <button
                onClick={() => setContextMenu(null)}
                className="w-full rounded-xl border border-white/10 py-3 text-sm text-brand-silver"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
