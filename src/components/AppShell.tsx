import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Home, Dumbbell, Flame, Users, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

const navItems = [
  { to: "/dash", label: "Dash", Icon: Home },
  { to: "/workouts", label: "Lift", Icon: Dumbbell },
  { to: "/photos", label: "Form", Icon: Flame },
  { to: "/gymbros", label: "Bros", Icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-black">
        <div className="size-8 animate-pulse rounded-full bg-brand-red" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-brand-black"
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-md">{children}</div>

      <nav
        className="fixed bottom-0 left-1/2 z-50 -translate-x-1/2 w-full max-w-md px-4 pt-2"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="relative grid grid-cols-5 items-center rounded-2xl border border-white/10 bg-brand-black/95 px-2 py-3 backdrop-blur-xl">
          {navItems.slice(0, 2).map((it) => (
            <NavBtn key={it.to} {...it} active={pathname.startsWith(it.to)} />
          ))}
          <Link to="/coach" className="relative -top-6 mx-auto">
            <div className={`grid size-14 place-items-center rounded-full bg-brand-red shadow-glow-red-strong ring-4 ring-brand-black transition-transform active:scale-95 ${pathname.startsWith("/coach") ? "scale-105" : ""}`}>
              <MessageCircle className="size-6 text-white" strokeWidth={2.2} />
            </div>
          </Link>
          {navItems.slice(2).map((it) => (
            <NavBtn key={it.to} {...it} active={pathname.startsWith(it.to)} />
          ))}
        </div>
      </nav>
    </div>
  );
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
}
