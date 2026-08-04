import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/lib/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brain, Pencil, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/motion";
import { useServerFn } from "@tanstack/react-start";
import {
  compressEthanHistory,
  extractEthanMemories,
} from "@/lib/ethan-memory.functions";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Ethan — ASCEND" },
      {
        name: "description",
        content:
          "Ethan is your AI GymBro — he remembers your goals, streaks and setbacks across every session.",
      },
      { property: "og:title", content: "Ethan — ASCEND" },
      {
        property: "og:description",
        content: "Your AI GymBro with long-term memory of your transformation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <Coach />
    </AppShell>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };

type Memory = {
  id: string;
  category: string;
  content: string;
  importance: number;
  created_at: string;
};

const SEED: Msg[] = [
  {
    role: "assistant",
    content: "Hey! What's good? You training today or is this a rest day? Either way I'm here 💪",
  },
];

function Coach() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rememberFn = useServerFn(extractEthanMemories);
  const compressFn = useServerFn(compressEthanHistory);

  // Load persisted (non-archived) history once per session
  useEffect(() => {
    if (!user || loadedHistory) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ethan_messages")
        .select("role, content, created_at")
        .eq("archived", false)
        .order("created_at", { ascending: true })
        .limit(80);
      if (cancelled) return;
      const history = (data ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      setMessages(history.length ? history : SEED);
      setLoadedHistory(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
  }, [streaming, loadedHistory]);

  const send = async () => {
    if (!input.trim() || streaming || !user) return;
    const userText = input.trim();
    haptic("light");
    const userMsg: Msg = { role: "user", content: userText };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sign in to talk to Ethan.");
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: next.slice(-24).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }

      if (!res.body) {
        throw new Error("No response body received from AI coach service");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            /* ignore */
          }
        }
      }

      // Persist both messages once the stream completes
      if (acc) {
        await supabase.from("ethan_messages").insert([
          { user_id: user.id, role: "user", content: userText },
          { user_id: user.id, role: "assistant", content: acc },
        ]);

        // Background memory work — never blocks the chat UI.
        void rememberFn({ data: { userText, assistantText: acc } }).catch(() => {});
        void compressFn({}).catch(() => {});
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coach unavailable");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const clearConversation = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from("ethan_messages").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't clear the conversation");
      return;
    }
    await supabase.from("ethan_memory_summaries").delete().eq("user_id", user.id);
    setMessages(SEED);
    haptic("medium");
    toast.success("Conversation cleared — memories kept");
  }, [user]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 p-6">
        <div className="relative grid size-10 place-items-center rounded-xl bg-brand-red shadow-glow-red">
          <Sparkles className={`size-5 text-white ${streaming ? "animate-pop [animation-iteration-count:infinite] [animation-duration:1.4s]" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="chip-label text-brand-red">Ethan · Your GymBro</p>
          <h1 className="text-display text-xl font-bold">Ethan</h1>
        </div>
        <button
          onClick={() => {
            haptic("light");
            setMemoryOpen(true);
          }}
          aria-label="Ethan's memory"
          className="tap grid size-10 place-items-center rounded-xl border border-white/10 bg-brand-gray"
        >
          <Brain className="size-4 text-brand-silver" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        style={{ paddingBottom: "calc(11rem + env(safe-area-inset-bottom))" }}
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] animate-bubble-in rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-red text-white rounded-br-sm"
                  : "bg-brand-gray text-white rounded-bl-sm border border-white/5"
              }`}
            >
              {m.content ||
                (streaming && i === messages.length - 1 ? (
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 animate-pop rounded-full bg-brand-red [animation-iteration-count:infinite] [animation-duration:1s]" />
                    <span className="size-1.5 animate-pop rounded-full bg-brand-red [animation-iteration-count:infinite] [animation-duration:1s] [animation-delay:150ms]" />
                    <span className="size-1.5 animate-pop rounded-full bg-brand-red [animation-iteration-count:infinite] [animation-duration:1s] [animation-delay:300ms]" />
                  </span>
                ) : null)}
            </div>
          </div>
        ))}
      </div>

      <div
        className="fixed left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4"
        style={{ bottom: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-brand-gray/95 p-2 backdrop-blur-xl">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 2000))}
            maxLength={2000}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Talk to Ethan…"
            disabled={streaming}
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-brand-silver/60"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="tap grid size-10 place-items-center rounded-xl bg-brand-red disabled:opacity-40"
          >
            <Send className="size-4 text-white" />
          </button>
        </div>
      </div>

      {memoryOpen && (
        <MemorySheet
          onClose={() => setMemoryOpen(false)}
          onClearConversation={clearConversation}
          userId={user?.id ?? null}
        />
      )}
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  personal: "Personal",
  goal: "Goal",
  preference: "Preference",
  event: "Milestone",
  training: "Training",
  nutrition: "Nutrition",
  injury: "Injury",
};

function MemorySheet({
  onClose,
  onClearConversation,
  userId,
}: {
  onClose: () => void;
  onClearConversation: () => Promise<void>;
  userId: string | null;
}) {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("ethan_memories")
      .select("id, category, content, importance, created_at")
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load memories");
      setMemories([]);
      return;
    }
    setMemories((data ?? []) as Memory[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("ethan_memories").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete that memory");
      return;
    }
    haptic("light");
    setMemories((m) => (m ?? []).filter((x) => x.id !== id));
  };

  const saveEdit = async (id: string) => {
    const content = draft.trim().slice(0, 400);
    if (!content) return;
    const { error } = await supabase.from("ethan_memories").update({ content }).eq("id", id);
    if (error) {
      toast.error("Couldn't save that memory");
      return;
    }
    setMemories((m) => (m ?? []).map((x) => (x.id === id ? { ...x, content } : x)));
    setEditingId(null);
    toast.success("Memory updated");
  };

  const clearAllMemories = async () => {
    if (!userId) return;
    const { error } = await supabase.from("ethan_memories").delete().eq("user_id", userId);
    if (error) {
      toast.error("Couldn't clear memories");
      return;
    }
    haptic("medium");
    setMemories([]);
    toast.success("All memories cleared — chat history kept");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-brand-gray p-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <Brain className="size-5 text-brand-red" />
          <div className="min-w-0 flex-1">
            <p className="chip-label text-brand-red">Long-term memory</p>
            <h2 className="text-display text-lg font-bold">What Ethan remembers</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="tap grid size-9 place-items-center rounded-xl border border-white/10">
            <X className="size-4 text-brand-silver" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {memories === null && <p className="text-sm text-brand-silver">Loading…</p>}
          {memories?.length === 0 && (
            <p className="text-sm text-brand-silver">
              Nothing saved yet. Tell Ethan about your goals, injuries or how you like being coached
              and he'll hold onto it.
            </p>
          )}
          {memories?.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/5 bg-black/30 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="chip-label text-brand-silver">
                    {CATEGORY_LABEL[m.category] ?? m.category}
                  </p>
                  {editingId === m.id ? (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, 400))}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-2 text-sm focus:outline-none"
                    />
                  ) : (
                    <p className="mt-0.5 text-sm leading-relaxed">{m.content}</p>
                  )}
                </div>
                {editingId === m.id ? (
                  <button
                    onClick={() => saveEdit(m.id)}
                    className="tap rounded-xl bg-brand-red px-3 py-1.5 text-xs font-bold"
                  >
                    Save
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setDraft(m.content);
                      }}
                      aria-label="Edit memory"
                      className="tap grid size-8 place-items-center rounded-xl border border-white/10"
                    >
                      <Pencil className="size-3.5 text-brand-silver" />
                    </button>
                    <button
                      onClick={() => remove(m.id)}
                      aria-label="Delete memory"
                      className="tap grid size-8 place-items-center rounded-xl border border-white/10"
                    >
                      <Trash2 className="size-3.5 text-brand-red" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => void onClearConversation().then(onClose)}
            className="tap w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-brand-silver"
          >
            Clear conversation history
          </button>
          <button
            onClick={() => void clearAllMemories()}
            className="tap w-full rounded-2xl border border-brand-red/40 py-3 text-sm font-bold text-brand-red"
          >
            Clear all memories
          </button>
          <p className="pt-1 text-center text-xs text-brand-silver/70">
            Conversation history and memories are separate — clearing one keeps the other.
          </p>
        </div>
      </div>
    </div>
  );
}
