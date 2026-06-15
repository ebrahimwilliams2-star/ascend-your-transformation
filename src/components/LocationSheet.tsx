import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { SA_CITIES, SA_PROVINCES, FITNESS_GOALS, EXPERIENCE_LEVELS } from "@/lib/locale";
import { toast } from "sonner";
import { X, MapPin } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: {
    city?: string | null;
    province?: string | null;
    location_visibility?: string | null;
    fitness_goals?: string[] | null;
    experience_level?: string | null;
  };
  onSaved?: () => void;
};

export function LocationSheet({ open, onClose, initial, onSaved }: Props) {
  const { user } = useUser();
  const [city, setCity] = useState(initial?.city ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [visibility, setVisibility] = useState(initial?.location_visibility ?? "private");
  const [goals, setGoals] = useState<string[]>(initial?.fitness_goals ?? []);
  const [experience, setExperience] = useState(initial?.experience_level ?? "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const toggleGoal = (id: string) =>
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          city: city || null,
          province: province || null,
          country: "ZA",
          location_visibility: visibility,
          fitness_goals: goals,
          experience_level: experience || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Location locked in.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-brand-black p-6"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/20" />
        <div className="flex items-center justify-between">
          <div>
            <p className="chip-label text-brand-red">South Africa</p>
            <h2 className="text-display text-2xl font-bold mt-0.5">Your Territory</h2>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full border border-white/10 text-brand-silver">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-xs text-brand-silver mt-1">Only the city is ever shown to other warriors. Your exact location is never stored.</p>

        <div className="mt-6 space-y-5">
          <div>
            <p className="chip-label text-brand-silver mb-2">City</p>
            <div className="grid grid-cols-2 gap-2">
              {SA_CITIES.map((c) => (
                <button
                  key={c.city}
                  onClick={() => { setCity(c.city); setProvince(c.province); }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold ${city === c.city ? "border-brand-red bg-brand-red/10 text-white" : "border-white/10 bg-brand-gray text-brand-silver"}`}
                >
                  <MapPin className="size-3 shrink-0" />
                  {c.city}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="chip-label text-brand-silver mb-2">Province</p>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-brand-gray px-4 py-3 text-white focus:border-brand-red focus:outline-none"
            >
              <option value="">— Select province —</option>
              {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <p className="chip-label text-brand-silver mb-2">Map Visibility</p>
            <div className="grid grid-cols-3 gap-2">
              {(["private","area","public"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold uppercase tracking-widest ${visibility === v ? "border-brand-red bg-brand-red/10 text-white" : "border-white/10 bg-brand-gray text-brand-silver"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-brand-silver mt-2">
              {visibility === "private" && "Hidden from the map."}
              {visibility === "area"    && "Approximate radius only — never your address."}
              {visibility === "public"  && "Visible to all warriors as an approximate area."}
            </p>
          </div>

          <div>
            <p className="chip-label text-brand-silver mb-2">Fitness Goals</p>
            <div className="flex flex-wrap gap-2">
              {FITNESS_GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleGoal(g.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${goals.includes(g.id) ? "border-brand-red bg-brand-red/15 text-white" : "border-white/10 bg-brand-gray text-brand-silver"}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="chip-label text-brand-silver mb-2">Experience</p>
            <div className="grid grid-cols-3 gap-2">
              {EXPERIENCE_LEVELS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setExperience(e.id)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${experience === e.id ? "border-brand-red bg-brand-red/10 text-white" : "border-white/10 bg-brand-gray text-brand-silver"}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-brand-red py-4 text-sm font-bold uppercase tracking-widest text-white shadow-glow-red disabled:opacity-50"
        >
          {saving ? "Saving…" : "Lock In"}
        </button>
      </div>
    </div>
  );
}
