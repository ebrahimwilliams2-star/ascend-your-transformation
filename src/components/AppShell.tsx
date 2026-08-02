import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Dumbbell, Flame, Users, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

const navItems = [
  { to: "/dash", label: "Dash", Icon: Home },
  { to: "/workouts", label: "Lift", Icon: Dumbbell },
  { to: "/social", label: "Bros", Icon: Users },
  { to: "/photos", label: "Form", Icon: Flame },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Legacy accounts may have no username; social surfaces would render "Unknown".
  const { data: profile } = useQuery({
    queryKey: ["profile-username-gate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const needsUsername = !!user && !!profile && !profile.username?.trim();

  useEffect(() => {
    if (needsUsername && pathname !== "/complete-profile") {
      navigate({ to: "/complete-profile" });
    }
  }, [needsUsername, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-black">
        <div className="size-8 animate-pulse rounded-full bg-brand-red" />
      </div>
    );
  }


  return (
    <div
      className="min-h-dvh bg-brand-black"
      style={{
        paddingBottom: "calc(7rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-md">{children}</div>

      <nav
        className="fixed bottom-0 left-1/2 z-nav -translate-x-1/2 w-full max-w-md px-4 pt-2"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="relative grid grid-cols-5 items-center rounded-2xl border border-white/10 bg-brand-black/95 px-2 py-3 backdrop-blur-xl">
          {navItems.slice(0, 2).map((it) => (
            <NavBtn key={it.to} {...it} active={pathname.startsWith(it.to)} />
          ))}
          <Link to="/coach" className="relative -top-6 mx-auto">
            <div className={`grid size-14 place-items-center rounded-full bg-brand-red shadow-glow-red-strong ring-4 ring-brand-black transition-transform active:scale-95 ${pathname.startsWith("/coach") ? "text-white" : ""}`}>
              <Sparkles className="size-6 text-white" strokeWidth={2.2} />
            </div>
          </Link>
          {navItems.slice(2).map((it) => (
            <NavBtn key={it.to} {...it} active={isSocialActive(pathname, it.to)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function isSocialActive(pathname: string, to: string) {
  if (to === "/social") {
    return pathname.startsWith("/social") || pathname.startsWith("/messages") || pathname.startsWith("/gymbros");
  }
  return pathname.startsWith(to);
}

function NavBtn({ to, label, Icon, active }: { to: string; label: string; Icon: typeof Home; active: boolean }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 ${active ? "text-brand-red" : "text-brand-silver"}`}>
      <Icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}

export async function signOut() {
  await supabase.auth.signOut();
  // Full replace navigation: drops all in-memory cached protected data and
  // keeps the signed-in route off the back stack.
  if (typeof window !== "undefined") window.location.replace("/auth");
}
