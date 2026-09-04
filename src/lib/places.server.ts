import { CATEGORIES, haversineMeters, type CategoryId, type Place } from "./places";
import { geohashCenter, geohashEncode } from "./geohash";
import { readCache, writeCache } from "./places-cache.server";
import { geocodeAddressOSM, placeDetailsOSM, searchNearbyOSM } from "./overpass.server";
import { geosearchPois, indexPois, isEnoughCoverage } from "./poi-store.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.primaryTypeDisplayName";

const MAX_RESULTS = 12;
const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

function cacheSet(key: string, value: unknown) {
  if (cache.size > 300) cache.clear();
  cache.set(key, { at: Date.now(), value });
}

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) {
    throw new Error("Conexão com o Google Maps indisponível.");
  }
  return { lovableKey, mapsKey };
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Maps gateway failed [${response.status}]: ${body}`);
    if (response.status === 403) {
      throw new Error("A chave do Google Maps recusou a requisição (403).");
    }
    throw new Error(`Não foi possível buscar os locais (${response.status}).`);
  }
  return response.json();
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  primaryTypeDisplayName?: { text?: string };
}

function mapPlace(raw: RawPlace, origin?: { lat: number; lng: number }): Place | null {
  if (!raw.id || !raw.displayName?.text) return null;
  const latitude = raw.location?.latitude ?? null;
  const longitude = raw.location?.longitude ?? null;
  return {
    id: raw.id,
    name: raw.displayName.text,
    address: raw.formattedAddress ?? null,
    latitude,
    longitude,
    rating: raw.rating ?? null,
    ratingCount: raw.userRatingCount ?? null,
    openNow: raw.currentOpeningHours?.openNow ?? null,
    typeLabel: raw.primaryTypeDisplayName?.text ?? null,
    distanceMeters:
      origin && latitude != null && longitude != null
        ? Math.round(haversineMeters(origin.lat, origin.lng, latitude, longitude))
        : null,
  };
}

/** Recalcula distância/ordem a partir da posição real do usuário. */
function rankFor(places: Place[], lat: number, lng: number): Place[] {
  return places
    .map((place) => ({
      ...place,
      distanceMeters:
        place.latitude != null && place.longitude != null
          ? Math.round(haversineMeters(lat, lng, place.latitude, place.longitude))
          : null,
    }))
    .sort((a, b) => (a.distanceMeters ?? 1e9) - (b.distanceMeters ?? 1e9));
}

export async function searchNearby(input: {
  latitude: number;
  longitude: number;
  category: CategoryId;
  radius: number;
}): Promise<Place[]> {
  const types = CATEGORIES.find((c) => c.id === input.category)?.googleTypes ?? ["park"];

  // Agrupa usuários próximos numa célula de geohash: a mesma região reaproveita
  // a mesma resposta, tanto na memória do worker quanto no cache compartilhado.
  const geohash = geohashEncode(input.latitude, input.longitude, 6);
  const center = geohashCenter(geohash);
  const cacheKey = { geohash, category: input.category, radius: input.radius };
  const memoryKey = ["nearby", geohash, input.category, input.radius].join(":");

  const memoryHit = cacheGet<Place[]>(memoryKey);
  if (memoryHit) return rankFor(memoryHit, input.latitude, input.longitude);

  const sharedHit = await readCache(cacheKey);
  if (sharedHit) {
    cacheSet(memoryKey, sharedHit);
    return rankFor(sharedHit, input.latitude, input.longitude);
  }

  // BFF: busca espacial por raio no índice de POIs. Cobre usuários em células
  // vizinhas de geohash, evitando nova chamada paga quando já há dados recentes.
  const geoHits = await geosearchPois({ ...input, limit: MAX_RESULTS });
  if (isEnoughCoverage(geoHits)) {
    cacheSet(memoryKey, geoHits);
    await writeCache(cacheKey, geoHits);
    return rankFor(geoHits, input.latitude, input.longitude);
  }

  try {
    const places = await searchNearbyGoogle(input, center, types);
    cacheSet(memoryKey, places);
    await writeCache(cacheKey, places);
    await indexPois(input.category, places);
    return rankFor(places, input.latitude, input.longitude);
  } catch (error) {
    console.error("Google Places indisponível, aplicando fallback", error);
  }

  // índice espacial parcial ainda é melhor do que cair para OSM/tela vazia
  if (geoHits.length) return rankFor(geoHits, input.latitude, input.longitude);

  // 1) cache expirado da mesma região (melhor do que tela vazia)
  const staleHit = await readCache(cacheKey, { allowStale: true });
  if (staleHit?.length) {
    return rankFor(
      staleHit.map((place) => ({ ...place, source: "cache" as const })),
      input.latitude,
      input.longitude,
    );
  }

  // 2) OpenStreetMap / Overpass (aberto, sem cota)
  const osmPlaces = await searchNearbyOSM(input);
  if (osmPlaces.length) {
    cacheSet(memoryKey, osmPlaces);
    return osmPlaces;
  }

  // 3) nunca quebra: lista vazia, a UI mostra o estado apropriado
  return [];
}

async function searchNearbyGoogle(
  input: { latitude: number; longitude: number; category: CategoryId; radius: number },
  center: { latitude: number; longitude: number },
  types: string[],
): Promise<Place[]> {
  const { lovableKey, mapsKey } = credentials();
  const data = await handleResponse(
    await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: types,
        maxResultCount: MAX_RESULTS,
        languageCode: "pt-BR",
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            // centro da célula: mantém a resposta reutilizável por toda a região
            center: { latitude: center.latitude, longitude: center.longitude },
            radius: input.radius,
          },
        },
      }),
    }),
  );

  return ((data as { places?: RawPlace[] }).places ?? [])
    .map((raw) => mapPlace(raw))
    .filter((p): p is Place => p !== null)
    .map((place) => ({ ...place, source: "google" as const }));
}


export async function placeDetails(input: {
  placeId: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): Promise<Place> {
  const key = `details:${input.placeId}`;
  let place = cacheGet<Place>(key);

  if (!place && input.placeId.startsWith("osm:")) {
    const osm = await placeDetailsOSM(input.placeId);
    if (!osm) throw new Error("Local não encontrado.");
    place = osm;
    cacheSet(key, place);
  }

  if (!place) {
    try {
      place = await placeDetailsGoogle(input.placeId);
      cacheSet(key, place);
    } catch (error) {
      console.error("Detalhes do Google indisponíveis", error);
      throw new Error("Não foi possível carregar este local agora. Tente novamente em instantes.");
    }
  }

  if (
    input.latitude != null &&
    input.longitude != null &&
    place.latitude != null &&
    place.longitude != null
  ) {
    return {
      ...place,
      distanceMeters: Math.round(
        haversineMeters(input.latitude, input.longitude, place.latitude, place.longitude),
      ),
    };
  }
  return place;
}

async function placeDetailsGoogle(placeId: string): Promise<Place> {
  {
    const { lovableKey, mapsKey } = credentials();
    const detailsMask = [
      FIELD_MASK.replaceAll("places.", ""),
      "nationalPhoneNumber",
      "websiteUri",
      "currentOpeningHours.weekdayDescriptions",
      "photos",
    ].join(",");
    const data = await handleResponse(
      await fetch(
        `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
        {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey,
            "X-Goog-FieldMask": detailsMask,
          },
        },
      ),
    );
    const raw = data as RawPlace & {
      nationalPhoneNumber?: string;
      websiteUri?: string;
      currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
      photos?: { name?: string }[];
    };
    const mapped = mapPlace(raw);
    if (!mapped) throw new Error("Local não encontrado.");
    return {
      ...mapped,
      phone: raw.nationalPhoneNumber ?? null,
      website: raw.websiteUri ?? null,
      openingHours: raw.currentOpeningHours?.weekdayDescriptions ?? null,
      photoName: raw.photos?.[0]?.name ?? null,
      source: "google" as const,
    };
  }
}

export async function geocodeAddress(address: string) {
  try {
    return await geocodeAddressGoogle(address);
  } catch (error) {
    console.error("Geocoding do Google indisponível, usando OpenStreetMap", error);
    const fallback = await geocodeAddressOSM(address);
    if (!fallback) throw new Error("Endereço não encontrado.");
    return fallback;
  }
}

async function geocodeAddressGoogle(address: string) {
  const { lovableKey, mapsKey } = credentials();
  const data = await handleResponse(
    await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?language=pt-BR&address=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    ),
  );
  const result = (
    data as {
      results?: { geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }[];
    }
  ).results?.[0];
  if (!result?.geometry?.location) {
    throw new Error("Endereço não encontrado.");
  }
  return {
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    label: result.formatted_address ?? address,
  };
}
