import { CATEGORIES, haversineMeters, type CategoryId, type Place } from "./places";

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

export async function searchNearby(input: {
  latitude: number;
  longitude: number;
  category: CategoryId;
  radius: number;
}): Promise<Place[]> {
  const types = CATEGORIES.find((c) => c.id === input.category)?.googleTypes ?? ["park"];
  // Round coordinates (~110 m) so repeated lookups from the same spot reuse the cache.
  const key = [
    "nearby",
    input.category,
    input.latitude.toFixed(3),
    input.longitude.toFixed(3),
    input.radius,
  ].join(":");
  const cached = cacheGet<Place[]>(key);
  if (cached) return cached;

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
            center: { latitude: input.latitude, longitude: input.longitude },
            radius: input.radius,
          },
        },
      }),
    }),
  );

  const origin = { lat: input.latitude, lng: input.longitude };
  const places = ((data as { places?: RawPlace[] }).places ?? [])
    .map((raw) => mapPlace(raw, origin))
    .filter((p): p is Place => p !== null)
    .sort((a, b) => (a.distanceMeters ?? 1e9) - (b.distanceMeters ?? 1e9));

  cacheSet(key, places);
  return places;
}

export async function placeDetails(input: {
  placeId: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
}): Promise<Place> {
  const key = `details:${input.placeId}`;
  let place = cacheGet<Place>(key);

  if (!place) {
    const { lovableKey, mapsKey } = credentials();
    const data = await handleResponse(
      await fetch(
        `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(input.placeId)}?languageCode=pt-BR`,
        {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mapsKey,
            "X-Goog-FieldMask": FIELD_MASK.replaceAll("places.", ""),
          },
        },
      ),
    );
    const mapped = mapPlace(data as RawPlace);
    if (!mapped) throw new Error("Local não encontrado.");
    place = mapped;
    cacheSet(key, place);
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

export async function geocodeAddress(address: string) {
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
