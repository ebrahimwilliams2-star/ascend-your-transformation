import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AscendLogo } from "@/components/AscendLogo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — ASCEND" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "set">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase recovery links redirect back with type=recovery in the URL hash.
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setMode("set");
    }
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent. Check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Signing you in…");
      navigate({ to: "/dash" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setSubmitting(false);
    }
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
        <Link to="/auth" className="chip-label text-brand-silver hover:text-white">← Back</Link>

        <div className="mt-10 flex flex-col items-center">
          <AscendLogo className="size-20" />
          <p className="chip-label text-brand-red mt-6">Recovery</p>
          <h1 className="text-display mt-2 text-center text-4xl font-bold italic leading-none">
            {mode === "request" ? "Reset Password." : "Set New Password."}
          </h1>
          <p className="mt-3 text-center text-sm text-brand-silver">
            {mode === "request"
              ? "We'll email you a secure link."
              : "Enter your new password below."}
          </p>
        </div>

        {mode === "request" ? (
          <form onSubmit={handleRequest} className="mt-8 space-y-3">
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
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-xl bg-brand-red px-5 py-4 font-bold uppercase tracking-[0.2em] text-white shadow-glow-red transition-all hover:bg-brand-red-glow disabled:opacity-50"
            >
              {submitting ? "..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSet} className="mt-8 space-y-3">
            <div>
              <label className="chip-label text-brand-silver">New password</label>
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
              {submitting ? "..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
