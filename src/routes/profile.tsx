import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell, signOut } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ChevronLeft, User, Flame, Trophy, LogOut } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — ASCEND" }] }),
  component: () => <AppShell><ProfilePage /></AppShell>,
});

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced", "elite"] as const;
const FITNESS_GOAL_OPTIONS = [
  "Lose weight",
  "Build muscle",
  "Increase strength",
  "Improve endurance",
  "Athletic performance",
  "General fitness",
];
const LOCATION_VISIBILITY_OPTIONS = ["public", "friends", "private"] as const;
const XP_PER_LEVEL = 500;

function getInitials(displayName?: string | null, username?: string | null): string | null {
  const name = displayName ?? username;
  if (!name) return null;
  return name.slice(0, 2).toUpperCase();
}

type BadgeRow = {
  icon: string | null;
  name: string;
};

type UserBadgeWithBadge = {
  id: string;
  badge_id: string;
  earned_at: string;
  user_id: string;
  badges: BadgeRow | null;
};

function ProfilePage() {
  const { user } = useUser();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: userBadges } = useQuery({
    queryKey: ["user-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", user!.id)
        .order("earned_at", { ascending: false });
      return (data ?? []) as UserBadgeWithBadge[];
    },
  });

  const [form, setForm] = useState({
    display_name: "",
    username: "",
    experience_level: "",
    fitness_goals: [] as string[],
    city: "",
    province: "",
    country: "",
    location_visibility: "public",
  });

  function openEdit() {
    setForm({
      display_name: profile?.display_name ?? "",
      username: profile?.username ?? "",
      experience_level: profile?.experience_level ?? "",
      fitness_goals: profile?.fitness_goals ?? [],
      city: profile?.city ?? "",
      province: profile?.province ?? "",
      country: profile?.country ?? "",
      location_visibility: profile?.location_visibility ?? "public",
    });
    setEditing(true);
  }

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name || null,
          username: form.username || null,
          experience_level: form.experience_level || null,
          fitness_goals: form.fitness_goals.length > 0 ? form.fitness_goals : null,
          city: form.city || null,
          province: form.province || null,
          country: form.country || null,
          location_visibility: form.location_visibility,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;
      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  }

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const rank = profile?.rank ?? "Initiate";
  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const progress = Math.min(100, Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100));
  const initials = getInitials(profile?.display_name, profile?.username);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "—";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-black">
        <div className="size-8 animate-pulse rounded-full bg-brand-red" />
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 backdrop-blur-md bg-brand-black/80">
        <Link
          to="/dash"
          className="grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="chip-label text-brand-silver">Profile</p>
        <div className="size-10" />
      </header>

      {/* Avatar + name hero */}
      <section className="px-6 pt-2 pb-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative block"
            aria-label="Change profile photo"
          >
            {avatarUploading ? (
              <div className="size-24 rounded-full bg-brand-red/20 flex items-center justify-center ring-2 ring-brand-red/40">
                <div className="size-8 animate-pulse rounded-full bg-brand-red" />
              </div>
            ) : profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="size-24 rounded-full object-cover ring-2 ring-brand-red/40 shadow-glow-red"
              />
            ) : (
              <div className="size-24 rounded-full bg-brand-red/20 flex items-center justify-center ring-2 ring-brand-red/40">
                {initials ? (
                  <span className="text-2xl font-bold text-brand-red">{initials}</span>
                ) : (
                  <User className="size-10 text-brand-red" />
                )}
              </div>
            )}
            <div className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-brand-red shadow-glow-red">
              <Camera className="size-4 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <h1 className="text-display text-2xl font-bold">
          {profile?.display_name ?? profile?.username ?? "Athlete"}
        </h1>
        {profile?.username && (
          <p className="text-sm text-brand-silver mt-0.5">@{profile.username}</p>
        )}
        <p className="chip-label text-brand-red mt-2">{rank} · LVL {level}</p>

        {/* XP bar */}
        <div className="w-full mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-brand-red transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-brand-silver">
            {xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP to next level
          </p>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid w-full grid-cols-3 gap-2">
          {[
            { label: "Current Streak", value: `${currentStreak}d` },
            { label: "Longest Streak", value: `${longestStreak}d` },
            { label: "Total XP", value: xp.toLocaleString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/5 bg-brand-gray/60 p-3 text-center"
            >
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[10px] uppercase tracking-widest text-brand-silver mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Edit profile */}
      <section className="px-6 mb-6">
        {!editing ? (
          <button
            onClick={openEdit}
            className="w-full rounded-xl border border-brand-red/40 bg-brand-red/10 py-3 text-sm font-bold text-brand-red hover:bg-brand-red/20 transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="space-y-4 rounded-2xl border border-white/5 bg-brand-gray/60 p-5">
            <h2 className="chip-label text-brand-silver">Edit Profile</h2>

            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Display Name</span>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-silver/50 focus:border-brand-red/40 focus:outline-none"
                  placeholder="Your name"
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Username</span>
                <p className="text-[9px] text-brand-silver/60 mt-0.5">Must be unique across all users</p>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-silver/50 focus:border-brand-red/40 focus:outline-none"
                  placeholder="@username"
                />
              </label>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Experience Level</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, experience_level: lvl }))}
                      className={`rounded-lg border py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                        form.experience_level === lvl
                          ? "border-brand-red bg-brand-red/20 text-brand-red"
                          : "border-white/10 text-brand-silver hover:border-brand-red/30"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Fitness Goals</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FITNESS_GOAL_OPTIONS.map((goal) => {
                    const active = form.fitness_goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            fitness_goals: active
                              ? f.fitness_goals.filter((g) => g !== goal)
                              : [...f.fitness_goals, goal],
                          }))
                        }
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                          active
                            ? "border-brand-red bg-brand-red/20 text-brand-red"
                            : "border-white/10 text-brand-silver hover:border-brand-red/30"
                        }`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">City</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-silver/50 focus:border-brand-red/40 focus:outline-none"
                  placeholder="Cape Town"
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Province / State</span>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-silver/50 focus:border-brand-red/40 focus:outline-none"
                  placeholder="Western Cape"
                />
              </label>

              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Country</span>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-brand-black px-3 py-2 text-sm text-white placeholder:text-brand-silver/50 focus:border-brand-red/40 focus:outline-none"
                  placeholder="South Africa"
                />
              </label>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-silver">Location Visibility</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {LOCATION_VISIBILITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, location_visibility: opt }))}
                      className={`rounded-lg border py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                        form.location_visibility === opt
                          ? "border-brand-red bg-brand-red/20 text-brand-red"
                          : "border-white/10 text-brand-silver hover:border-brand-red/30"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-brand-silver hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                className="flex-1 rounded-xl bg-brand-red py-3 text-sm font-bold text-white hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
              >
                {saveProfile.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Badges */}
      <section className="px-6 mb-6">
        <h3 className="chip-label text-brand-silver mb-3">Badges</h3>
        {!userBadges || userBadges.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-brand-gray/60 p-5 text-center">
            <Trophy className="mx-auto size-8 text-brand-silver/40 mb-2" />
            <p className="text-sm text-brand-silver">No badges yet. Complete challenges to earn them.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {userBadges.map((ub) => {
              const badge = ub.badges;
              return (
                <div
                  key={ub.id}
                  className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-brand-red/20 bg-brand-red/5 px-4 py-3"
                >
                  <span className="text-2xl">{badge?.icon ?? "🏅"}</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand-silver whitespace-nowrap">
                    {badge?.name ?? "Badge"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="px-6 mb-6">
        <h3 className="chip-label text-brand-silver mb-3">Stats</h3>
        <div className="rounded-2xl border border-white/5 bg-brand-gray/60 divide-y divide-white/5">
          {[
            { label: "Level", value: level },
            { label: "Total XP", value: xp.toLocaleString() },
            { label: "Current Streak", value: `${currentStreak} days` },
            { label: "Longest Streak", value: `${longestStreak} days` },
            { label: "Member Since", value: memberSince },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-brand-silver">{label}</span>
              <span className="text-sm font-bold text-white">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Sign out */}
      <section className="px-6 pb-8">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-red/40 py-3.5 text-sm font-bold text-brand-red hover:bg-brand-red/10 transition-colors"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </section>
    </>
  );
}
