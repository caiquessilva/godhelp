import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Navigation, Phone, Share2, Shield, Siren, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites, type FavoriteRow } from "@/hooks/useFavorites";
import { haptic } from "@/lib/haptics";
import { googleRouteUrl, useEnv } from "@/lib/inapp";
import { categoryLabel, titleCase } from "@/lib/places";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — GODHELP" },
      {
        name: "description",
        content: "Seus parques, academias e restaurantes salvos no GODHELP.",
      },
      { property: "og:title", content: "Favoritos — GODHELP" },
      { property: "og:description", content: "Seus locais salvos, sempre à mão." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {[0, 1, 2].map((item) => (
        <li
          key={item}
          className="animate-shimmer rounded-2xl border border-border bg-card p-4"
          style={{ animationDelay: `${item * 0.12}s` }}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex-1 space-y-2 py-1">
              <span className="block h-4 w-2/3 rounded-full bg-muted" />
              <span className="block h-3 w-1/3 rounded-full bg-muted" />
              <span className="block h-3 w-1/2 rounded-full bg-muted" />
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

function mapsLink(row: FavoriteRow) {
  const query =
    row.latitude != null && row.longitude != null
      ? `${row.latitude},${row.longitude}`
      : encodeURIComponent(row.address ?? row.name);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

async function shareFavorite(row: FavoriteRow) {
  const url = mapsLink(row);
  const text = `${titleCase(row.name)}${row.address ? ` — ${row.address}` : ""}`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: titleCase(row.name), text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success("Link copiado");
  } catch {
    /* usuário cancelou o compartilhamento */
  }
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
        <span className="absolute inset-3 rounded-full bg-primary/10" />
        <Heart className="relative h-11 w-11 fill-primary/30 text-primary" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-lg font-bold">Sua lista está vazia</p>
        <p className="text-sm text-muted-foreground">
          Toque no coração de um local para guardá-lo aqui.
        </p>
      </div>
      <Link
        to="/"
        className="mt-1 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
      >
        Explorar locais próximos
      </Link>
    </div>
  );
}

function FavoritesPage() {
  const { user, loading } = useAuth();
  const { favorites, isLoading, remove } = useFavorites();
  const env = useEnv();

  return (
    <AppShell title="Favoritos" subtitle="Seus locais salvos">
      {loading || isLoading ? (
        <FavoritesSkeleton />
      ) : favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {!user ? (
            <p className="mb-3 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
              Salvos neste aparelho.{" "}
              <Link to="/entrar" className="font-semibold text-primary underline">
                Entre na sua conta
              </Link>{" "}
              para sincronizar em todos os dispositivos.
            </p>
          ) : null}

          <ul className="space-y-3">
            {favorites.map((row) => (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{titleCase(row.name)}</p>
                    <p className="text-sm text-muted-foreground">{categoryLabel(row.category)}</p>
                    {row.address ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{row.address}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Remover ${row.name} dos favoritos`}
                      onClick={() => {
                        haptic();
                        remove.mutate(row);
                      }}
                      className="rounded-full p-2.5 text-primary transition active:scale-90"
                    >
                      <Heart className="h-5 w-5 fill-primary" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Compartilhar ${row.name}`}
                      onClick={() => {
                        haptic();
                        void shareFavorite(row);
                      }}
                      className="rounded-full bg-muted p-2.5 text-foreground transition active:scale-90"
                    >
                      <Share2 className="h-5 w-5" aria-hidden />
                    </button>
                    <a
                      href={googleRouteUrl(row, env)}
                      target={env.inApp ? "_self" : "_blank"}
                      rel="noreferrer"
                      onClick={() => haptic()}
                      aria-label={`Como chegar em ${row.name}`}
                      className="rounded-full bg-primary p-2.5 text-primary-foreground transition active:scale-90"
                    >
                      <Navigation className="h-5 w-5" aria-hidden />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
