import logoAsset from "@/assets/ascend-logo.jpg.asset.json";

export function AscendLogo({ className = "size-10", showWordmark = false }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className={`relative overflow-hidden rounded-xl ring-1 ring-brand-red/40 shadow-glow-red ${className}`}>
        <img
          src={logoAsset.url}
          alt="Ascend"
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>
      {showWordmark && (
        <span className="text-display text-xl font-bold italic tracking-tight text-white">
          ASCEND
        </span>
      )}
    </div>
  );
}
