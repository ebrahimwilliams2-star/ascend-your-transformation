import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { usernameSchema, LIMITS } from "@/lib/validation";
import { AscendLogo } from "@/components/AscendLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/complete-profile")({
  head: () => ({
    meta: [
      { title: "Claim Your Name — ASCEND" },
      { name: "description", content: "Choose your ASCEND username to unlock GymBros, Squads, and the community feed." },
      { property: "og:title", content: "Claim Your Name — ASCEND" },
      { property: "og:description", content: "Choose your ASCEND username to unlock GymBros, Squads, and the community feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompleteProfile,
});

function CompleteProfile() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile-complete", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (profile?.display_name && !displayName) setDisplayName(profile.display_name);
    if (profile?.username) navigate({ to: "/dash" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid username");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({
          username: parsed.data,
          display_name: displayName.trim() || parsed.data,
        })
        .eq("id", user!.id);
      if (err) {
        if (err.code === "23505") {
          setError("This username is already taken");
          return;
        }
        if (err.code === "23514") {
          setError("Only letters, numbers, underscores, and periods are allowed");
          return;
        }
        throw err;
      }
      toast.success("Name claimed. Welcome to the brotherhood.");
      navigate({ to: "/dash" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save username");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="relative min-h-dvh bg-brand-black px-6"
      style={{
        paddingTop: "calc(3rem + env(safe-area-inset-top))",
        paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-brand-red/15 blur-[120px]" />
      <div className="relative mx-auto flex max-w-md flex-col">
        <div className="flex flex-col items-center">
          <AscendLogo className="size-16" />
          <p className="chip-label text-brand-red mt-6">Step 02 · Claim</p>
          <h1 className="text-display mt-2 text-center text-4xl font-bold italic leading-none">
            Complete Your Profile.
          </h1>
          <p className="mt-3 text-center text-sm text-brand-silver">
            Pick the name the brotherhood will know you by. Required before social features unlock.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <div>
            <label className="chip-label text-brand-silver">Username</label>
            <input
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3.5 text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
              placeholder="iron_titan.01"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-brand-red">{error ?? ""}</p>
              <p className="text-[10px] text-brand-silver/60">{username.length}/20</p>
            </div>
            <p className="text-[10px] text-brand-silver/60">
              3–20 characters. Letters, numbers, underscores, and periods only.
            </p>
          </div>

          <div>
            <label className="chip-label text-brand-silver">Display Name (optional)</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={LIMITS.displayName}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3.5 text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
              placeholder="Your name"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-brand-red px-5 py-4 font-bold uppercase tracking-[0.2em] text-white shadow-glow-red transition-all hover:bg-brand-red-glow disabled:opacity-50"
          >
            {saving ? "..." : "Claim Name"}
          </button>
        </form>
      </div>
    </main>
  );
}
