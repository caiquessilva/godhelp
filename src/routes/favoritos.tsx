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

const EMERGENCY_CONTACTS = [
  {
    id: "policia",
    number: "190",
    title: "Polícia Militar",
    description: "Segurança e ocorrências policiais",
    icon: Shield,
    tone: "emergency" as const,
  },
  {
    id: "samu",
    number: "192",
    title: "SAMU",
    description: "Emergência médica e socorro urgente",
    icon: Stethoscope,
    tone: "emergency" as const,
  },
  {
    id: "bombeiros",
    number: "193",
    title: "Corpo de Bombeiros",
    description: "Resgate, incêndios e acidentes",
    icon: Siren,
    tone: "emergency" as const,
  },
];

function EmergencyDial() {
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Phone className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-card-foreground">
            Discagem Rápida de Emergência
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Nacional · Gratuito
        </span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-3">
        {EMERGENCY_CONTACTS.map((contact) => {
          const Icon = contact.icon;
          return (
            <li key={contact.id}>
              <a
                href={`tel:${contact.number}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition active:scale-[0.98] hover:border-destructive/40 hover:bg-destructive/5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition group-hover:bg-destructive group-hover:text-destructive-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold leading-tight text-foreground">
                    {contact.number}
                  </span>
                  <span className="block truncate text-xs font-semibold text-card-foreground">
                    {contact.title}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {contact.description}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Números gratuitos válidos em todo o território brasileiro. Em celulares, toque no card para
        ligar diretamente.
      </p>
    </section>
  );
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
