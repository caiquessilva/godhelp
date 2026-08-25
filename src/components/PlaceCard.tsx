import { Link } from "@tanstack/react-router";
import { Heart, Navigation, Star } from "lucide-react";

import { directionsUrl, formatDistance, type Place } from "@/lib/places";

export function PlaceCard({
  place,
  category,
  isFavorite,
  onToggleFavorite,
}: {
  place: Place;
  category: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link
          to="/local/$placeId"
          params={{ placeId: place.id }}
          search={{ category }}
          className="min-w-0 flex-1"
        >
          <p className="truncate text-base font-semibold text-card-foreground">{place.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {place.distanceMeters != null ? (
              <span className="font-semibold text-foreground">
                {formatDistance(place.distanceMeters)}
              </span>
            ) : null}
            {place.rating != null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                {place.rating.toFixed(1).replace(".", ",")}
              </span>
            ) : null}
            {place.openNow != null ? (
              <span className={place.openNow ? "text-primary" : ""}>
                {place.openNow ? "Aberto" : "Fechado"}
              </span>
            ) : null}
          </p>
          {place.address ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{place.address}</p>
          ) : null}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
            className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <Heart
              className={`h-5 w-5 ${isFavorite ? "fill-primary text-primary" : ""}`}
              aria-hidden
            />
          </button>
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Rota até ${place.name}`}
            className="rounded-full bg-primary p-2.5 text-primary-foreground"
          >
            <Navigation className="h-5 w-5" aria-hidden />
          </a>
        </div>
      </div>
    </li>
  );
}
