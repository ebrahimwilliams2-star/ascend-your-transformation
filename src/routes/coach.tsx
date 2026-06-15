import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/coach")({
  head: () => ({ meta: [{ title: "Ethan — ASCEND" }] }),
  component: () => <AppShell><Coach /></AppShell>,
});

type Msg = { role: "user" | "assistant"; content: string };

const SEED: Msg[] = [
  { role: "assistant", content: "I'm Ethan — your transformation coach. Tell me what you trained today, what you ate, or what's standing in your way. We build 1% at a time." },
];

function Coach() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load persisted history once per session
  useEffect(() => {
    if (!user || loadedHistory) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("ethan_messages")
        .select("role, content, created_at")
        .order("created_at", { ascending: true })
        .limit(50);
      if (cancelled) return;
      const history = (data ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      setMessages(history.length ? history : SEED);
      setLoadedHistory(true);
    })();
    return () => { cancelled = true; };
  }, [user, loadedHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming || !user) return;
    const userText = input.trim();
    const userMsg: Msg = { role: "user", content: userText };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
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
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body!.getReader();
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
          } catch { /* ignore */ }
        }
      }

      // Persist both messages once the stream completes
      if (acc) {
        await supabase.from("ethan_messages").insert([
          { user_id: user.id, role: "user", content: userText },
          { user_id: user.id, role: "assistant", content: acc },
        ]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Coach unavailable");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 p-6">
        <div className="relative grid size-10 place-items-center rounded-xl bg-brand-red shadow-glow-red">
          <Sparkles className="size-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="chip-label text-brand-red">Ethan · Online</p>
          <h1 className="text-display text-xl font-bold">Your Transformation Coach</h1>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        style={{ paddingBottom: "calc(11rem + env(safe-area-inset-bottom))" }}
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-brand-red text-white rounded-br-sm"
                : "bg-brand-gray text-white rounded-bl-sm border border-white/5"
            }`}>
              {m.content || (streaming && i === messages.length - 1 ? <span className="inline-flex gap-1"><span className="size-1.5 animate-pulse rounded-full bg-brand-red" /><span className="size-1.5 animate-pulse rounded-full bg-brand-red [animation-delay:150ms]" /><span className="size-1.5 animate-pulse rounded-full bg-brand-red [animation-delay:300ms]" /></span> : null)}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Talk to Ethan…"
            disabled={streaming}
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-brand-silver/60"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="grid size-10 place-items-center rounded-xl bg-brand-red disabled:opacity-40"
          >
            <Send className="size-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
