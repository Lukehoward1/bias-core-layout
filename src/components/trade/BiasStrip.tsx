// Horizontal bias strip rendered below the chart on desktop (lg: and up).
// Hidden on mobile — MarketAwarenessPanel shows the same data there.
import { TF_BY_CODE } from "@/data/timeframes";
import { BiasRoleCard, BiasRoleSkeleton } from "@/components/trade/BiasRoleCard";
import type { MarketContext } from "@/services/contextEngine";
import type { TraderTimeframes, TfRole } from "@/services/traderTimeframes";

const ROLES: readonly TfRole[] = ["bias", "structure", "entry"] as const;

export interface BiasStripProps {
  context: MarketContext | null;
  resolvedTimeframes: TraderTimeframes;
  blockingRoles: readonly TfRole[];
  conditionsMet?: number;
}

export function BiasStrip({ context, resolvedTimeframes, blockingRoles, conditionsMet }: BiasStripProps) {
  const biasDir = context?.biasState.startsWith("Bullish") ? "bullish"
    : context?.biasState.startsWith("Bearish") ? "bearish"
    : null;
  const combinedBg = biasDir === "bullish"
    ? "border-success/30 bg-success/5"
    : biasDir === "bearish"
    ? "border-destructive/30 bg-destructive/5"
    : "border-border bg-card/40";

  return (
    <div className="hidden lg:grid lg:grid-cols-4 lg:gap-3 shrink-0 py-3">
      {/* Combined Bias — headline card */}
      <div className={`rounded-lg border p-3 flex flex-col gap-1 ${combinedBg}`}>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Combined Bias
        </span>
        {context ? (
          <>
            <span className="text-base font-bold text-foreground leading-tight">{context.biasState}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(context.biasConfidence)} conf
            </span>
            {conditionsMet !== undefined && (
              <span className="text-[11px] text-muted-foreground/90 mt-0.5">
                {conditionsMet} of 3 conditions
              </span>
            )}
          </>
        ) : (
          <>
            <BiasRoleSkeleton width="w-28" />
            <BiasRoleSkeleton width="w-16" />
          </>
        )}
      </div>

      {/* Per-TF cards */}
      {ROLES.map((role) => (
        <BiasRoleCard
          key={role}
          role={role}
          tfLabel={TF_BY_CODE[resolvedTimeframes[role]].label}
          roleData={context?.perRole[role]}
          blocking={blockingRoles.includes(role)}
          variant="card"
        />
      ))}
    </div>
  );
}
