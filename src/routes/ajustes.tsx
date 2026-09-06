import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, Download, MessageCircleWarning } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useGeo } from "@/hooks/useGeo";
import { useTheme, type ThemeChoice } from "@/hooks/useTheme";
import { useInstallPrompt } from "@/lib/install";
import { enablePush, pushPermission } from "@/lib/push";
import { registerPushDevice } from "@/lib/push.functions";
import { RADIUS_OPTIONS, saveSearchRadius, useSearchRadius } from "@/lib/search-radius";


export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — GODHELP" },
      {
        name: "description",
        content:
          "Tema, GPS, raio de busca, instalação do app e privacidade (LGPD) no GODHELP.",
      },
      { property: "og:title", content: "Ajustes — GODHELP" },
      { property: "og:description", content: "Tema, conta e preferências do GODHELP." },
    ],
  }),
  component: SettingsPage,
});

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

type GpsState = "desconhecido" | "concedido" | "pendente" | "negado";

function useGpsPermission(): { state: GpsState; refresh: () => void } {
  const [state, setState] = useState<GpsState>("desconhecido");

  const apply = (value: PermissionState) => {
    setState(
      value === "granted" ? "concedido" : value === "denied" ? "negado" : "pendente",
    );
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !("permissions" in navigator)) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        status = result;
        apply(result.state);
        result.onchange = () => apply(result.state);
      })
      .catch(() => setState("desconhecido"));
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  const refresh = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => setState("concedido"),
      (error) => setState(error.code === error.PERMISSION_DENIED ? "negado" : "pendente"),
      { timeout: 8000 },
    );
  };

  return { state, refresh };
}

