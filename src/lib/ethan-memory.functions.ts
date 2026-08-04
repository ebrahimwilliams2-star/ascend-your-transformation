import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = [
  "personal",
  "goal",
  "preference",
  "event",
  "training",
  "nutrition",
  "injury",
] as const;

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

/** Number of un-archived messages allowed before we compress the oldest ones. */
const ACTIVE_MESSAGE_LIMIT = 40;
/** How many of the newest messages stay verbatim after a compression pass. */
const KEEP_RECENT = 16;

async function askModel(prompt: string, system: string): Promise<string | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? null;
}

function parseJsonBlock(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const EXTRACT_SYSTEM = `You maintain the long-term memory of a fitness coach called Ethan.
You decide whether the latest exchange contains information worth remembering for months or years.

REMEMBER: preferred name, gym experience, training style, favourite/disliked exercises, goals (fat loss, muscle, powerlifting, marathon, competition prep, target lifts/weights with numbers and dates), coaching preferences (short replies, humour, technical detail, motivation style), schedule preferences, injuries, PRs, milestones, habit changes, equipment access, dietary restrictions.

DO NOT REMEMBER: greetings, small talk, temporary moods, one-off jokes, "I'm tired today", generic questions, anything already covered by the existing memories, anything Ethan said about himself.

Return STRICT JSON only:
{"memories":[{"category":"personal|goal|preference|event|training|nutrition|injury","content":"one short third-person fact about the user","importance":1-5}]}
Return {"memories":[]} when nothing is worth keeping. Never return more than 3 memories. Each content string must be under 200 characters, self-contained, and written like "Wants to bench 140kg before December".`;

export const extractEthanMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userText: z.string().min(1).max(4000),
      assistantText: z.string().max(6000).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("ethan_memories")
      .select("content")
      .order("importance", { ascending: false })
      .limit(60);

    const known = (existing ?? []).map((m) => `- ${m.content}`).join("\n") || "(none yet)";

    const raw = await askModel(
      `EXISTING MEMORIES:\n${known}\n\nLATEST EXCHANGE:\nUser: ${data.userText}\nEthan: ${data.assistantText}`,
      EXTRACT_SYSTEM,
    );
    if (!raw) return { saved: 0 };

    const parsed = parseJsonBlock(raw);
    const shape = z
      .object({
        memories: z
          .array(
            z.object({
              category: z.enum(CATEGORIES).catch("personal"),
              content: z.string().min(3).max(400),
              importance: z.coerce.number().int().min(1).max(5).catch(3),
            }),
          )
          .max(3),
      })
      .safeParse(parsed);

    if (!shape.success || shape.data.memories.length === 0) return { saved: 0 };

    const rows = shape.data.memories.map((m) => ({
      user_id: userId,
      category: m.category,
      content: m.content.trim().slice(0, 400),
      importance: m.importance,
      source: "chat",
    }));

    let saved = 0;
    for (const row of rows) {
      const { error } = await supabase.from("ethan_memories").insert(row);
      // Duplicate content (unique index) is expected and fine.
      if (!error) saved += 1;
      else if (error.code !== "23505") console.error("[ethan-memory] insert failed", error);
    }

    return { saved };
  });

const SUMMARY_SYSTEM = `You compress a coaching conversation into durable context for a fitness coach called Ethan.
Write a factual third-person summary of the user's situation, goals, training, setbacks, and what was last discussed.
Keep it under 200 words. No greetings, no advice, no formatting — plain prose only.`;

/**
 * Compresses older chat turns into a rolling summary and archives them, so the
 * live context stays small no matter how long the relationship runs.
 */
export const compressEthanHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: active } = await supabase
      .from("ethan_messages")
      .select("id, role, content, created_at")
      .eq("archived", false)
      .order("created_at", { ascending: true });

    const rows = active ?? [];
    if (rows.length <= ACTIVE_MESSAGE_LIMIT) return { compressed: 0 };

    const toArchive = rows.slice(0, rows.length - KEEP_RECENT);
    if (toArchive.length === 0) return { compressed: 0 };

    const { data: prior } = await supabase
      .from("ethan_memory_summaries")
      .select("summary, message_count")
      .maybeSingle();

    const transcript = toArchive
      .map((m) => `${m.role === "user" ? "User" : "Ethan"}: ${m.content}`)
      .join("\n")
      .slice(0, 24000);

    const summary = await askModel(
      `PREVIOUS SUMMARY:\n${prior?.summary ?? "(none)"}\n\nNEW TRANSCRIPT TO FOLD IN:\n${transcript}`,
      SUMMARY_SYSTEM,
    );
    if (!summary) return { compressed: 0 };

    const lastAt = toArchive[toArchive.length - 1]?.created_at ?? new Date().toISOString();

    const { error: upsertError } = await supabase.from("ethan_memory_summaries").upsert(
      {
        user_id: userId,
        summary: summary.trim().slice(0, 4000),
        key_facts: {},
        message_count: (prior?.message_count ?? 0) + toArchive.length,
        covered_through: lastAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upsertError) {
      console.error("[ethan-memory] summary upsert failed", upsertError);
      return { compressed: 0 };
    }

    const { error: archiveError } = await supabase
      .from("ethan_messages")
      .update({ archived: true })
      .in(
        "id",
        toArchive.map((m) => m.id),
      );
    if (archiveError) {
      console.error("[ethan-memory] archive failed", archiveError);
      return { compressed: 0 };
    }

    return { compressed: toArchive.length };
  });
