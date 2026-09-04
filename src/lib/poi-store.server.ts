import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CategoryId, Place } from "./places";

/**
 * Índice espacial de POIs (equivalente ao GEOADD/GEOSEARCH do Redis).
 * Guardamos cada local uma única vez e consultamos por raio real, então
 * células vizinhas de geohash reaproveitam os mesmos dados sem nova chamada paga.
 */
const MAX_AGE_MINUTES = 180; // 3 h — mesma faixa do cache por quadrante
/** Cobertura mínima para considerar o resultado do índice suficiente. */
const MIN_HITS = 6;

export async function geosearchPois(input: {
  latitude: number;
  longitude: number;
  radius: number;
  category: CategoryId;
  limit?: number;
}): Promise<Place[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc("pois_geosearch", {
      _lat: input.latitude,
      _lng: input.longitude,
      _radius: input.radius,
      _category: input.category,
      _limit: input.limit ?? 12,
      _max_age_minutes: MAX_AGE_MINUTES,
    });

    if (error || !data) return [];

    return (data as { payload: unknown; distance_meters: number }[]).map((row) => ({
      ...(row.payload as Place),
      distanceMeters: Math.round(row.distance_meters),
    }));
  } catch (geoError) {
    console.error("pois_geosearch failed", geoError);
    return [];
  }
}

export function isEnoughCoverage(places: Place[]): boolean {
  return places.length >= MIN_HITS;
}

export async function indexPois(category: CategoryId, places: Place[]): Promise<void> {
  const rows = places
    .filter((place) => place.latitude != null && place.longitude != null)
    .map((place) => ({
      id: place.id,
      category,
      name: place.name,
      latitude: place.latitude as number,
      longitude: place.longitude as number,
      payload: place as unknown as never,
      refreshed_at: new Date().toISOString(),
    }));

  if (!rows.length) return;

  try {
    await supabaseAdmin.from("pois").upsert(rows, { onConflict: "id,category" });
  } catch (indexError) {
    console.error("pois index write failed", indexError);
  }
}
