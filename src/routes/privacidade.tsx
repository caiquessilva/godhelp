import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade (LGPD) — GODHELP" },
      {
        name: "description",
        content: "Política de privacidade do GODHELP em conformidade com a LGPD.",
      },
      { property: "og:title", content: "Privacidade (LGPD) — GODHELP" },
      {
        property: "og:description",
        content: "Como o GODHELP trata seus dados pessoais, em conformidade com a LGPD.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell
      title="Privacidade (LGPD)"
      leading={
        <Link
          to="/ajustes"
          aria-label="Voltar"
          className="shrink-0 rounded-full border border-border p-2.5 text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
      }
    >
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Esta política descreve como o GODHELP trata dados pessoais, em conformidade com a Lei
          Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
        <h2 className="text-sm font-bold text-foreground">Dados que coletamos</h2>
        <p>
          Localização aproximada (somente com sua permissão) para buscar locais próximos; e-mail,
          caso você crie uma conta; e identificadores de locais salvos como favoritos.
        </p>
        <h2 className="text-sm font-bold text-foreground">Como usamos</h2>
        <p>
          A localização é usada apenas para as buscas e não é vendida nem compartilhada com
          anunciantes. Coordenadas aproximadas podem ser armazenadas em cache temporário para
          melhorar a velocidade do app.
        </p>
        <h2 className="text-sm font-bold text-foreground">Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo
          canal de suporte informado nos Ajustes do aplicativo. Favoritos salvos sem conta ficam
          apenas no seu aparelho e podem ser apagados limpando os dados do navegador.
        </p>
        <p className="text-xs">Última atualização: setembro de 2026.</p>
      </div>
    </AppShell>
  );
}
