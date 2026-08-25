import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, LocateFixed, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PlaceCard } from "@/components/PlaceCard";
import { useGeo } from "@/hooks/useGeo";
import { useFavorites } from "@/hooks/useFavorites";
import { CATEGORIES, type CategoryId } from "@/lib/places";
import { fetchNearbyPlaces, geocode } from "@/lib/places.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GODHELP — parques, academias e restaurantes perto de você" },
      {
        name: "description",
        content:
          "GODHELP encontra parques, academias e restaurantes próximos em poucos toques. Feito para quem tem pouco tempo.",
      },
      { property: "og:title", content: "GODHELP — perto de você, em poucos toques" },
      {
        property: "og:description",
        content: "Parques, academias e restaurantes próximos, por geolocalização.",
      },
    ],
  }),
  component: NearbyPage,
});

function NearbyPage() {
  const { coords, status, error, locate, setCoords } = useGeo();
  const [category, setCategory] = useState<CategoryId>("parques");
  const [address, setAddress] = useState("");
  const nearbyFn = useServerFn(fetchNearbyPlaces);
  const geocodeFn = useServerFn(geocode);
  const { favoriteIds, toggle } = useFavorites();

  const placesQuery = useQuery({
    queryKey: ["nearby", category, coords?.latitude, coords?.longitude],
    enabled: Boolean(coords),
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      nearbyFn({
        data: {
          latitude: coords!.latitude,
          longitude: coords!.longitude,
          category,
          radius: 3000,
        },
      }),
  });

  const addressMutation = useMutation({
    mutationFn: (value: string) => geocodeFn({ data: { address: value } }),
    onSuccess: (result) => {
      setCoords(result);
      setAddress("");
    },
    onError: () => toast.error("Endereço não encontrado. Tente outro."),
  });

  return (
    <AppShell title="Perto de mim" subtitle={coords?.label ?? "Onde você está agora"}>
      <button
        type="button"
        onClick={locate}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-bold text-primary-foreground transition-opacity active:opacity-80"
      >
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="h-5 w-5" aria-hidden />
        )}
        Usar minha localização
      </button>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (address.trim().length >= 3) addressMutation.mutate(address.trim());
        }}
      >
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Ou digite um endereço"
          className="min-w-0 flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary"
        />
        <button
          type="submit"
          aria-label="Buscar endereço"
          className="rounded-2xl border border-input bg-card px-4 text-foreground"
        >
          {addressMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Search className="h-5 w-5" aria-hidden />
          )}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={`flex-1 rounded-xl px-2 py-3 text-sm font-semibold transition-colors ${
              category === item.id
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!coords ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Toque em “Usar minha localização” para ver o que está perto.
          </p>
        ) : placesQuery.isPending ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Buscando…
          </p>
        ) : placesQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Não foi possível buscar os locais agora.
          </p>
        ) : placesQuery.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nada encontrado num raio de 3 km.
          </p>
        ) : (
          <ul className="space-y-3">
            {placesQuery.data.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                category={category}
                isFavorite={favoriteIds.has(place.id)}
                onToggleFavorite={() => toggle.mutate({ place, category })}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
