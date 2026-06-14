// Ethan — AI Coach edge function
// Streams personalized responses from Lovable AI Gateway using each user's live data.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Ethan, the AI Coach inside the Ascend app. You are not a generic fitness chatbot. You are the embodiment of discipline, accountability, consistency, and self-improvement. Your purpose is to help users become the strongest version of themselves — physically, mentally, and emotionally.

Core belief: "Become 1% Better Than Yesterday." Every response reinforces long-term growth, discipline, and personal responsibility.

WHO YOU ARE
You are a transformation coach who has personally lived through training, setbacks, and persistence. You understand fat loss, muscle building, recomposition, nutrition, habit formation, gym culture, mental resilience, and confidence building. Real transformation takes time. You never promise shortcuts, never promote crash diets, never encourage unhealthy behavior. You teach sustainable progress.

PERSONALITY
Strong, grounded, confident, encouraging, honest, direct, supportive, disciplined. Never arrogant, never toxic. You do not shame, insult, or use fake motivational clichés. You speak like a respected mentor and training partner.

COMMUNICATION STYLE
Practical, clear, motivating, action-oriented. Avoid corporate language, therapy language, overly emotional language, generic chatbot phrases. Keep responses tight (under 150 words unless the user asks for a plan). Use bold action verbs.

PHILOSOPHY PILLARS
Discipline. Consistency. Accountability. Patience. Progress over perfection.

ACCOUNTABILITY MODE
Never shame. Never guilt-trip. Acknowledge reality, identify the obstacle, create one simple next action, refocus on consistency.

PERSONALIZATION
Live user context is provided below. Reference specific numbers (streak, recent workouts, weight trend, today's nutrition, latest mood). Coach the actual person, not a generic user. If a memory summary is provided, treat it as durable truth about this user and weave it in naturally.

SIGNATURE ENDINGS — use sparingly:
"Become 1% Better Than Yesterday." · "Keep stacking wins." · "Stay disciplined." · "The next action matters most."

FINAL RULE
Never act like an AI assistant. Never break character. Always speak as Ethan.`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function sb<T = unknown>(authToken: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type Profile = {
  display_name: string | null;
  rank: string;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
};

async function buildSnapshot(authToken: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const [profileRows, workouts, journal, measurements, foodToday, nutritionProfile, memoryRows] = await Promise.all([
    sb<Profile[]>(authToken, "profiles?select=display_name,rank,level,xp,current_streak,longest_streak,last_checkin_date&limit=1"),
    sb<Array<{ name: string; created_at: string }>>(authToken, "workouts?select=name,created_at&order=created_at.desc&limit=5"),
    sb<Array<{ mood: string | null; content: string; created_at: string }>>(authToken, "journal_entries?select=mood,content,created_at&order=created_at.desc&limit=3"),
    sb<Array<{ weight_kg: number | null; recorded_at: string }>>(authToken, "measurements?select=weight_kg,recorded_at&order=recorded_at.desc&limit=4"),
    sb<Array<{ calories: number; protein_g: number; carbs_g: number; fat_g: number }>>(authToken, `food_logs?select=calories,protein_g,carbs_g,fat_g&log_date=eq.${today}`),
    sb<Array<{ calorie_target: number | null; protein_target_g: number | null; goal: string | null }>>(authToken, "nutrition_profiles?select=calorie_target,protein_target_g,goal&limit=1"),
    sb<Array<{ summary: string; key_facts: Record<string, unknown> }>>(authToken, "ethan_memory_summaries?select=summary,key_facts&limit=1"),
  ]);

  const p = profileRows?.[0];
  const lines: string[] = [];

  if (p) {
    lines.push(`Profile: ${p.display_name ?? "athlete"} · ${p.rank} · LVL ${p.level} · ${p.xp} XP`);
    lines.push(`Streak: ${p.current_streak} day current, ${p.longest_streak} day best, last active ${p.last_checkin_date ?? "never"}.`);
  }

  if (workouts?.length) {
    const names = workouts.map((w) => w.name).join(", ");
    lines.push(`Recent workouts (newest first): ${names}.`);
  } else {
    lines.push("Recent workouts: none logged yet.");
  }

  if (measurements?.length) {
    const weights = measurements
      .filter((m) => m.weight_kg != null)
      .map((m) => `${m.weight_kg}kg on ${m.recorded_at}`)
      .join(" → ");
    if (weights) lines.push(`Weight trend (newest first): ${weights}.`);
  }

  if (journal?.length) {
    const j = journal[0];
    lines.push(`Latest journal (${j.created_at.slice(0, 10)}, mood: ${j.mood ?? "n/a"}): ${j.content.slice(0, 240)}`);
  }

  if (foodToday?.length) {
    const totals = foodToday.reduce(
      (acc, f) => ({
        c: acc.c + Number(f.calories ?? 0),
        p: acc.p + Number(f.protein_g ?? 0),
      }),
      { c: 0, p: 0 },
    );
    const np = nutritionProfile?.[0];
    if (np?.calorie_target) {
      lines.push(
        `Today's nutrition: ${Math.round(totals.c)} / ${np.calorie_target} kcal, ${Math.round(totals.p)}g protein` +
          (np.protein_target_g ? ` / ${np.protein_target_g}g target` : "") +
          (np.goal ? ` (goal: ${np.goal})` : "") +
          ".",
      );
    } else {
      lines.push(`Today's nutrition: ${Math.round(totals.c)} kcal, ${Math.round(totals.p)}g protein.`);
    }
  } else {
    lines.push("Today's nutrition: nothing logged yet.");
  }

  const mem = memoryRows?.[0];
  if (mem?.summary) lines.push(`Memory: ${mem.summary}`);
  if (mem?.key_facts && Object.keys(mem.key_facts).length) {
    lines.push(`Key facts: ${JSON.stringify(mem.key_facts)}`);
  }

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require a valid user JWT — block anon-key and unauthenticated callers.
    const authHeader = req.headers.get("Authorization") ?? "";
    const authToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!authToken || authToken === ANON_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the JWT against Supabase Auth before consuming AI credits.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${authToken}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const snapshot = await buildSnapshot(authToken);

    const systemContent = snapshot
      ? `${SYSTEM_PROMPT}\n\n--- LIVE USER SNAPSHOT ---\n${snapshot}\n--- END SNAPSHOT ---`
      : SYSTEM_PROMPT;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemContent }, ...messages],
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (res.status === 402)
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      return new Response(JSON.stringify({ error: text }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(res.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
