import { useQuery } from "@tanstack/react-query";

export interface WeatherInfo {
  temperature: number;
  weathercode: number;
  isRaining: boolean;
  icon: string;
}

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

const TTL_MS = 15 * 60 * 1000;

function readCache(key: string): WeatherInfo | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: WeatherInfo };
    if (Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: WeatherInfo) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* armazenamento cheio ou indisponível */
  }
}

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherInfo> {
  const cacheKey = `weather_${latitude}_${longitude}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
  );
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  const data = (await response.json()) as {
    current_weather?: { temperature?: number; weathercode?: number };
  };
  const code = data.current_weather?.weathercode ?? 0;
  const info: WeatherInfo = {
    temperature: Math.round(data.current_weather?.temperature ?? 0),
    weathercode: code,
    isRaining: code >= 51,
    icon: weatherIcon(code),
  };
  writeCache(cacheKey, info);
  return info;
}


/**
 * Busca o clima atual em segundo plano (nunca bloqueia a lista).
 * Cache de 30 min por célula aproximada de coordenadas (~1 km).
 */
export function useWeather(coords: { latitude: number; longitude: number } | null) {
  // Arredonda para 2 casas (~1 km) para reaproveitar a mesma resposta entre locais próximos.
  const lat = coords ? Number(coords.latitude.toFixed(2)) : null;
  const lng = coords ? Number(coords.longitude.toFixed(2)) : null;
  const query = useQuery({
    queryKey: ["weather", lat, lng],
    enabled: lat != null && lng != null,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: () => fetchWeather(lat!, lng!),
  });
  return query.data ?? null;
}

