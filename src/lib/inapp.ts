import { useEffect, useState } from "react";

export type Platform = "ios" | "android" | "other";

export interface Env {
  /** Navegador embutido (Instagram, TikTok, Facebook, etc.). */
  inApp: boolean;
  platform: Platform;
}

const IN_APP_PATTERNS =
  /(Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|TikTok|musical_ly|BytedanceWebview|Twitter|Line\/|WhatsApp|Snapchat|Pinterest|LinkedInApp|KAKAOTALK)/i;

export function detectEnv(userAgent: string): Env {
  const platform: Platform = /iPhone|iPad|iPod/i.test(userAgent)
    ? "ios"
    : /Android/i.test(userAgent)
      ? "android"
      : "other";
  return { inApp: IN_APP_PATTERNS.test(userAgent), platform };
}

/** SSR-safe: só detecta após a hidratação. */
export function useEnv(): Env {
  const [env, setEnv] = useState<Env>({ inApp: false, platform: "other" });
  useEffect(() => {
    setEnv(detectEnv(navigator.userAgent));
  }, []);
  return env;
}

type Target = {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
};

function coords(place: Target): string | null {
  if (place.latitude == null || place.longitude == null) return null;
  return `${place.latitude},${place.longitude}`;
}

function label(place: Target): string {
  return encodeURIComponent(place.name);
}

/**
 * Links de rota que abrem o app nativo quando o usuário está num
 * navegador embutido (Instagram/TikTok), onde https costuma ficar preso.
 */
export function googleRouteUrl(place: Target, env: Env): string {
  const ll = coords(place);
  const dest = ll ?? encodeURIComponent(place.address ?? place.name);
  if (env.inApp && ll) {
    if (env.platform === "ios") return `comgooglemaps://?daddr=${ll}&directionsmode=driving`;
    if (env.platform === "android") return `geo:${ll}?q=${ll}(${label(place)})`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

export function appleRouteUrl(place: Target, env: Env): string {
  const ll = coords(place);
  if (env.inApp && ll && env.platform === "ios") return `maps://?daddr=${ll}&dirflg=d`;
  if (ll) return `https://maps.apple.com/?daddr=${ll}`;
  return `https://maps.apple.com/?q=${encodeURIComponent(place.address ?? place.name)}`;
}

export function wazeRouteUrl(place: Target, env: Env): string {
  const ll = coords(place);
  if (env.inApp && ll) return `waze://?ll=${ll}&navigate=yes`;
  if (ll) return `https://waze.com/ul?ll=${ll}&navigate=yes`;
  return `https://waze.com/ul?q=${encodeURIComponent(place.address ?? place.name)}`;
}

/** geo: genérico — abre o seletor de mapas do sistema no Android. */
export function geoUrl(place: Target): string | null {
  const ll = coords(place);
  return ll ? `geo:${ll}?q=${ll}(${label(place)})` : null;
}
