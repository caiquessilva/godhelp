import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Lock, LogOut, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { adminLogin, adminLogout, adminOverview, adminStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Área administrativa — GODHELP" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Acesso restrito ao administrador do GODHELP.",
      },
      { property: "og:title", content: "Área administrativa — GODHELP" },
      { property: "og:description", content: "Acesso restrito ao administrador." },
    ],
  }),
  component: AdminPage,
});

type Overview = { pois: number; cache: number; devices: number };

function AdminPage() {
  const status = useServerFn(adminStatus);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);
  const overview = useServerFn(adminOverview);

  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);

  const loadOverview = async () => {
    try {
      setData(await overview());
    } catch {
      setData(null);
    }
  };

  useEffect(() => {
    let alive = true;
    status()
      .then((result) => {
        if (!alive) return;
        setAdmin(result.admin);
        if (result.admin) void loadOverview();
      })
      .catch(() => undefined)
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const result = await login({
        data: {
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });
      if (result.ok) {
        setAdmin(true);
        await loadOverview();
      } else {
        setError("Usuário ou senha incorretos.");
      }
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <AppShell title="Administração">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </AppShell>
    );
  }

  if (!admin) {
    return (
      <AppShell title="Administração">
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-base font-bold">Acesso restrito</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta área é apenas para o administrador do GODHELP.
          </p>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              name="username"
              autoComplete="username"
              placeholder="Usuário"
              required
              className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm"
            />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Senha"
              required
              className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm"
            />
            {error && (
              <p role="alert" className="text-xs font-semibold text-red-500">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Administração">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden />
          <p className="text-sm font-bold">Você está conectado como administrador</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Locais salvos", value: data?.pois },
          { label: "Buscas em cache", value: data?.cache },
          { label: "Aparelhos c/ alerta", value: data?.devices },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{item.value ?? "—"}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={async () => {
          await logout();
          setAdmin(false);
          setData(null);
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-semibold"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sair da área administrativa
      </button>
    </AppShell>
  );
}
