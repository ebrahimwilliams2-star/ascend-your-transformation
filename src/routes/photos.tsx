import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/photos")({
  head: () => ({ meta: [{ title: "Progress — ASCEND" }] }),
  component: () => <AppShell><Photos /></AppShell>,
});

type Photo = { id: string; photo_path: string; label: string | null; taken_at: string };

function useSignedUrl(path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancelled = false;
    supabase.storage.from("progress-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}

function Thumb({ photo, onDelete, selected, onSelect }: { photo: Photo; onDelete: () => void; selected: boolean; onSelect: () => void }) {
  const url = useSignedUrl(photo.photo_path);
  return (
    <div className={`group relative aspect-[3/4] overflow-hidden rounded-xl border ${selected ? "border-brand-red ring-2 ring-brand-red" : "border-white/10"}`}>
      {url ? <img src={url} alt={photo.label ?? "Progress"} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-brand-gray animate-pulse" />}
      <button onClick={onSelect} className="absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
          {new Date(photo.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <button onClick={onDelete} className="rounded bg-black/60 p-1.5 text-brand-silver opacity-0 group-hover:opacity-100 hover:text-brand-red">
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

function Photos() {
  const { user } = useUser();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{ before?: Photo; after?: Photo }>({});

  const { data: photos } = useQuery({
    queryKey: ["photos-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_photos")
        .select("*")
        .eq("user_id", user!.id)
        .order("taken_at", { ascending: false });
      return (data ?? []) as Photo[];
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("progress_photos").insert({
        user_id: user!.id,
        photo_path: path,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Progress captured.");
      qc.invalidateQueries({ queryKey: ["photos-list"] });
      qc.invalidateQueries({ queryKey: ["photos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: async (p: Photo) => {
      await supabase.storage.from("progress-photos").remove([p.photo_path]);
      const { error } = await supabase.from("progress_photos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos-list"] }),
  });

  const beforeUrl = useSignedUrl(selected.before?.photo_path);
  const afterUrl = useSignedUrl(selected.after?.photo_path);

  return (
    <>
      <header className="flex items-center justify-between p-6">
        <div>
          <p className="chip-label text-brand-red">Visual Proof</p>
          <h1 className="text-display text-3xl font-bold">Transformation</h1>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="grid size-11 place-items-center rounded-full bg-brand-red shadow-glow-red disabled:opacity-50"
        >
          <Camera className="size-5 text-white" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = "";
          }}
        />
      </header>

      {selected.before && selected.after && (
        <section className="mx-6 mb-6 rounded-2xl border border-brand-red/30 bg-brand-gray p-4">
          <p className="chip-label text-brand-red mb-3">Side By Side</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ p: selected.before, url: beforeUrl, l: "Before" }, { p: selected.after, url: afterUrl, l: "After" }].map((s, i) => (
              <div key={i} className="space-y-2">
                <div className={`aspect-[3/4] overflow-hidden rounded-lg ${i === 1 ? "ring-2 ring-brand-red" : ""}`}>
                  {s.url && <img src={s.url} alt={s.l} className="h-full w-full object-cover" />}
                </div>
                <p className={`text-center chip-label ${i === 1 ? "text-brand-red" : "text-brand-silver"}`}>
                  {s.l} · {new Date(s.p.taken_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSelected({})}
            className="mt-3 w-full text-center chip-label text-brand-silver"
          >
            Clear Comparison ×
          </button>
        </section>
      )}

      <section className="px-6">
        {!selected.before && (
          <p className="chip-label text-brand-silver mb-3">Tap two photos to compare</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(photos ?? []).map((p) => (
            <Thumb
              key={p.id}
              photo={p}
              selected={selected.before?.id === p.id || selected.after?.id === p.id}
              onSelect={() => {
                if (!selected.before) setSelected({ before: p });
                else if (selected.before.id === p.id) setSelected({});
                else if (!selected.after) setSelected({ ...selected, after: p });
                else setSelected({ before: p });
              }}
              onDelete={() => remove.mutate(p)}
            />
          ))}
        </div>
        {(photos ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <p className="chip-label text-brand-red mb-2">No Photos Yet</p>
            <p className="text-sm text-brand-silver">Capture your baseline. Tap the camera.</p>
          </div>
        )}
      </section>
    </>
  );
}
