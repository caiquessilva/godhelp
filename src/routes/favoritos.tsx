import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Navigation } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { categoryLabel, directionsUrl } from "@/lib/places";
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

function FavoritesPage() {
  const { user, loading } = useAuth();
  const { favorites, isLoading } = useFavorites();

  return (
    <AppShell title="Favoritos" subtitle="Seus locais salvos">
      {loading ? null : !user ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Entre na sua conta para salvar e ver seus favoritos.
          </p>
          <Link
            to="/entrar"
            className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
          >
            Entrar
          </Link>
        </div>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : favorites.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Você ainda não salvou nenhum local.
        </p>
      ) : (
        <ul className="space-y-3">
          {favorites.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.name}</p>
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
                    href={directionsUrl(row)}
                    target="_blank"
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
