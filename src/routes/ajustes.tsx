import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type ThemeChoice } from "@/hooks/useTheme";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — GODHELP" },
      {
        name: "description",
        content: "Escolha modo claro ou escuro e gerencie sua conta no GODHELP.",
      },
      { property: "og:title", content: "Ajustes — GODHELP" },
      { property: "og:description", content: "Tema, conta e preferências do GODHELP." },
    ],
  }),
  component: SettingsPage,
});

const options: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell title="Ajustes">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Tema</h2>
        <div className="mt-2 flex gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`flex-1 rounded-full px-3 py-3 text-sm font-semibold ${
                theme === option.value
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Conta</h2>
        {user ? (
          <div className="mt-2 rounded-2xl border border-border bg-card p-4">
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                await navigate({ to: "/" });
              }}
              className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-bold"
            >
              Sair
            </button>
          </div>
        ) : (
          <Link
            to="/entrar"
            className="mt-2 flex justify-center rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground"
          >
            Entrar ou criar conta
          </Link>
        )}
      </section>
    </AppShell>
  );
}
