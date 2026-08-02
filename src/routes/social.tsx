import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MessagesPage } from "./messages";
import { GymbrosPage } from "./gymbros";
import { Users, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "Bros — ASCEND" },
      { name: "description", content: "Your GymBros circle and DMs in one place." },
      { property: "og:title", content: "Bros — ASCEND" },
      { property: "og:description", content: "Your GymBros circle and DMs in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialRoute,
});

type SocialSearch = { tab?: "gymbros" | "dms" };

function SocialRoute() {
  const search = useSearch({ from: "/social" }) as SocialSearch;
  const navigate = useNavigate({ from: "/social" });
  const activeTab = search.tab === "dms" ? "dms" : "gymbros";

  const setTab = (tab: "gymbros" | "dms") => {
    navigate({ to: "/social", search: { tab } });
  };

  return (
    <AppShell>
      <div className="px-6 pt-6">
        <p className="chip-label text-brand-red">Your Circle</p>
        <h1 className="text-display mt-0.5 text-2xl font-bold">Bros</h1>
      </div>

      <div className="sticky top-0 z-20 mt-4 px-6">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/5 bg-brand-gray/40 p-1">
          <TabButton
            active={activeTab === "gymbros"}
            onClick={() => setTab("gymbros")}
            label="GymBros"
            Icon={Users}
          />
          <TabButton
            active={activeTab === "dms"}
            onClick={() => setTab("dms")}
            label="DMs"
            Icon={MessageCircle}
          />
        </div>
      </div>

      <div className="mt-2">
        {activeTab === "gymbros" ? <GymbrosPage /> : <MessagesPage />}
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof Users;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${
        active
          ? "bg-brand-red text-white shadow-glow-red"
          : "text-brand-silver hover:text-white"
      }`}
    >
      <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
      {label}
    </button>
  );
}
