import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Place } from "@/lib/places";

export interface FavoriteRow {
  id: string;
  place_id: string;
  name: string;
  address: string | null;
  category: string;
  latitude: number | null;
  longitude: number | null;
}

const STORAGE_KEY = "godhelp-favorites";

/* ------------------------------------------------------------------ */
/* Favoritos locais (navegação anônima, rápido e offline)              */
/* ------------------------------------------------------------------ */

let localCache: FavoriteRow[] = [];
const listeners = new Set<() => void>();

function readLocal(): FavoriteRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as FavoriteRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: FavoriteRow[]) {
  localCache = rows;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota/modo privado: mantém só em memória */
  }
  listeners.forEach((listener) => listener());
}

function subscribeLocal(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useLocalFavorites(): FavoriteRow[] {
  const hydrated = useRef(false);
  if (typeof window !== "undefined" && !hydrated.current) {
    hydrated.current = true;
    localCache = readLocal();
  }
  return useSyncExternalStore(
    subscribeLocal,
    () => localCache,
    () => [],
  );
}

function toRow(place: Place, category: string): FavoriteRow {
  return {
    id: `local:${place.id}`,
    place_id: place.id,
    name: place.name,
    address: place.address ?? null,
    category,
    latitude: place.latitude ?? null,
    longitude: place.longitude ?? null,
  };
}

/* ------------------------------------------------------------------ */

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const local = useLocalFavorites();

  const query = useQuery({
    queryKey: ["favorites", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: async (): Promise<FavoriteRow[]> => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, place_id, name, address, category, latitude, longitude")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Ao entrar na conta, sobe os favoritos salvos localmente para o banco.
  const syncing = useRef(false);
  useEffect(() => {
    if (!user || syncing.current || local.length === 0) return;
    syncing.current = true;
    void (async () => {
      const { error } = await supabase.from("favorites").upsert(
        local.map((row) => ({
          user_id: user.id,
          place_id: row.place_id,
          name: row.name,
          address: row.address,
          category: row.category,
          latitude: row.latitude,
          longitude: row.longitude,
        })),
        { onConflict: "user_id,place_id", ignoreDuplicates: true },
      );
      if (!error) {
        writeLocal([]);
        void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      }
      syncing.current = false;
    })();
  }, [user, local, queryClient]);

  const favorites = user ? (query.data ?? []) : local;

  const toggle = useMutation({
    mutationFn: async ({ place, category }: { place: Place; category: string }) => {
      if (!user) {
        const exists = localCache.some((row) => row.place_id === place.id);
        writeLocal(
          exists
            ? localCache.filter((row) => row.place_id !== place.id)
            : [toRow(place, category), ...localCache],
        );
        return exists ? ("removed" as const) : ("added" as const);
      }
      const existing = query.data?.find((row) => row.place_id === place.id);
      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        return "removed" as const;
      }
      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        place_id: place.id,
        name: place.name,
        address: place.address,
        category,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(result === "added" ? "Salvo nos favoritos" : "Removido dos favoritos");
    },
    onError: () => {
      toast.error("Não foi possível salvar agora.");
    },
  });

  const remove = useMutation({
    mutationFn: async (row: FavoriteRow) => {
      if (!user || row.id.startsWith("local:")) {
        writeLocal(localCache.filter((item) => item.place_id !== row.place_id));
        return;
      }
      const { error } = await supabase.from("favorites").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Removido dos favoritos");
    },
    onError: () => {
      toast.error("Não foi possível remover agora.");
    },
  });

  const favoriteIds = new Set(favorites.map((row) => row.place_id));

  return {
    favorites,
    isLoading: Boolean(user) && query.isLoading,
    favoriteIds,
    toggle,
    remove,
  };
}
