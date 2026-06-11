import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-black px-4">
      <div className="max-w-md text-center">
        <p className="chip-label text-brand-red mb-3">404 · Off Route</p>
        <h1 className="text-display text-5xl font-bold">Lost the trail</h1>
        <p className="mt-3 text-sm text-brand-silver">Get back to the grind.</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-red px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-brand-red-glow transition-colors"
        >
          Return to Dash
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-black px-4">
      <div className="max-w-md text-center">
        <p className="chip-label text-brand-red mb-3">System Fault</p>
        <h1 className="text-display text-3xl font-bold">Something broke.</h1>
        <p className="mt-3 text-sm text-brand-silver">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-red px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-brand-red-glow transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050505" },
      { title: "ASCEND — Become 1% Better Than Yesterday" },
      { name: "description", content: "Premium personal transformation app. Log workouts, track progress photos, build discipline, and rise through the ranks." },
      { property: "og:title", content: "ASCEND" },
      { property: "og:description", content: "Become 1% Better Than Yesterday." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Oswald:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body className="bg-brand-black text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}
