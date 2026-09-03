import { getRequest, getRequestHeader } from "@tanstack/react-start/server";

export interface ApproxLocation {
  latitude: number;
  longitude: number;
  label: string;
  approximate: true;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function labelFrom(city?: string | null, region?: string | null): string {
  const parts = [city, region].filter(Boolean);
  return parts.length ? `Perto de ${parts.join(", ")}` : "Localização aproximada";
}

/** Lê a geolocalização aproximada que a borda (Cloudflare) já anexa à requisição. */
function fromEdgeHeaders(): ApproxLocation | null {
  const latitude = num(getRequestHeader("cf-iplatitude"));
  const longitude = num(getRequestHeader("cf-iplongitude"));
  if (latitude == null || longitude == null) return null;
  const city = getRequestHeader("cf-ipcity");
  const region = getRequestHeader("cf-region") ?? getRequestHeader("cf-ipcountry");
  return { latitude, longitude, label: labelFrom(city, region), approximate: true };
}

/** Alguns runtimes expõem os dados só no objeto `cf` da requisição. */
function fromCloudflareObject(): ApproxLocation | null {
  try {
    const cf = (getRequest() as unknown as { cf?: Record<string, unknown> }).cf;
    if (!cf) return null;
    const latitude = num(cf["latitude"]);
    const longitude = num(cf["longitude"]);
    if (latitude == null || longitude == null) return null;
    return {
      latitude,
      longitude,
      label: labelFrom(cf["city"] as string | undefined, cf["region"] as string | undefined),
      approximate: true,
    };
  } catch {
    return null;
  }
}

function clientIp(): string | null {
  const forwarded = getRequestHeader("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip");
  if (!ip || ip.startsWith("127.") || ip.startsWith("::1") || ip.startsWith("192.168.")) return null;
  return ip;
}

/** Provedores abertos usados quando a borda não fornece coordenadas (ex.: dev local). */
function providers(ip: string | null): string[] {
  return [
    ip ? `https://ipwho.is/${ip}` : "https://ipwho.is/",
    ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : "https://get.geojs.io/v1/ip/geo.json",
    `https://ipapi.co/${ip ? `${ip}/` : ""}json/`,
  ];
}

async function fromIpApi(): Promise<ApproxLocation | null> {
  const ip = clientIp();
  for (const url of providers(ip)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const raw = (await response.json()) as Record<string, unknown>;
      if (raw["error"]) continue;
      const latitude = num(raw["latitude"]);
      const longitude = num(raw["longitude"]);
      if (latitude == null || longitude == null) continue;
      return {
        latitude,
        longitude,
        label: labelFrom(raw["city"] as string | undefined, raw["region"] as string | undefined),
        approximate: true,
      };
    } catch (error) {
      console.error(`IP geolocation falhou (${url})`, error);
    }
  }
  return null;
}

export async function approximateLocation(): Promise<ApproxLocation | null> {
  return fromEdgeHeaders() ?? fromCloudflareObject() ?? (await fromIpApi());
}

