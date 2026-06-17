const GA_ID = "G-QD4F1PTTH4";

export function loadGoogleAnalytics(): void {
  console.log("loadGoogleAnalytics() called");
  if (document.querySelector(`script[src*="${GA_ID}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  console.log("script injected");

  window.dataLayer = window.dataLayer ?? [];
  function gtag(...args: unknown[]) { window.dataLayer.push(args); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID);
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
