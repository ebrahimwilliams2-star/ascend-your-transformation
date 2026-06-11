import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/metrics")({
  head: () => ({ meta: [{ title: "Metrics — ASCEND" }] }),
  component: () => <AppShell><Metrics /></AppShell>,
});

type M = { weight_kg: string; body_fat: string; chest_cm: string; waist_cm: string; arms_cm: string; thighs_cm: string };

const FIELDS: { key: keyof M; label: string; unit: string }[] = [
  { key: "weight_kg", label: "Weight", unit: "kg" },
  { key: "body_fat", label: "Body Fat", unit: "%" },
  { key: "chest_cm", label: "Chest", unit: "cm" },
  { key: "waist_cm", label: "Waist", unit: "cm" },
  { key: "arms_cm", label: "Arms", unit: "cm" },
  { key: "thighs_cm", label: "Thighs", unit: "cm" },
];

function Metrics() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<M>({ weight_kg: "", body_fat: "", chest_cm: "", waist_cm: "", arms_cm: "", thighs_cm: "" });

  const { data: rows } = useQuery({
    queryKey: ["measurements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("measurements")
        .select("*")
        .eq("user_id", user!.id)
        .order("recorded_at", { ascending: false });
      return data ?? [];
    },
  });

  const latest = rows?.[0];
  const previous = rows?.[1];

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
        chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : null,
        waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
        arms_cm: form.arms_cm ? parseFloat(form.arms_cm) : null,
        thighs_cm: form.thighs_cm ? parseFloat(form.thighs_cm) : null,
      };
      const { error } = await supabase.from("measurements").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Metrics logged.");
      qc.invalidateQueries({ queryKey: ["measurements"] });
      setOpen(false);
      setForm({ weight_kg: "", body_fat: "", chest_cm: "", waist_cm: "", arms_cm: "", thighs_cm: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <>
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <Link to="/dash" className="grid size-9 place-items-center rounded-full border border-white/10">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="chip-label text-brand-red">The Numbers</p>
            <h1 className="text-display text-3xl font-bold">Metrics</h1>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="grid size-11 place-items-center rounded-full bg-brand-red shadow-glow-red">
          <Plus className={`size-5 text-white transition-transform ${open ? "rotate-45" : ""}`} />
        </button>
      </header>

      {open && (
        <section className="mx-6 mb-6 rounded-2xl border border-brand-red/30 bg-brand-gray p-5">
          <p className="chip-label text-brand-red mb-3">Today's Entry</p>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="chip-label text-brand-silver">{f.label}</label>
                <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-black/40 px-3">
                  <input
                    type="number"
                    step="0.1"
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs text-brand-silver">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 w-full rounded-xl bg-brand-red px-4 py-3 font-bold uppercase tracking-widest text-white disabled:opacity-50">
            {save.isPending ? "..." : "Log Metrics"}
          </button>
        </section>
      )}

      <section className="px-6 mb-6">
        <p className="chip-label text-brand-silver mb-3">Current Snapshot</p>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => {
            const cur = latest?.[f.key] as number | null;
            const prev = previous?.[f.key] as number | null;
            const delta = cur != null && prev != null ? cur - prev : null;
            return (
              <div key={f.key} className="rounded-xl border border-white/5 bg-brand-gray/60 p-4">
                <p className="chip-label text-brand-silver">{f.label}</p>
                <p className="mt-2 text-display text-2xl font-bold">
                  {cur != null ? `${cur}` : "—"}
                  <span className="text-xs text-brand-silver ml-1">{f.unit}</span>
                </p>
                {delta != null && delta !== 0 && (
                  <p className={`text-[10px] font-bold mt-1 ${delta < 0 ? "text-brand-red" : "text-brand-silver"}`}>
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-6">
        <p className="chip-label text-brand-silver mb-3">History</p>
        <div className="space-y-2">
          {(rows ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-brand-gray/40 px-4 py-3">
              <span className="text-xs text-brand-silver">{new Date(r.recorded_at).toLocaleDateString()}</span>
              <span className="text-sm font-bold">{r.weight_kg ?? "—"} kg</span>
            </div>
          ))}
          {(rows ?? []).length === 0 && <p className="text-center text-sm text-brand-silver py-8">No metrics yet.</p>}
        </div>
      </section>
    </>
  );
}
