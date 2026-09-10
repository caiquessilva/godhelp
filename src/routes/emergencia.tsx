import { createFileRoute } from "@tanstack/react-router";
import {
  Ambulance,
  Check,
  Flame,
  HeartPulse,
  IdCard,
  MessageCircle,
  Printer,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useGeo } from "@/hooks/useGeo";
import { EMPTY_CARD, normalizePhone, sosMessage, useEmergencyCard } from "@/lib/emergency";
import { haptic } from "@/lib/haptics";

export const Route = createFileRoute("/emergencia")({
  head: () => ({
    meta: [
      { title: "Emergência — GODHELP" },
      {
        name: "description",
        content:
          "SOS com envio de localização pelo WhatsApp, discagem rápida 190, 192, 193 e 199 e cartão de emergência digital.",
      },
      { property: "og:title", content: "Emergência — GODHELP" },
      {
        property: "og:description",
        content: "Ajuda em um toque: SOS por WhatsApp, telefones de emergência e cartão médico.",
      },
    ],
  }),
  component: EmergencyPage,
});

const DIAL = [
  { number: "190", title: "Polícia Militar", Icon: Shield },
  { number: "192", title: "SAMU", Icon: Ambulance },
  { number: "193", title: "Bombeiros", Icon: Flame },
  { number: "199", title: "Defesa Civil", Icon: ShieldAlert },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function EmergencyPage() {
  const { coords, locate } = useGeo();
  const { card, save } = useEmergencyCard();
  const [form, setForm] = useState<typeof EMPTY_CARD | null>(null);
  const [editing, setEditing] = useState(false);

  const current = form ?? card;
  const sosNumber = normalizePhone(card.contactPhone);

  const openSos = () => {
    haptic([100]);
    if (!sosNumber) {
      toast.error("Cadastre o contato do responsável abaixo para usar o SOS.");
      setEditing(true);
      setForm(card);
      return;
    }
    if (!coords) locate();
    const text = encodeURIComponent(sosMessage(coords?.latitude, coords?.longitude));
    window.open(`https://wa.me/${sosNumber}?text=${text}`, "_blank", "noopener");
  };

  const startEdit = () => {
    setForm(card);
    setEditing(true);
  };

  return (
    <AppShell title="Emergência" subtitle="Ajuda rápida em um toque">
      <button
        type="button"
        onClick={openSos}
        className="flex min-h-[76px] w-full items-center justify-center gap-3 rounded-2xl bg-destructive px-4 text-base font-extrabold text-destructive-foreground shadow-lg transition active:scale-[0.98]"
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
        Enviar localização via WhatsApp
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {sosNumber
          ? `Envia sua localização atual para ${card.contactName || "seu contato"}.`
          : "Cadastre o contato do responsável no cartão abaixo."}
      </p>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Discagem rápida
      </h2>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {DIAL.map(({ number, title, Icon }) => (
          <li key={number}>
            <a
              href={`tel:${number}`}
              onClick={() => haptic([100])}
              className="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-center transition active:scale-[0.98]"
            >
              <Icon className="h-5 w-5 text-destructive" aria-hidden />
              <span className="text-xl font-extrabold leading-none text-destructive">{number}</span>
              <span className="text-xs font-medium text-muted-foreground">{title}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[0.7rem] text-muted-foreground">
        Números gratuitos e válidos em todo o Brasil.
      </p>

      <h2 className="mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        <IdCard className="h-4 w-4" aria-hidden />
        Cartão de emergência
      </h2>

      {editing ? (
        <form
          className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            save(current);
            setEditing(false);
            setForm(null);
            haptic();
            toast.success("Cartão salvo neste aparelho.");
          }}
        >
          <Field
            label="Nome completo"
            value={current.name}
            onChange={(name) => setForm({ ...current, name })}
          />
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tipo sanguíneo</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {BLOOD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...current, bloodType: type })}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                    current.bloodType === type
                      ? "bg-destructive text-destructive-foreground"
                      : "border border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <Field
            label="Alergias"
            value={current.allergies}
            onChange={(allergies) => setForm({ ...current, allergies })}
          />
          <Field
            label="Doenças crônicas"
            value={current.conditions}
            onChange={(conditions) => setForm({ ...current, conditions })}
          />
          <Field
            label="Contato do responsável"
            value={current.contactName}
            onChange={(contactName) => setForm({ ...current, contactName })}
          />
          <Field
            label="WhatsApp do responsável (DDD + número)"
            value={current.contactPhone}
            inputMode="tel"
            onChange={(contactPhone) => setForm({ ...current, contactPhone })}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              <Check className="h-4 w-4" aria-hidden />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(null);
              }}
              className="rounded-full border border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : card.name || card.bloodType || card.contactPhone ? (
        <>
          <article
            id="cartao-emergencia"
            className="mt-2 overflow-hidden rounded-2xl border border-destructive/30 bg-card"
          >
            <div className="flex items-center gap-2 bg-destructive px-4 py-2.5 text-destructive-foreground">
              <HeartPulse className="h-5 w-5" aria-hidden />
              <p className="text-sm font-extrabold uppercase tracking-wide">
                Cartão de emergência
              </p>
              {card.bloodType ? (
                <span className="ml-auto rounded-full bg-white/20 px-2.5 py-1 text-sm font-extrabold">
                  {card.bloodType}
                </span>
              ) : null}
            </div>
            <dl className="divide-y divide-border">
              <Row label="Nome" value={card.name} />
              <Row label="Alergias" value={card.allergies || "Nenhuma informada"} />
              <Row label="Doenças crônicas" value={card.conditions || "Nenhuma informada"} />
              <Row
                label="Responsável"
                value={
                  [card.contactName, card.contactPhone].filter(Boolean).join(" · ") ||
                  "Não informado"
                }
              />
            </dl>
            <p className="border-t border-border px-4 py-2 text-center text-[0.65rem] text-muted-foreground">
              Protegido por godhelp.app
            </p>
          </article>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="flex-1 rounded-full border border-border px-4 py-3 text-sm font-semibold text-muted-foreground"
            >
              Editar dados
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-full bg-urban px-4 py-3 text-sm font-bold text-urban-foreground"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Imprimir
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="mt-2 w-full rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground"
        >
          Preencha seus dados médicos e o contato do responsável. Fica salvo só neste aparelho.
        </button>
      )}
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "tel" | "text";
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        inputMode={inputMode ?? "text"}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-input bg-background px-3 py-3 text-base outline-none focus:border-primary"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-2.5">
      <dt className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}
