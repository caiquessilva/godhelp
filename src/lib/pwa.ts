/**
 * Único ponto de registro do service worker (Workbox via vite-plugin-pwa).
 * Nunca registra em dev, iframe ou previews da Lovable — apenas no app publicado.
 */
const SW_URL = "/sw.js";

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.waiting?.scriptURL ??
          registration.installing?.scriptURL ??
          "";
        return scriptUrl.endsWith(SW_URL);
      })
      .map((registration) => registration.unregister()),
  );
}

export function setupServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (isBlockedContext()) {
    void unregisterAppServiceWorkers();
    return;
  }

  void navigator.serviceWorker
    .register(SW_URL, { scope: "/" })
    .then(async () => {
      // Guarda a aba Favoritos no cache para abrir mesmo sem internet.
      try {
        const cache = await caches.open("godhelp-pages");
        const response = await fetch("/favoritos", { credentials: "same-origin" });
        if (response.ok) await cache.put("/favoritos", response.clone());
      } catch {
        /* sem rede agora; será cacheada na próxima visita */
      }
    })
    .catch((error) => {
      console.error("service worker registration failed", error);
    });

}
