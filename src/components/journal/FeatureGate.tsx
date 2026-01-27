import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureGateProps {
  /** Whether the feature is locked for the current plan */
  isLocked: boolean;
  /** Content to show (will be blurred if locked) */
  children: ReactNode;
  /** Feature name for the upgrade prompt */
  featureName?: string;
  /** Required plan to unlock (for display) */
  requiredPlan?: "standard" | "premium";
  /** Custom message for the overlay */
  message?: string;
  /** Additional class names for the container */
  className?: string;
  /** Whether to show a compact overlay (for smaller cards) */
  compact?: boolean;
}

/**
 * Wraps content with a blur overlay and upgrade prompt when the feature is locked.
 * Uses a non-intrusive inline prompt - no modals or blocking dialogs.
 */
export function FeatureGate({
  isLocked,
  children,
  featureName = "This feature",
  requiredPlan = "standard",
  message,
  className,
  compact = false,
}: FeatureGateProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  const planLabel = requiredPlan === "premium" ? "Premium" : "Standard";
  const defaultMessage = `${featureName} is available on ${planLabel} and above.`;

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content */}
      <div 
        className="blur-sm pointer-events-none select-none" 
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay with upgrade prompt */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className={cn(
          "text-center px-4",
          compact ? "max-w-[200px]" : "max-w-sm"
        )}>
          <div className={cn(
            "mx-auto rounded-full bg-muted flex items-center justify-center mb-3",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}>
            <Lock className={cn(
              "text-muted-foreground",
              compact ? "h-4 w-4" : "h-5 w-5"
            )} />
          </div>
          <p className={cn(
            "text-muted-foreground mb-3",
            compact ? "text-xs" : "text-sm"
          )}>
            {message || defaultMessage}
          </p>
          <Button 
            asChild 
            size={compact ? "sm" : "default"}
            variant="outline"
            className={cn(compact && "h-7 text-xs px-3")}
          >
            <Link to="/billing">
              View Plans
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * A smaller, inline badge-style lock indicator for headers/titles
 */
interface LockedBadgeProps {
  requiredPlan?: "standard" | "premium";
}

export function LockedBadge({ requiredPlan = "standard" }: LockedBadgeProps) {
  const planLabel = requiredPlan === "premium" ? "Premium" : "Standard";
  
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <Lock className="h-3 w-3" />
      {planLabel}
    </span>
  );
}

/**
 * Card-level feature gate that blurs only the card content (not the header/title).
 * Shows the card structure but obscures metrics, charts, and data.
 */
interface CardFeatureGateProps {
  /** Whether the feature is locked for the current plan */
  isLocked: boolean;
  /** Card content to show (will be blurred if locked) */
  children: ReactNode;
  /** Required plan to unlock */
  requiredPlan?: "standard" | "premium";
  /** Additional class names */
  className?: string;
}

export function CardFeatureGate({
  isLocked,
  children,
  requiredPlan = "standard",
  className,
}: CardFeatureGateProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  const planLabel = requiredPlan === "premium" ? "Premium" : "Standard";

  return (
    <div className={cn("relative", className)}>
      {/* Blurred content - subtle blur that still shows structure */}
      <div 
        className="blur-[5px] pointer-events-none select-none opacity-50" 
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Minimal overlay - subtle lock indicator */}
      <Link 
        to="/billing"
        className="absolute inset-0 flex items-center justify-center bg-background/20 rounded-lg cursor-pointer group transition-colors hover:bg-background/30"
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-7 w-7 rounded-full bg-muted/70 flex items-center justify-center group-hover:bg-muted/90 transition-colors">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded group-hover:bg-muted/80 transition-colors">
            {planLabel}
          </span>
        </div>
      </Link>
    </div>
  );
}

/**
 * Tier badge to show in card headers when content is locked
 */
interface TierBadgeProps {
  requiredPlan?: "standard" | "premium";
  className?: string;
}

export function TierBadge({ requiredPlan = "standard", className }: TierBadgeProps) {
  const planLabel = requiredPlan === "premium" ? "Premium" : "Standard";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded",
      className
    )}>
      <Lock className="h-2.5 w-2.5" />
      {planLabel}
    </span>
  );
}