const gpsStyles: Record<GpsState, { dot: string; label: string; pill: string }> = {
  concedido: {
    dot: "bg-emerald-500",
    label: "Permitido",
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  pendente: {
    dot: "bg-amber-500",
    label: "Não solicitado",
    pill: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  negado: {
    dot: "bg-red-500",
    label: "Negado",
    pill: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  desconhecido: {
    dot: "bg-muted-foreground",
    label: "Indisponível",
    pill: "bg-muted text-muted-foreground",
  },
};

function GpsSection() {
  const { state, refresh } = useGpsPermission();
  const [showHelp, setShowHelp] = useState(false);
  const style = gpsStyles[state];

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Localização (GPS)
      </h2>
      <div className="mt-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Permissão de localização</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.pill}`}
          >
            <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden />
            {style.label}
          </span>
        </div>

        {state === "negado" && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowHelp((open) => !open)}
              className="flex w-full items-center justify-between rounded-full border border-border px-4 py-3 text-sm font-semibold"
              aria-expanded={showHelp}
            >
              Como reativar o GPS no seu navegador/celular
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showHelp ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {showHelp && (
              <div className="mt-3 space-y-3 rounded-2xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
                <div>
                  <p className="font-bold text-foreground">Android (Chrome)</p>
                  <p>
                    Toque no cadeado ao lado do endereço do site → Permissões → Localização →
                    Permitir. Depois recarregue a página.
                  </p>
                </div>
                <div>
                  <p className="font-bold text-foreground">iPhone (Safari)</p>
                  <p>
                    Ajustes → Privacidade e Segurança → Serviços de Localização → Sites do Safari →
                    selecione "Ao usar o app". Depois recarregue a página.
                  </p>
                </div>
                <div>
                  <p className="font-bold text-foreground">Computador</p>
                  <p>
                    Clique no ícone de cadeado/ajustes na barra de endereço → Configurações do site
                    → Localização → Permitir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  className="w-full rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground"
                >
                  Já reativei — verificar novamente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function InstallSection() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  if (isInstalled) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">App</h2>
        <div className="mt-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            GODHELP já está instalado na sua tela inicial.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">App</h2>
      <div className="mt-2 rounded-2xl border border-border bg-card p-4">
        {canInstall ? (
          <button
            type="button"
            onClick={async () => {
              const accepted = await promptInstall();
              if (accepted) toast.success("GODHELP instalado na tela inicial!");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            Instalar GODHELP na Tela Inicial
          </button>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Para instalar: no Android (Chrome), toque no menu ⋮ → "Instalar app" ou "Adicionar à
            tela inicial". No iPhone (Safari), toque em Compartilhar → "Adicionar à Tela de
            Início".
          </p>
        )}
      </div>
    </section>
  );
}

function AlertsSection() {
  const { coords } = useGeo();
  const { user } = useAuth();
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);

  useEffect(() => {
    setGranted(pushPermission() === "granted");
    setBlocker(pushBlocker());
  }, []);

  const helpFor = (status: string): string => {
    switch (status) {
      case "in-app-browser":
        return "Você está no navegador interno do Instagram/TikTok, que bloqueia notificações. Toque nos três pontinhos e escolha “Abrir no navegador” (Chrome ou Safari) para ativar.";
      case "ios-install-required":
        return "No iPhone, as notificações só funcionam com o GODHELP instalado: toque em Compartilhar, depois “Adicionar à Tela de Início”, abra o app pelo ícone e ative os alertas por lá.";
      case "open-in-new-tab":
        return "Abra o GODHELP em uma aba própria (ou pelo app instalado) para ativar os alertas.";
      case "denied":
        return "As notificações estão bloqueadas para este site. Libere nas configurações do navegador (Notificações) e tente de novo.";
      case "not-configured":
        return "Os alertas ainda não estão configurados neste app.";
      case "unsupported":
        return "Seu navegador não suporta notificações. Tente pelo Chrome (Android) ou instale o app no iPhone.";
      default:
        return "Não foi possível ativar agora. Tente novamente em instantes.";
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success("Link copiado! Cole no Chrome ou Safari.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const activate = async () => {
    setBusy(true);
    setHelp(null);
    try {
      const result = await enablePush();
      if (result.status === "registered") {
        await registerPushDevice({
          data: {
            token: result.token,
            ...(coords
              ? { latitude: coords.latitude, longitude: coords.longitude }
              : {}),
            ...(user ? { userId: user.id } : {}),
          },
        });
        setGranted(true);
        setBlocker(null);
        toast.success("Alertas ativados! Avisaremos sobre chuva perto de você.");
        return;
      }
      setBlocker(result.status);
      const message = helpFor(result.status);
      setHelp(message);
      toast.error(message);
    } catch {
      const message = helpFor("error");
      setHelp(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const needsOtherBrowser = blocker === "in-app-browser" || blocker === "open-in-new-tab";

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Alertas
      </h2>
      <div className="mt-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Avisos curtos e úteis, como “chuva prevista para daqui a 20 minutos perto do parque que
          você viu”. Você pode desativar quando quiser nas configurações do navegador.
        </p>
        {granted ? (
          <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Alertas ativados neste aparelho
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={activate}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              <Bell className="h-4 w-4" aria-hidden />
              {busy ? "Ativando..." : "Ativar alertas de chuva e novidades"}
            </button>
            {(help ?? (blocker ? helpFor(blocker) : null)) && (
              <p className="mt-3 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                {help ?? helpFor(blocker as string)}
              </p>
            )}
            {needsOtherBrowser && (
              <button
                type="button"
                onClick={copyLink}
                className="mt-2 w-full rounded-full border border-border py-3 text-sm font-semibold"
              >
                Copiar link para abrir no navegador
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}




function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const radius = useSearchRadius();

  return (
    <AppShell title="Ajustes">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Tema</h2>
        <div className="mt-2 flex gap-2">
          {themeOptions.map((option) => (
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
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Raio de busca padrão
        </h2>
        <div className="mt-2 flex gap-2">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => saveSearchRadius(option.value)}
              aria-pressed={radius === option.value}
              className={`flex-1 rounded-full px-3 py-3 text-sm font-semibold ${
                radius === option.value
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Raios menores deixam a busca mais rápida e mostram só o que está realmente perto.
        </p>
      </section>

      <GpsSection />

      <InstallSection />

      <AlertsSection />


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
              className="mt-3 w-full rounded-full border border-border py-3 text-sm font-bold"
            >
              Sair
            </button>
          </div>
        ) : (
          <Link
            to="/entrar"
            className="mt-2 flex justify-center rounded-full bg-primary py-4 text-sm font-bold text-primary-foreground"
          >
            Entrar ou criar conta
          </Link>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Sobre</h2>
        <div className="mt-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">GODHELP — Versão 1.3.0</p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/termos"
              className="flex-1 rounded-full border border-border py-2.5 text-center text-xs font-bold"
            >
              Termos de Uso
            </Link>
            <Link
              to="/privacidade"
              className="flex-1 rounded-full border border-border py-2.5 text-center text-xs font-bold"
            >
              Privacidade (LGPD)
            </Link>
          </div>
          <a
            href="https://wa.me/?text=Ol%C3%A1!%20Quero%20reportar%20um%20problema%20ou%20enviar%20um%20feedback%20sobre%20o%20GODHELP%3A%20"
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-bold"
          >
            <MessageCircleWarning className="h-4 w-4" aria-hidden />
            Reportar um problema / Feedback
          </a>
        </div>
      </section>
    </AppShell>
  );
}
