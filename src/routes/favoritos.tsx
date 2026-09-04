import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Navigation } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { googleRouteUrl, useEnv } from "@/lib/inapp";
import { categoryLabel, titleCase } from "@/lib/places";
import { supabase } from "@/integrations/supabase/client";

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

function FavoritesPage() {
  const { user, loading } = useAuth();
  const { favorites, isLoading } = useFavorites();

  return (
    <AppShell title="Favoritos" subtitle="Seus locais salvos">
      {loading ? (
        <FavoritesSkeleton />
      ) : !user ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Heart className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            Entre na sua conta para salvar e ver seus favoritos.
          </p>
          <Link
            to="/entrar"
            className="mt-1 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Entrar
          </Link>
        </div>
      ) : isLoading ? (
        <FavoritesSkeleton />
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Heart className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            Você ainda não salvou nenhum local.
          </p>
          <Link
            to="/"
            className="mt-1 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Descobrir locais perto de mim
          </Link>
        </div>
      ) : (
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
                    aria-label="Remover dos favoritos"
                    onClick={async () => {
                      await supabase.from("favorites").delete().eq("id", row.id);
                      window.location.reload();
                    }}
                    className="rounded-full p-2.5 text-primary"
                  >
                    <Heart className="h-5 w-5 fill-primary" aria-hidden />
                  </button>
                  <a
                    href={googleRouteUrl(row, env)}
                    target={env.inApp ? "_self" : "_blank"}
                    rel="noreferrer"
                    aria-label={`Rota até ${row.name}`}
                    className="rounded-full bg-primary p-2.5 text-primary-foreground"
                  >
                    <Navigation className="h-5 w-5" aria-hidden />
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
