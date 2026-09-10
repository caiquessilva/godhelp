import { useCallback, useEffect, useState } from "react";

export interface EmergencyCard {
  name: string;
  bloodType: string;
  allergies: string;
  conditions: string;
  contactName: string;
  contactPhone: string;
}

export const EMPTY_CARD: EmergencyCard = {
  name: "",
  bloodType: "",
  allergies: "",
  conditions: "",
  contactName: "",
  contactPhone: "",
};

const KEY = "godhelp-emergency-card";

/** Dados de emergência do usuário, guardados só no aparelho dele. */
export function useEmergencyCard() {
  const [card, setCard] = useState<EmergencyCard>(EMPTY_CARD);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setCard({ ...EMPTY_CARD, ...(JSON.parse(raw) as Partial<EmergencyCard>) });
    } catch {
      window.localStorage.removeItem(KEY);
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next: EmergencyCard) => {
    setCard(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  return { card, save, loaded };
}

/** Mantém apenas dígitos, no formato aceito pelo link do WhatsApp. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function sosMessage(latitude?: number, longitude?: number): string {
  const location =
    latitude != null && longitude != null
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : "não consegui obter a localização exata agora";
  return `Preciso de ajuda urgente. Minha localização exata atual é: ${location}`;
}
