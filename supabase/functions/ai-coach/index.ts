// Ethan — AI Coach edge function
// Streams personalized responses from Lovable AI Gateway using each user's live data.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Ethan — the experienced gymbro everyone wishes they trained with. Not a chatbot, not a motivational speaker, not a corporate assistant. A real mate who happens to know a lot about training.

HOW YOU SOUND
Friendly, relaxed, confident, encouraging, humble, funny when it fits. You sound like a real person texting another gym member. Use contractions ("I'm", "we've", "let's", "you're"). Never robotic, never corporate, never like you're writing an article.

RESPONSE LENGTH — THIS IS THE MOST IMPORTANT RULE
Default to SHORT. 1–3 sentences for most replies. Maximum 4–6 sentences when extra explanation genuinely helps. Only go long and structured when the user explicitly asks for education, a plan, or detailed guidance.
No long intros. No repeating what the user just said. No summaries at the end. No bullet lists unless they asked for a plan.

EXAMPLES OF THE RIGHT LENGTH AND TONE
User: "I don't feel like training."
You: "Bro, we've all had those days. Just get yourself through the gym door — I reckon you'll finish the session once you're there. 👊"

User: "I hit a bench PR."
You: "Let's go! 🔥 That's massive. Enjoy the win today — next time we'll chase another 2.5kg."

User: "I ate pizza."
You: "😂 Enjoy it, bro. One meal isn't ruining anything. Just get back on track with the next one."

TONE
Positive first. Corrective second. Harsh only when truly necessary. Never insult, shame, or guilt-trip. Redirect toward consistency instead.

ACCOUNTABILITY
If they skip sessions, don't lecture: "One missed day is nothing. Two starts becoming a habit — let's train today." or "You've worked too hard to lose momentum now."

CELEBRATE WINS
PRs, weight changes, streaks, consistency, nutrition goals — make them feel exciting. Short and genuinely hyped.

HUMOUR
Light gym humour occasionally ("Leg day won't bite… probably."). Never overdo it, never become a comedian.

MEMORY
Talk like you remember previous conversations. Reference their streak, goals, favourite lifts, recent workouts, injuries, progress — the snapshot and chat history are given to you. Build on what's been said; don't repeat advice you've already given. Weave numbers in naturally, never recite data.

KNOWLEDGE
You know training, nutrition, recovery, hypertrophy, strength, fat loss, supplements, technique and mindset deeply — but you only unload detail when asked. Never overwhelm someone with info they didn't request. Stay factually accurate and give safe advice.

EMOJIS
Sparingly. Max 1–2 per message. 💪 👊 🔥 😂 🙌

NEVER SAY
"Certainly!", "Great question!", "As your AI coach…", "Here are some tips:", "I'm here to help you…"

FINAL RULE
Never break character, never say you're an AI. Every reply should feel like a text from their training partner — so that by the end they think "I've just spoken to my gymbro," not "I've just chatted to an AI."`;


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
  username?: string | null;
  rank: string;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
};

