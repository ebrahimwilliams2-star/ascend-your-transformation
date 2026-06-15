import { useRef, useState } from "react";
import { Download, X, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

type ShareCardKind = "streak" | "level" | "milestone";

type Props = {
  open: boolean;
  onClose: () => void;
  kind: ShareCardKind;
  headline: string;
  big: string;
  caption: string;
  athlete: string;
};

export function ShareCardModal({ open, onClose, kind, headline, big, caption, athlete }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `ascend-${kind}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Card saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't export card");
    } finally {
      setBusy(false);
    }
  };

  const nativeShare = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `ascend-${kind}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "ASCEND", text: caption });
      } else {
        download();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Share unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm"
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top))",
        paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        paddingLeft: "1.5rem",
        paddingRight: "1.5rem",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <p className="chip-label text-brand-silver">Share card</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full border border-white/10 text-brand-silver">
            <X className="size-4" />
          </button>
        </div>

        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl border border-brand-red/40 p-8 text-white"
          style={{
            background: "radial-gradient(circle at 20% 0%, rgba(239,68,68,0.35), transparent 55%), linear-gradient(140deg, #0a0a0a, #1a1a1a 55%, #2a0606)",
            aspectRatio: "9 / 16",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="chip-label text-brand-red">ASCEND</p>
            <p className="chip-label text-brand-silver">1% Better</p>
          </div>

          <div className="mt-12">
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand-silver">{headline}</p>
            <p
              className="mt-3 font-black leading-none"
              style={{ fontSize: "clamp(56px, 16vw, 96px)", letterSpacing: "-0.04em" }}
            >
              {big}
            </p>
            <p className="mt-3 text-base font-medium italic text-white/90">{caption}</p>
          </div>

          <div className="absolute inset-x-8 bottom-8">
            <div className="h-px w-12 bg-brand-red" />
            <p className="mt-3 text-sm font-bold">{athlete}</p>
            <p className="text-[11px] uppercase tracking-widest text-brand-silver">
              Become 1% Better Than Yesterday
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={nativeShare}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-bold text-white shadow-glow-red disabled:opacity-50"
          >
            <Share2 className="size-4" /> Share
          </button>
          <button
            onClick={download}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-brand-gray py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Download className="size-4" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}
