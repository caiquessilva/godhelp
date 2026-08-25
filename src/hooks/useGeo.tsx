import { useCallback, useEffect, useState } from "react";

export interface Coords {
  latitude: number;
  longitude: number;
  label?: string;
}

const STORAGE_KEY = "godhelp-coords";

export function useGeo() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Coords;
      if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
        setCoords(parsed);
        setStatus("ready");
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const save = useCallback((next: Coords) => {
    setCoords(next);
    setStatus("ready");
    setError(null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Seu aparelho não permite localização.");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        save({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Minha localização",
        });
      },
      (geoError) => {
        setStatus("error");
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Permissão de localização negada. Você pode buscar por endereço."
            : "Não conseguimos obter sua localização. Tente buscar por endereço.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [save]);

  return { coords, status, error, locate, setCoords: save };
}
