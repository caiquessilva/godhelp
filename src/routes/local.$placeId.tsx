import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Globe, Navigation, Phone, Star } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { categoryLabel, directionsUrl } from "@/lib/places";
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

function PlaceDetailPage() {
  const { placeId } = Route.useParams();
  const { category } = Route.useSearch();
  const detailsFn = useServerFn(fetchPlaceDetails);

  const detailsQuery = useQuery({
    queryKey: ["place", placeId],
    queryFn: () => detailsFn({ data: { placeId } }),
  });

  const place = detailsQuery.data;

  return (
    <AppShell
      title={place?.name ?? "Local"}
      subtitle={category ? categoryLabel(category) : undefined}
      action={
        <Link
          to="/"
          aria-label="Voltar"
          className="rounded-full border border-border p-2.5 text-muted-foreground"
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
          <div className="rounded-2xl border border-border bg-card p-4">
            {place.address ? <p className="text-sm">{place.address}</p> : null}
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

          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground"
          >
            <Navigation className="h-5 w-5" aria-hidden />
            Traçar rota
          </a>

          {place.phone ? (
            <a
              href={`tel:${place.phone}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold"
            >
              <Phone className="h-5 w-5 text-primary" aria-hidden />
              {place.phone}
            </a>
          ) : null}

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
        </div>
      )}
    </AppShell>
  );
}
