import { getRequest, getRequestHeader } from "@tanstack/react-start/server";

export interface ApproxLocation {
  latitude: number;
  longitude: number;
  label: string;
  approximate: true;
}

function num(value: string | null | undefined): number | null {
  if (!value) return null;
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
    const latitude = num(cf["latitude"] as string | undefined);
    const longitude = num(cf["longitude"] as string | undefined);
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

/** Fallback aberto por IP quando a borda não fornece coordenadas (ex.: dev local). */
async function fromIpApi(): Promise<ApproxLocation | null> {
  try {
    const ip = clientIp();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(
      `https://ipapi.co/${ip ? `${ip}/` : ""}json/`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      latitude?: number;
      longitude?: number;
      city?: string;
      region?: string;
    };
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return null;
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      label: labelFrom(data.city, data.region),
      approximate: true,
    };
  } catch (error) {
    console.error("IP geolocation fallback falhou", error);
    return null;
  }
}

export async function approximateLocation(): Promise<ApproxLocation | null> {
  return fromEdgeHeaders() ?? fromCloudflareObject() ?? (await fromIpApi());
}
