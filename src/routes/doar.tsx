import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/doar")({
  head: () => ({
    meta: [
      { title: "Apoie o GODHELP — doação voluntária" },
      {
        name: "description",
        content:
          "Gostou do GODHELP? Faça uma colaboração simbólica e voluntária para manter o app rápido, gratuito e sem anúncios.",
      },
      { property: "og:title", content: "Apoie o GODHELP" },
      {
        property: "og:description",
        content: "Colaboração simbólica e totalmente voluntária para manter o app no ar.",
      },
    ],
  }),
  component: DonatePage,
});

const PIX_KEY = "contato@godhelp.app";

const amounts = [
  { value: "5", label: "R$ 5", hint: "Um cafezinho" },
  { value: "10", label: "R$ 10", hint: "Ajuda bastante" },
  { value: "25", label: "R$ 25", hint: "Padrinho do app" },
];

function DonatePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyKey = async () => {
    haptic("light");
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      toast.success("Chave Pix copiada");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Anote: " + PIX_KEY);
    }
  };

  return (
    <AppShell title="Apoie o app" subtitle="Colaboração 100% voluntária">
      <section className="rounded-2xl border border-border bg-card p-5 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-8 w-8 text-primary" aria-hidden />
        </span>
        <h2 className="mt-3 text-lg font-bold">Gostou do GODHELP?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O app é gratuito e sem anúncios. Se ele te ajudou, você pode colaborar com um valor
          simbólico — só se quiser.
        </p>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {amounts.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              haptic("light");
              setSelected(item.value);
            }}
            aria-pressed={selected === item.value}
            className={`rounded-2xl px-2 py-4 text-center transition-colors ${
              selected === item.value
                ? "bg-foreground text-background"
                : "border border-border bg-card"
            }`}
          >
            <span className="block text-base font-bold">{item.label}</span>
            <span
              className={`mt-0.5 block text-[0.7rem] ${
                selected === item.value ? "opacity-80" : "text-muted-foreground"
              }`}
            >
              {item.hint}
            </span>
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Chave Pix</p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{PIX_KEY}</p>
        <button
          type="button"
          onClick={() => void copyKey()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Chave copiada" : "Copiar chave Pix"}
          {selected ? ` · R$ ${selected}` : ""}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhum recurso do app depende de doação: tudo continua liberado mesmo sem colaborar.
        </p>
      </section>
    </AppShell>
  );
}
