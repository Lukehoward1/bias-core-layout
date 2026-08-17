// Authoritative server-side account limit per subscription tier.
// Single source of truth — imported by broker-connect.ts, webhook.ts, and cron.ts.

export function maxLinkedAccountsForTier(
  tier: string | null,
  status: string | null,
): number {
  if (status !== "active" && status !== "trialing") return 0;
  switch (tier) {
    case "standard":        return 1;
    case "pro":             return 3;
    case "founding_member": return 1;
    default:                return 0;
  }
}
