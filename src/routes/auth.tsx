import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import { AscendLogo } from "@/components/AscendLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — ASCEND" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dash" });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to ASCEND.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dash" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dash" });
  };

  return (
    <main
      className="relative min-h-dvh bg-brand-black px-6"
      style={{
        paddingTop: "calc(2.5rem + env(safe-area-inset-top))",
        paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-brand-red/15 blur-[120px]" />
      <div className="relative mx-auto flex max-w-md flex-col">
        <Link to="/" className="chip-label text-brand-silver hover:text-white">← Back</Link>

        <div className="mt-10 flex flex-col items-center">
          <AscendLogo className="size-20" />
          <p className="chip-label text-brand-red mt-6">Step 01 · Identify</p>
          <h1 className="text-display mt-2 text-center text-4xl font-bold italic leading-none">
            {mode === "signin" ? "Welcome Back." : "Forge Your Path."}
          </h1>
          <p className="mt-3 text-center text-sm text-brand-silver">
            {mode === "signin" ? "The grind continues." : "Every Titan started here."}
          </p>
        </div>

        <button
          onClick={handleGoogle}
          className="mt-10 flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 py-4 font-medium text-white transition-colors hover:bg-white/10"
        >
          <svg className="size-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".85"/><path fill="#fff" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" opacity=".7"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" opacity=".55"/></svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-brand-silver/60">
          <div className="h-px flex-1 bg-white/10" />
          or
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <label className="chip-label text-brand-silver">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3.5 text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
              placeholder="warrior@ascend.app"
            />
          </div>
          <div>
            <label className="chip-label text-brand-silver">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3.5 text-white placeholder:text-brand-silver/40 focus:border-brand-red focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-brand-red px-5 py-4 font-bold uppercase tracking-[0.2em] text-white shadow-glow-red transition-all hover:bg-brand-red-glow disabled:opacity-50"
          >
            {submitting ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-center text-sm text-brand-silver hover:text-white"
        >
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <span className="text-brand-red font-bold">
            {mode === "signin" ? "Forge your path →" : "Sign in →"}
          </span>
        </button>
      </div>
    </main>
  );
}
