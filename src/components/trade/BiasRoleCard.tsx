// Shared per-TF role card/row used by both BiasStrip (desktop cards) and
// MarketAwarenessPanel (mobile list rows). Single source of truth for all
// direction icons, skeletons, blocking states, and reason display.
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import type { TriTimeframeBiasRole } from "@/services/candleData";
import type { TfRole } from "@/services/traderTimeframes";

export function DirectionIcon({
  dir,
  className,
}: {
  dir: TriTimeframeBiasRole["direction"];
  className?: string;
}) {
  if (dir === "bullish") return <TrendingUp className={className ?? "h-3.5 w-3.5 text-success"} />;
  if (dir === "bearish") return <TrendingDown className={className ?? "h-3.5 w-3.5 text-destructive"} />;
  return <Minus className={className ?? "h-3.5 w-3.5 text-muted-foreground"} />;
}

export function BiasRoleSkeleton({ width = "w-24" }: { width?: string }) {
  return <span className={`inline-block h-3 ${width} bg-muted/40 rounded animate-pulse`} />;
}

function roleName(role: TfRole): string {
  if (role === "bias") return "Bias";
  if (role === "structure") return "Structure";
  return "Entry";
}

export interface BiasRoleCardProps {
  role: TfRole;
  tfLabel: string;
  roleData: TriTimeframeBiasRole | undefined;
  blocking: boolean;
  /** "row" = compact horizontal list row (MarketAwarenessPanel mobile style).
   *  "card" = vertical card (BiasStrip desktop style). */
  variant: "row" | "card";
}

export function BiasRoleCard({
  role,
  tfLabel,
  roleData,
  blocking,
  variant,
}: BiasRoleCardProps) {
  const name = roleName(role);

  const blockingTitle = blocking && roleData
    ? `${name} (${tfLabel}) is ${roleData.direction} — not aligned with the other timeframes`
    : blocking
    ? "Not aligned with the other timeframes"
    : undefined;

  if (variant === "card") {
    return (
      <div
        className={`rounded-lg border p-3 flex flex-col gap-1.5 ${
          blocking ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-card/40"
        }`}
        title={blockingTitle}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {name} · {tfLabel}
          </span>
          {blocking && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-amber-500/90 font-medium">Not aligned</span>
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {roleData ? (
            <>
              <DirectionIcon dir={roleData.direction} />
              <span className="text-sm font-semibold text-foreground capitalize">
                {roleData.direction}
              </span>
              {roleData.direction !== "neutral" && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.round(roleData.confidence)}
                </span>
              )}
            </>
          ) : (
            <BiasRoleSkeleton width="w-20" />
          )}
        </div>
        {roleData?.reason ? (
          <p
            className="text-[11px] text-muted-foreground/90 line-clamp-2 leading-relaxed"
            title={roleData.reason}
          >
            {roleData.reason}
          </p>
        ) : roleData ? (
          <div className="h-[28px]" />
        ) : (
          <BiasRoleSkeleton width="w-28" />
        )}
      </div>
    );
  }

  // row variant — matches the existing MarketAwarenessPanel list style exactly
  return (
    <div
      className={`flex items-start gap-2 text-xs ${
        blocking ? "rounded-md bg-amber-500/10 px-2 py-1 -mx-2" : ""
      }`}
      title={blockingTitle}
    >
      {roleData ? (
        <DirectionIcon dir={roleData.direction} />
      ) : (
        <BiasRoleSkeleton width="w-3" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground w-[72px] shrink-0">
            {name} ({tfLabel})
          </span>
          {roleData ? (
            <span className="text-foreground font-medium capitalize">{roleData.direction}</span>
          ) : (
            <BiasRoleSkeleton width="w-14" />
          )}
          {roleData && roleData.direction !== "neutral" && (
            <span className="text-muted-foreground">{Math.round(roleData.confidence)}</span>
          )}
          {blocking && (
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <span className="text-[11px] text-amber-500/90">Not aligned</span>
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            </div>
          )}
        </div>
        {roleData?.reason && (
          <div className="text-muted-foreground/90 text-[11px] mt-0.5 line-clamp-2">
            {roleData.reason}
          </div>
        )}
      </div>
    </div>
  );
}
