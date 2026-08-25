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

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const toggle = useMutation({
    mutationFn: async ({ place, category }: { place: Place; category: string }) => {
      if (!user) throw new Error("not-authenticated");
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
    onError: (error: Error) => {
      toast.error(
        error.message === "not-authenticated"
          ? "Entre na sua conta para salvar favoritos."
          : "Não foi possível salvar agora.",
      );
    },
  });

  const favoriteIds = new Set((query.data ?? []).map((row) => row.place_id));

  return { favorites: query.data ?? [], isLoading: query.isLoading, favoriteIds, toggle };
}
