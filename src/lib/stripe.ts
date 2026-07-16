export const PRICE_IDS = {
  STANDARD_MONTHLY:  "price_1TtndoFjbj4UzaeOQylXtpvy",
  STANDARD_ANNUAL:   "price_1TtnhLFjbj4UzaeOasACnvcY",
  PRO_MONTHLY:       "price_1TtnjFFjbj4UzaeOjYPKMP9R",
  PRO_ANNUAL:        "price_1TtnjfFjbj4UzaeOQVWellKp",
  FOUNDING_MEMBER:   "price_1TtnldFjbj4UzaeOz8P979WZ",
} as const;

export async function createCheckoutSession(
  priceId: string,
  userId: string,
  email: string,
  isFoundingMember = false,
): Promise<void> {
  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId, userId, email, isFoundingMember }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (data.url) window.location.href = data.url;
}

export async function createPortalSession(customerId: string): Promise<void> {
  const res = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (data.url) window.location.href = data.url;
}
