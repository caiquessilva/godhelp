import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Info, List, Loader2, LocateFixed, Map as MapIcon, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { PlaceCard } from "@/components/PlaceCard";
import { useGeo } from "@/hooks/useGeo";
import { useFavorites } from "@/hooks/useFavorites";
import { CATEGORIES, type CategoryId, type Place } from "@/lib/places";
import { fetchApproxLocation, fetchNearbyPlaces, geocode, suggestAddresses } from "@/lib/places.functions";


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
    <div
      className="relative h-[60vh] animate-shimmer overflow-hidden rounded-2xl border border-border bg-muted"
      aria-hidden
    >
      <span className="absolute left-[30%] top-[35%] block h-8 w-8 rounded-full bg-card/70" />
      <span className="absolute left-[60%] top-[20%] block h-8 w-8 rounded-full bg-card/70" />
      <span className="absolute left-[55%] top-[60%] block h-8 w-8 rounded-full bg-card/70" />
      <span className="absolute bottom-4 left-4 block h-8 w-32 rounded-full bg-card/70" />
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
  const { coords, status, error, locate, setCoords, restored, applyApproximate } = useGeo();
  const [category, setCategory] = useState<CategoryId>("parques");
  const [view, setView] = useState<"lista" | "mapa">("lista");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; label: string; latitude: number; longitude: number }[]
  >([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const nearbyFn = useServerFn(fetchNearbyPlaces);
  const geocodeFn = useServerFn(geocode);
  const approxFn = useServerFn(fetchApproxLocation);
  const suggestFn = useServerFn(suggestAddresses);
  const { favoriteIds, toggle } = useFavorites();

  // Autocomplete com debounce: sugere ruas/bairros enquanto o usuário digita.
  useEffect(() => {
    const query = address.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      suggestFn({ data: { query } })
        .then((result) => {
          setSuggestions(result);
          setSuggestOpen(result.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [address, suggestFn]);

  const pickSuggestion = (item: { label: string; latitude: number; longitude: number }) => {
    setCoords({ latitude: item.latitude, longitude: item.longitude, label: item.label.split(",")[0] ?? item.label });
    setAddress("");
    setSuggestions([]);
    setSuggestOpen(false);
  };

  // Estimativa por IP na borda: mostra locais da cidade/bairro antes do GPS fino.
  const approxQuery = useQuery({
    queryKey: ["approx-location"],
    enabled: restored && !coords,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: () => approxFn({}),
  });

  useEffect(() => {
    if (approxQuery.data) applyApproximate(approxQuery.data);
  }, [approxQuery.data, applyApproximate]);


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
      <div className="relative">
        <form
          className="flex items-center gap-2 rounded-2xl border border-input bg-card px-3 py-1.5 focus-within:border-primary"
          onSubmit={(event) => {
            event.preventDefault();
            setSuggestOpen(false);
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
            onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
            placeholder="Buscar rua, bairro ou usar sua localização"
            role="combobox"
            aria-expanded={suggestOpen}
            aria-autocomplete="list"
            aria-controls="address-suggestions"
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
        {suggestOpen && suggestions.length > 0 ? (
          <ul
            id="address-suggestions"
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          >
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pickSuggestion(item)}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="line-clamp-2">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

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

        {coords?.approximate ? (
          <button
            type="button"
            onClick={locate}
            className="mb-3 flex w-full items-start gap-2 rounded-2xl border border-border bg-muted/60 px-3 py-2 text-left text-xs text-muted-foreground"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Resultados aproximados pela sua região. Toque para usar sua localização exata.
          </button>
        ) : null}

        {!coords ? (
          !restored || status === "loading" || approxQuery.isFetching ? (
            <PlaceListSkeleton />
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <LocateFixed className="h-6 w-6 text-muted-foreground" aria-hidden />
              </span>
              <p className="text-sm text-muted-foreground">
                Toque no ícone de localização para ver o que está perto.
              </p>
            </div>
          )
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
