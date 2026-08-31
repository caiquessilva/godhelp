import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useRef, useState } from "react";
import { List, Loader2, LocateFixed, Map as MapIcon, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PlaceCard } from "@/components/PlaceCard";
import { useGeo } from "@/hooks/useGeo";
import { useFavorites } from "@/hooks/useFavorites";
import { CATEGORIES, type CategoryId } from "@/lib/places";
import { fetchNearbyPlaces, geocode } from "@/lib/places.functions";

const PlacesMap = lazy(() => import("@/components/PlacesMap"));

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

const PULL_THRESHOLD = 70;

function MapSkeleton() {
  return (
    <div className="flex h-[60vh] items-center justify-center rounded-2xl border border-border bg-card">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}

function PlaceListSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((item) => (
        <li
          key={item}
          className="animate-shimmer rounded-2xl border border-border bg-card p-3"
          style={{ animationDelay: `${item * 0.12}s` }}
        >
          <div className="flex items-start gap-3">
            <span className="block h-16 w-16 shrink-0 rounded-xl bg-muted" />
            <span className="flex-1 space-y-2 py-1">
              <span className="block h-4 w-3/4 rounded-full bg-muted" />
              <span className="block h-3 w-1/2 rounded-full bg-muted" />
              <span className="block h-3 w-2/3 rounded-full bg-muted" />
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="block h-10 w-10 rounded-full bg-muted" />
              <span className="block h-10 w-10 rounded-full bg-muted" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SourceNotice({ places }: { places: Place[] }) {
  const sources = new Set(places.map((place) => place.source ?? "google"));
  if (!sources.has("cache") && !sources.has("osm")) return null;
  const message = sources.has("osm")
    ? "Dados aproximados do OpenStreetMap — o Google Maps está indisponível agora."
    : "Mostrando a última atualização salva em cache desta região.";
  return (
    <p
      role="status"
      className="mb-3 flex items-start gap-2 rounded-2xl border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function NearbyPage() {
  const { coords, status, error, locate, setCoords } = useGeo();
  const [category, setCategory] = useState<CategoryId>("parques");
  const [view, setView] = useState<"lista" | "mapa">("lista");
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

  // pull-to-refresh
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (event: React.TouchEvent) => {
    if (view !== "lista" || refreshing) return;
    if (window.scrollY > 0) return;
    startY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (startY.current == null) return;
    const delta = (event.touches[0]?.clientY ?? 0) - startY.current;
    setPull(delta > 0 ? Math.min(delta * 0.5, PULL_THRESHOLD + 20) : 0);
  };

  const onTouchEnd = async () => {
    const shouldRefresh = pull >= PULL_THRESHOLD;
    startY.current = null;
    setPull(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    locate();
    try {
      await placesQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const indicatorVisible = refreshing || pull > 0;

  return (
    <AppShell title="Perto de mim" subtitle={coords?.label ?? "Onde você está agora"}>
      <form
        className="flex items-center gap-2 rounded-2xl border border-input bg-card px-3 py-1.5 focus-within:border-primary"
        onSubmit={(event) => {
          event.preventDefault();
          if (address.trim().length >= 3) addressMutation.mutate(address.trim());
        }}
      >
        <button
          type="button"
          onClick={locate}
          aria-label="Usar minha localização"
          className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent"
        >
          {status === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <LocateFixed className="h-5 w-5" aria-hidden />
          )}
        </button>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Buscar endereço ou usar sua localização"
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none"
        />
        <button
          type="submit"
          aria-label="Buscar endereço"
          className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent"
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
            className={`flex-1 rounded-full px-2 py-3 text-sm font-semibold transition-colors ${
              category === item.id
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2 rounded-full border border-border bg-card p-1">
        {(
          [
            { id: "lista", label: "Lista", Icon: List },
            { id: "mapa", label: "Mapa", Icon: MapIcon },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-pressed={view === id}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
              view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div
        className="mt-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => void onTouchEnd()}
      >
        {view === "lista" && indicatorVisible ? (
          <div
            className="flex items-center justify-center overflow-hidden transition-[height]"
            style={{ height: refreshing ? 36 : pull }}
          >
            <Loader2
              className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }}
              aria-hidden
            />
          </div>
        ) : null}

        {!coords ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <LocateFixed className="h-6 w-6 text-muted-foreground" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">
              Toque no ícone de localização para ver o que está perto.
            </p>
          </div>
        ) : placesQuery.isPending ? (
          view === "mapa" ? <MapSkeleton /> : <PlaceListSkeleton />
        ) : placesQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Não foi possível buscar os locais agora.
          </p>
        ) : view === "mapa" ? (
          <ClientOnly fallback={<MapSkeleton />}>
            <Suspense fallback={<MapSkeleton />}>
              <PlacesMap
                places={placesQuery.data}
                center={{ latitude: coords.latitude, longitude: coords.longitude }}
                category={category}
              />
            </Suspense>
          </ClientOnly>
        ) : placesQuery.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nada encontrado num raio de 3 km.
          </p>
        ) : (
          <>
            <SourceNotice places={placesQuery.data} />
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
          </>
        )}
      </div>
    </AppShell>
  );
}
