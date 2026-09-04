import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — GODHELP" },
      { name: "description", content: "Termos de uso do aplicativo GODHELP." },
      { property: "og:title", content: "Termos de Uso — GODHELP" },
      { property: "og:description", content: "Termos de uso do aplicativo GODHELP." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell title="Termos de Uso" leading="back">
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          O GODHELP é um catálogo de locais próximos (parques, academias, restaurantes e similares)
          com base na sua localização aproximada.
        </p>
        <p>
          As informações de endereço, horário e funcionamento vêm de fontes públicas (Google Maps e
          OpenStreetMap) e podem estar desatualizadas. Confirme sempre diretamente com o local antes
          de se deslocar.
        </p>
        <p>
          O uso do aplicativo é gratuito e por sua conta e risco. Não garantimos disponibilidade
          contínua do serviço nem precisão das rotas sugeridas por aplicativos de terceiros.
        </p>
        <p>
          Ao usar o GODHELP, você concorda com estes termos. Podemos atualizá-los a qualquer momento;
          a versão vigente estará sempre disponível nesta página.
        </p>
        <p className="text-xs">Última atualização: setembro de 2026.</p>
      </div>
    </AppShell>
  );
}