async function buildSnapshot(authToken: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const [
    profileRows,
    workouts,
    journal,
    measurements,
    foodToday,
    nutritionProfile,
    memoryRows,
    longTermMemories,
    badges,
    challenges,
  ] = await Promise.all([
    sb<Profile[]>(authToken, "profiles?select=display_name,username,rank,level,xp,current_streak,longest_streak,last_checkin_date&limit=1"),
    sb<Array<{ name: string; created_at: string; performed_at: string; duration_min: number | null }>>(authToken, "workouts?select=name,created_at,performed_at,duration_min&order=performed_at.desc&limit=5"),
    sb<Array<{ mood: string | null; content: string; created_at: string; energy_level: number | null; discipline_score: number | null }>>(authToken, "journal_entries?select=mood,content,created_at,energy_level,discipline_score&order=created_at.desc&limit=10"),
    sb<Array<{ weight_kg: number | null; recorded_at: string }>>(authToken, "measurements?select=weight_kg,recorded_at&order=recorded_at.desc&limit=4"),
    sb<Array<{ calories: number; protein_g: number; carbs_g: number; fat_g: number }>>(authToken, `food_logs?select=calories,protein_g,carbs_g,fat_g&log_date=eq.${today}`),
    sb<Array<{ calorie_target: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; goal_type: string | null; weight_kg: number | null; goal_weight_kg: number | null }>>(authToken, "nutrition_profiles?select=calorie_target,protein_g,carbs_g,fat_g,goal_type,weight_kg,goal_weight_kg&limit=1"),
    sb<Array<{ summary: string; key_facts: Record<string, unknown> }>>(authToken, "ethan_memory_summaries?select=summary,key_facts&limit=1"),
    sb<Array<{ category: string; content: string; importance: number }>>(authToken, "ethan_memories?select=category,content,importance&order=importance.desc&order=updated_at.desc&limit=40"),
    sb<Array<{ badge_id: string; earned_at: string }>>(authToken, "user_badges?select=badge_id,earned_at&order=earned_at.desc&limit=6"),
    sb<Array<{ progress: number; completed: boolean; challenge_id: string }>>(authToken, "challenge_participants?select=progress,completed,challenge_id&order=joined_at.desc&limit=6"),
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
    const meta: string[] = [`mood: ${j.mood ?? "n/a"}`];
    if (j.discipline_score != null) meta.push(`discipline ${j.discipline_score}/10`);
    if (j.energy_level != null) meta.push(`energy ${j.energy_level}/10`);
    lines.push(`Latest journal (${j.created_at.slice(0, 10)}, ${meta.join(", ")}): ${j.content.slice(0, 280)}`);

    if (journal.length > 1) {
      const moods = journal.map((e) => e.mood).filter(Boolean) as string[];
      const moodTally: Record<string, number> = {};
      moods.forEach((m) => (moodTally[m] = (moodTally[m] ?? 0) + 1));
      const topMood = Object.entries(moodTally).sort((a, b) => b[1] - a[1])[0];
      const discs = journal.map((e) => e.discipline_score).filter((v): v is number => v != null);
      const energies = journal.map((e) => e.energy_level).filter((v): v is number => v != null);
      const avgD = discs.length ? (discs.reduce((a, b) => a + b, 0) / discs.length).toFixed(1) : null;
      const avgE = energies.length ? (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(1) : null;
      const parts: string[] = [`${journal.length} recent entries`];
      if (topMood) parts.push(`most common mood: ${topMood[0]}`);
      if (avgD) parts.push(`avg discipline ${avgD}/10`);
      if (avgE) parts.push(`avg energy ${avgE}/10`);
      lines.push(`Journal trend — ${parts.join(", ")}.`);

      const recentSnippets = journal
        .slice(1, 5)
        .map((e) => `(${e.created_at.slice(0, 10)}) ${e.content.slice(0, 120)}`)
        .join(" | ");
      lines.push(`Earlier reflections: ${recentSnippets}`);
    }
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
          (np.protein_g ? ` / ${np.protein_g}g target` : "") +
          (np.goal_type ? ` (goal: ${np.goal_type})` : "") +
          ".",
      );
    } else {
      lines.push(`Today's nutrition: ${Math.round(totals.c)} kcal, ${Math.round(totals.p)}g protein.`);
    }
  } else {
    lines.push("Today's nutrition: nothing logged yet.");
  }

  const np = nutritionProfile?.[0];
  if (np?.weight_kg) {
    lines.push(
      `Bodyweight target: currently ${np.weight_kg}kg` +
        (np.goal_weight_kg ? ` → goal ${np.goal_weight_kg}kg` : "") +
        (np.protein_g || np.carbs_g || np.fat_g
          ? ` · macros ${np.protein_g ?? "?"}P/${np.carbs_g ?? "?"}C/${np.fat_g ?? "?"}F`
          : "") +
        ".",
    );
  }

  if (p) {
    const stage = p.level >= 25 ? 5 : p.level >= 15 ? 4 : p.level >= 8 ? 3 : p.level >= 3 ? 2 : 1;
    lines.push(`Ascendant stage: ${stage} of 5.`);
  }

  if (badges?.length) {
    lines.push(`Recent badges: ${badges.map((b) => b.badge_id).join(", ")}.`);
  }

  if (challenges?.length) {
    const active = challenges.filter((c) => !c.completed).length;
    const done = challenges.filter((c) => c.completed).length;
    lines.push(`Challenges: ${active} in progress, ${done} recently completed.`);
  }

  const mem = memoryRows?.[0];
  if (mem?.summary) lines.push(`Conversation summary so far: ${mem.summary}`);
  if (mem?.key_facts && Object.keys(mem.key_facts).length) {
    lines.push(`Key facts: ${JSON.stringify(mem.key_facts)}`);
  }

  if (longTermMemories?.length) {
    const grouped = longTermMemories
      .slice(0, 30)
      .map((m) => `- [${m.category}] ${m.content}`)
      .join("\n");
    lines.push(`Things you remember about them (reference naturally, never list them out loud):\n${grouped}`);
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
