import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationsBell() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as Notification[];
    },
    refetchInterval: 60_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (!unreadIds.length) return;
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative grid size-10 place-items-center rounded-full border border-white/10 text-brand-silver hover:text-white"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-brand-red text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md border-brand-red/20 bg-brand-black p-0 sm:max-w-md">
        <SheetHeader className="border-b border-white/5 p-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-display text-xl font-bold text-white">Notifications</SheetTitle>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="chip-label text-brand-red hover:text-white"
              >
                Mark all read
              </button>
            )}
          </div>
        </SheetHeader>
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "calc(100vh - 100px)" }}>
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-brand-gray/30 p-10 text-center">
              <Bell className="mx-auto size-6 text-brand-red" />
              <p className="mt-2 text-sm font-bold">All quiet</p>
              <p className="mt-1 text-xs text-brand-silver">Keep grinding. Wins will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const inner = (
                  <div className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                    n.read ? "border-white/5 bg-brand-gray/30" : "border-brand-red/40 bg-brand-red/5"
                  }`}>
                    <div className={`mt-1 size-2 shrink-0 rounded-full ${n.read ? "bg-brand-silver/30" : "bg-brand-red"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-brand-silver">{n.body}</p>}
                      <p className="mt-1 chip-label text-brand-silver">
                        {new Date(n.created_at).toLocaleString(undefined, {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.read && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); markOneRead.mutate(n.id); }}
                          className="grid size-7 place-items-center rounded-md border border-white/10 text-brand-silver hover:text-white"
                          aria-label="Mark read"
                        >
                          <Check className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove.mutate(n.id); }}
                        className="grid size-7 place-items-center rounded-md border border-white/10 text-brand-silver hover:text-brand-red"
                        aria-label="Dismiss"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => {
                      if (!n.read) markOneRead.mutate(n.id);
                      setOpen(false);
                    }}
                    className="block"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
