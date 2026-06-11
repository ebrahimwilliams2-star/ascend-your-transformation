import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUser } from "@/lib/auth";
import heroImg from "@/assets/hero-athlete.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASCEND — Become 1% Better Than Yesterday" },
      { name: "description", content: "Premium personal transformation app. Discipline. Consistency. Rise." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dash" });
  }, [user, loading, navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-black text-foreground">
      {/* Hero image */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Focused athlete in red rim light"
          className="h-full w-full object-cover object-center opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-black/60 via-brand-black/40 to-brand-black" />
        <div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-brand-red/20 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="chip-label text-brand-red">Elite · Est. 2026</p>
            <h1 className="text-display text-3xl font-bold">ASCEND</h1>
          </div>
          <Link
            to="/auth"
            className="chip-label text-brand-silver hover:text-white transition-colors"
          >
            Sign In →
          </Link>
        </header>

        <div className="mt-auto pb-12">
          <p className="chip-label text-brand-red mb-4">The Discipline App</p>
          <h2 className="text-display text-6xl leading-[0.95] font-bold italic tracking-tight">
            Become<br />
            <span className="text-brand-red">1% Better</span><br />
            Than Yesterday.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-brand-silver">
            Track every lift, every photo, every check-in. Build the streak. Earn the rank.
            This is transformation — not a gym app.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/auth"
              className="group relative overflow-hidden rounded-xl bg-brand-red px-6 py-4 text-center font-bold uppercase tracking-[0.2em] text-white shadow-glow-red transition-all hover:bg-brand-red-glow hover:shadow-glow-red-strong"
            >
              Begin the Climb
            </Link>
            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-brand-silver/70">
              No excuses · No shortcuts
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
