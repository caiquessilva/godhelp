import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, RefreshCw } from "lucide-react";

import type { Coords } from "@/hooks/useGeo";
import { haptic } from "@/lib/haptics";
import { reverseGeocode } from "@/lib/places.functions";

export function LocationHeader({
  coords,
  status,
  onRefresh,
}: {
  coords: Coords | null;
  status: "idle" | "loading" | "ready" | "error";
  onRefresh: () => void;
}) {
  const reverseFn = useServerFn(reverseGeocode);

  const addressQuery = useQuery({
    queryKey: [
      "reverse",
      coords ? coords.latitude.toFixed(4) : null,
      coords ? coords.longitude.toFixed(4) : null,
    ],
    enabled: Boolean(coords),
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: () =>
      reverseFn({ data: { latitude: coords!.latitude, longitude: coords!.longitude } }),
  });

  const gpsOk = Boolean(coords) && !coords?.approximate && status !== "error";
  const address = addressQuery.data?.label;

  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            gpsOk ? "bg-primary/10 text-primary" : "bg-urban/10 text-urban"
          }`}
        >
          <MapPin className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Você está em
          </p>
          <p className="truncate text-sm font-semibold">
            {addressQuery.isFetching && !address
              ? "Localizando…"
              : (address ?? coords?.label ?? "Toque em atualizar para localizar")}
          </p>
          <span
            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
              gpsOk
                ? "bg-primary/10 text-primary"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${gpsOk ? "bg-primary" : "bg-amber-500"}`}
              aria-hidden
            />
            {gpsOk
              ? "GPS ativo"
              : status === "error"
                ? "Permissão negada"
                : coords?.approximate
                  ? "Localização aproximada"
                  : "Aguardando permissão"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic();
            onRefresh();
          }}
          aria-label="Atualizar localização"
          className="shrink-0 rounded-full bg-muted p-2.5 text-foreground transition active:scale-90"
        >
          <RefreshCw
            className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`}
            aria-hidden
          />
        </button>
      </div>
    </section>
  );
}
