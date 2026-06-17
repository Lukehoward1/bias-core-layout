const STORAGE_KEY = "streambias_cookie_consent";

export type ConsentStatus = "accepted" | "rejected" | "unset";

export function getConsentStatus(): ConsentStatus {
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "accepted" || value === "rejected") return value;
  return "unset";
}

export function setConsentStatus(status: "accepted" | "rejected"): void {
  localStorage.setItem(STORAGE_KEY, status);
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: { status } }));
}

export function resetConsentStatus(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: { status: "unset" } }));
}
