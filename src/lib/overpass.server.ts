import { haversineMeters, type CategoryId, type Place } from "./places";

/**
 * Fallback aberto (OpenStreetMap / Overpass) para quando o Google Maps falha,
 * estoura cota ou a chave está indisponível. Sem chave de API e sem custo.
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PerlaLocal/1.0 (lovable app)";
const TIMEOUT_MS = 7000;
const MAX_RESULTS = 12;

const FILTERS: Record<CategoryId, string[]> = {
  parques: ['["leisure"="park"]', '["leisure"="garden"]'],
  academias: ['["leisure"="fitness_centre"]', '["amenity"="gym"]'],
  restaurantes: ['["amenity"="restaurant"]', '["amenity"="fast_food"]'],
};

const TYPE_LABELS: Record<CategoryId, string> = {
  parques: "Parque",
  academias: "Academia",
  restaurantes: "Restaurante",
};

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function addressOf(tags: Record<string, string> = {}): string | null {
  const parts = [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", "),
    tags["addr:suburb"] ?? tags["addr:neighbourhood"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}

function toPlace(
  element: OverpassElement,
  category: CategoryId,
  origin: { lat: number; lng: number },
): Place | null {
  const tags = element.tags ?? {};
  const name = tags["name"];
  if (!name) return null;
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;
  if (latitude == null || longitude == null) return null;
  return {
    id: `osm:${element.type}/${element.id}`,
    name,
    address: addressOf(tags),
    latitude,
    longitude,
    rating: null,
    ratingCount: null,
    openNow: null,
    typeLabel: TYPE_LABELS[category],
    distanceMeters: Math.round(haversineMeters(origin.lat, origin.lng, latitude, longitude)),
    phone: tags["phone"] ?? tags["contact:phone"] ?? null,
    website: tags["website"] ?? tags["contact:website"] ?? null,
    openingHours: tags["opening_hours"] ? [tags["opening_hours"]] : null,
    photoName: null,
    source: "osm",
  };
}

async function runOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!response.ok) {
        lastError = new Error(`Overpass ${response.status}`);
        continue;
      }
      const data = (await response.json()) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    } catch (error) {
      lastError = error;
    }
  }
  console.error("Overpass fallback failed", lastError);
  return [];
}

export async function searchNearbyOSM(input: {
  latitude: number;
  longitude: number;
  category: CategoryId;
  radius: number;
}): Promise<Place[]> {
  const filters = FILTERS[input.category] ?? FILTERS.parques;
  const around = `${Math.round(input.radius)},${input.latitude},${input.longitude}`;
  const body = filters
    .flatMap((filter) => [`node${filter}(around:${around});`, `way${filter}(around:${around});`])
    .join("");
  const query = `[out:json][timeout:20];(${body});out center ${MAX_RESULTS * 4};`;

  const elements = await runOverpass(query);
  const origin = { lat: input.latitude, lng: input.longitude };
  const seen = new Set<string>();
  return elements
    .map((element) => toPlace(element, input.category, origin))
    .filter((place): place is Place => {
      if (!place) return false;
      const key = place.name.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.distanceMeters ?? 1e9) - (b.distanceMeters ?? 1e9))
    .slice(0, MAX_RESULTS);
}

/** Detalhe de um local vindo do OSM (id no formato `osm:node/123`). */
export async function placeDetailsOSM(placeId: string): Promise<Place | null> {
  const raw = placeId.replace(/^osm:/, "");
  const [type, id] = raw.split("/");
  if (!type || !id || !/^\d+$/.test(id)) return null;
  const elements = await runOverpass(`[out:json][timeout:20];${type}(${id});out center 1;`);
  const element = elements[0];
  if (!element) return null;
  const origin = {
    lat: element.lat ?? element.center?.lat ?? 0,
    lng: element.lon ?? element.center?.lon ?? 0,
  };
  const tags = element.tags ?? {};
  const category: CategoryId = tags["amenity"] === "restaurant" || tags["amenity"] === "fast_food"
    ? "restaurantes"
    : tags["leisure"] === "fitness_centre" || tags["amenity"] === "gym"
      ? "academias"
      : "parques";
  const place = toPlace(element, category, origin);
  return place ? { ...place, distanceMeters: null } : null;
}

/** Geocodificação aberta usada quando o Geocoding do Google falha. */
export async function geocodeAddressOSM(address: string) {
  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&accept-language=pt-BR&q=${encodeURIComponent(address)}`;
    const response = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) return null;
    const results = (await response.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = results[0];
    if (!first?.lat || !first?.lon) return null;
    return {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      label: first.display_name ?? address,
    };
  } catch (error) {
    console.error("Nominatim fallback failed", error);
    return null;
  }
}
