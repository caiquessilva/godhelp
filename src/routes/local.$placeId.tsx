import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Globe,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Star,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useFavorites } from "@/hooks/useFavorites";
import {
  appleMapsUrl,
  categoryLabel,
  directionsUrl,
  mapEmbedUrl,
  titleCase,
  wazeUrl,
  type Place,
} from "@/lib/places";
import { fetchPlaceDetails } from "@/lib/places.functions";

export const Route = createFileRoute("/local/$placeId")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search['category'] === "string" ? (search['category'] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Detalhes do local — GODHELP" },
      {
        name: "description",
        content: "Endereço, horário, contato e rota do local escolhido no GODHELP.",
      },
      { property: "og:title", content: "Detalhes do local — GODHELP" },
      { property: "og:description", content: "Veja o local e trace a rota em um toque." },
    ],
  }),
  component: PlaceDetailPage,
});

function RouteSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const options = [
    { label: "Google Maps", url: directionsUrl(place) },
    { label: "Apple Maps", url: appleMapsUrl(place) },
    { label: "Waze", url: wazeUrl(place) },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40"
      role="dialog"
      aria-modal="true"
      aria-label="Escolher aplicativo de rota"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-card p-4 pb-8 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Abrir rota com…</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ul className="space-y-2">
          {options.map((option) => (
            <li key={option.label}>
              <a
                href={option.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 text-sm font-semibold"
              >
                <Navigation className="h-5 w-5 text-primary" aria-hidden />
                {option.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlaceDetailPage() {
  const { placeId } = Route.useParams();
  const { category } = Route.useSearch();
  const detailsFn = useServerFn(fetchPlaceDetails);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const { favoriteIds, toggle } = useFavorites();

  const detailsQuery = useQuery({
    queryKey: ["place", placeId],
    queryFn: () => detailsFn({ data: { placeId } }),
  });

  const place = detailsQuery.data;
  const isFavorite = place ? favoriteIds.has(place.id) : false;
  const embedUrl = place ? mapEmbedUrl(place) : null;

  async function sharePlace() {
    if (!place) return;
    const url = window.location.href;
    const payload = { title: place.name, text: `${place.name} — GODHELP`, url };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return; // usuário cancelou
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível compartilhar agora.");
    }
  }

  return (
    <AppShell
      title={place ? titleCase(place.name) : "Local"}
      subtitle={category ? categoryLabel(category) : undefined}
      hideNav
      leading={
        <Link
          to="/"
          aria-label="Voltar"
          className="shrink-0 rounded-full border border-border p-2.5 text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
      }
    >
      {detailsQuery.isPending ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : !place ? (
        <p className="py-8 text-center text-sm text-destructive">Local não encontrado.</p>
      ) : (
        <div className="space-y-4">
          {place.photoName ? (
            <img
              src={`/api/place-photo?name=${encodeURIComponent(place.photoName)}`}
              alt={`Foto de ${place.name}`}
              loading="lazy"
              className="aspect-[16/9] w-full rounded-2xl border border-border object-cover"
            />
          ) : null}

          {embedUrl ? (
            <iframe
              title={`Mapa de ${place.name}`}
              src={embedUrl}
              loading="lazy"
              className="aspect-[16/10] w-full rounded-2xl border border-border"
            />
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => toggle.mutate({ place, category: category || "parques" })}
              aria-pressed={isFavorite}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 text-xs font-semibold"
            >
              <Heart
                className={`h-5 w-5 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`}
                aria-hidden
              />
              {isFavorite ? "Salvo" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={sharePlace}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 text-xs font-semibold"
            >
              <Share2 className="h-5 w-5 text-muted-foreground" aria-hidden />
              Compartilhar
            </button>
            {place.phone ? (
              <a
                href={`tel:${place.phone}`}
                className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 text-xs font-semibold"
              >
                <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
                Ligar
              </a>
            ) : (
              <span className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 text-xs font-semibold opacity-40">
                <Phone className="h-5 w-5 text-muted-foreground" aria-hidden />
                Ligar
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            {place.address ? (
              <p className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                {place.address}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {place.rating != null ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current" aria-hidden />
                  {place.rating.toFixed(1).replace(".", ",")}
                </span>
              ) : null}
              {place.openNow != null ? (
                <span className={place.openNow ? "text-primary" : ""}>
                  {place.openNow ? "Aberto agora" : "Fechado agora"}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRouteSheetOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground"
          >
            <Navigation className="h-5 w-5" aria-hidden />
            Traçar rota
          </button>

          {place.website ? (
            <a
              href={place.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold"
            >
              <Globe className="h-5 w-5 text-primary" aria-hidden />
              Site oficial
            </a>
          ) : null}

          {place.openingHours && place.openingHours.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Horários
              </h2>
              <ul className="mt-2 space-y-1 text-sm">
                {place.openingHours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {routeSheetOpen ? (
            <RouteSheet place={place} onClose={() => setRouteSheetOpen(false)} />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
