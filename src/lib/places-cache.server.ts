import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CategoryId, Place } from "./places";

/** TTL do cache compartilhado: 3 horas (faixa alvo 2–4 h). */
const TTL_MS = 3 * 60 * 60 * 1000;

export interface CacheKey {
  geohash: string;
  category: CategoryId;
  radius: number;
}

export async function readCache(key: CacheKey): Promise<Place[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("places_cache")
      .select("payload, expires_at")
      .eq("geohash", key.geohash)
      .eq("category", key.category)
      .eq("radius", key.radius)
      .maybeSingle();

    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() <= Date.now()) return null;
    return (data.payload as unknown as Place[]) ?? null;
  } catch (cacheError) {
    console.error("places_cache read failed", cacheError);
    return null;
  }
}

export async function writeCache(key: CacheKey, places: Place[]): Promise<void> {
  try {
    await supabaseAdmin.from("places_cache").upsert(
      {
        geohash: key.geohash,
        category: key.category,
        radius: key.radius,
        payload: places as unknown as never,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + TTL_MS).toISOString(),
      },
      { onConflict: "geohash,category,radius" },
    );
  } catch (cacheError) {
    console.error("places_cache write failed", cacheError);
  }
}
