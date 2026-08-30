import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Navigation, Star } from "lucide-react";

import { haptic } from "@/lib/haptics";
import { directionsUrl, formatDistance, placePhotoUrl, titleCase, type Place } from "@/lib/places";

export function StatusBadge({ openNow }: { openNow: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        openNow ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${openNow ? "bg-primary" : "bg-muted-foreground"}`}
        aria-hidden
      />
      {openNow ? "Aberto" : "Fechado"}
    </span>
  );
}

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
  const photo = placePhotoUrl(place.photoName);

  return (
    <li className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <Link
          to="/local/$placeId"
          params={{ placeId: place.id }}
          search={{ category }}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          {photo ? (
            <img
              src={photo}
              srcSet={`${placePhotoUrl(place.photoName, 96)} 96w, ${placePhotoUrl(place.photoName, 160)} 160w`}
              sizes="64px"
              alt={`Foto de ${titleCase(place.name)}`}
              loading="lazy"
              decoding="async"
              className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
            />

          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
              <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-card-foreground">
              {titleCase(place.name)}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
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
              {place.openNow != null ? <StatusBadge openNow={place.openNow} /> : null}
            </span>
            {place.address ? (
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {place.address}
              </span>
            ) : null}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              haptic(isFavorite ? 8 : [12, 40, 12]);
              onToggleFavorite();
            }}
            aria-label={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
            className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <Heart
              key={String(isFavorite)}
              className={`h-5 w-5 animate-pop ${isFavorite ? "fill-primary text-primary" : ""}`}
              aria-hidden
            />
          </button>
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            onClick={() => haptic(10)}
            aria-label={`Rota até ${titleCase(place.name)}`}
            className="rounded-full bg-primary p-2.5 text-primary-foreground"
          >
            <Navigation className="h-5 w-5" aria-hidden />
          </a>
        </div>
      </div>
    </li>
  );
}
