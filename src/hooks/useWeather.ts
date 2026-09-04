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

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherInfo> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
  );
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  const data = (await response.json()) as {
    current_weather?: { temperature?: number; weathercode?: number };
  };
  const code = data.current_weather?.weathercode ?? 0;
  return {
    temperature: Math.round(data.current_weather?.temperature ?? 0),
    weathercode: code,
    isRaining: code >= 51,
    icon: weatherIcon(code),
  };
}

/**
 * Busca o clima atual em segundo plano (nunca bloqueia a lista).
 * Cache de 30 min por célula aproximada de coordenadas (~1 km).
 */
export function useWeather(coords: { latitude: number; longitude: number } | null) {
  const key = coords
    ? `${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}`
    : "none";
  const query = useQuery({
    queryKey: ["weather", key],
    enabled: Boolean(coords),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: () => fetchWeather(coords!.latitude, coords!.longitude),
  });
  return query.data ?? null;
}
