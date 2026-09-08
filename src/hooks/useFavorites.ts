import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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

/* Favoritos ficam sempre no próprio aparelho — o app não tem conta. */

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
  const [rows, setRows] = useState<FavoriteRow[]>(localCache);

  useEffect(() => {
    localCache = readLocal();
    setRows(localCache);
    return subscribeLocal(() => setRows(localCache));
  }, []);

  return rows;
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

export function useFavorites() {
  const favorites = useLocalFavorites();

  const toggle = useMutation({
    mutationFn: async ({ place, category }: { place: Place; category: string }) => {
      const exists = localCache.some((row) => row.place_id === place.id);
      writeLocal(
        exists
          ? localCache.filter((row) => row.place_id !== place.id)
          : [toRow(place, category), ...localCache],
      );
      return exists ? ("removed" as const) : ("added" as const);
    },
    onSuccess: (result) => {
      toast.success(result === "added" ? "Salvo nos favoritos" : "Removido dos favoritos");
    },
    onError: () => {
      toast.error("Não foi possível salvar agora.");
    },
  });

  const remove = useMutation({
    mutationFn: async (row: FavoriteRow) => {
      writeLocal(localCache.filter((item) => item.place_id !== row.place_id));
    },
    onSuccess: () => {
      toast.success("Removido dos favoritos");
    },
    onError: () => {
      toast.error("Não foi possível remover agora.");
    },
  });

  const favoriteIds = new Set(favorites.map((row) => row.place_id));

  return {
    favorites,
    isLoading: false,
    favoriteIds,
    toggle,
    remove,
  };
}
