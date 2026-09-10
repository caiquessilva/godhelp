export type CategoryId =
  | "parques"
  | "academias"
  | "restaurantes"
  | "farmacias"
  | "saude";

export const CATEGORY_IDS = [
  "parques",
  "academias",
  "restaurantes",
  "farmacias",
  "saude",
] as const;

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  googleTypes: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "academias", label: "Academias", googleTypes: ["gym", "fitness_center"] },
  { id: "parques", label: "Parques", googleTypes: ["park"] },
  { id: "restaurantes", label: "Restaurantes", googleTypes: ["restaurant"] },
  { id: "farmacias", label: "Farmácias 24h", googleTypes: ["pharmacy", "drugstore"] },
  { id: "saude", label: "Postos de Saúde", googleTypes: ["hospital", "doctor"] },
];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export interface Place {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  typeLabel: string | null;
  distanceMeters: number | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: string[] | null;
  photoName?: string | null;
  /** Origem dos dados: Google, cache expirado (offline) ou OpenStreetMap. */
  source?: "google" | "cache" | "osm";
}

const LOWER_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "a", "o", "as", "os",
  "para", "por", "com", "the", "of",
]);

/** Normaliza títulos em CAIXA ALTA para Title Case, preservando siglas curtas. */
export function titleCase(value: string): string {
  const hasLower = /[a-zà-ÿ]/.test(value);
  return value
    .split(/(\s+)/)
    .map((token, index) => {
      if (/^\s+$/.test(token) || token.length === 0) return token;
      // preserva siglas curtas totalmente maiúsculas (ex.: SP, UFRJ)
      if (!hasLower && token.length <= 3 && /^[A-ZÀ-Ý0-9.]+$/.test(token)) return token;
      if (hasLower && token === token.toUpperCase() && /[A-ZÀ-Ý]/.test(token) && token.length <= 4) {
        return token;
      }
      const lower = token.toLocaleLowerCase("pt-BR");
      if (index > 0 && LOWER_WORDS.has(lower)) return lower;
      return lower.replace(/^[\p{L}]/u, (c) => c.toLocaleUpperCase("pt-BR"));
    })
    .join("");
}

export function placePhotoUrl(photoName?: string | null, width = 160): string | null {
  if (!photoName) return null;
  return `/api/place-photo?name=${encodeURIComponent(photoName)}&w=${width}`;
}


export function formatDistance(meters: number | null): string {

  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type RoutablePlace = {
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
};

function hasCoords(place: RoutablePlace): place is RoutablePlace & { latitude: number; longitude: number } {
  return place.latitude != null && place.longitude != null;
}

export function directionsUrl(place: RoutablePlace): string {
  if (hasCoords(place)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }
  const q = encodeURIComponent(place.address ?? place.name);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export function appleMapsUrl(place: RoutablePlace): string {
  if (hasCoords(place)) {
    return `https://maps.apple.com/?daddr=${place.latitude},${place.longitude}`;
  }
  return `https://maps.apple.com/?q=${encodeURIComponent(place.address ?? place.name)}`;
}

export function wazeUrl(place: RoutablePlace): string {
  if (hasCoords(place)) {
    return `https://waze.com/ul?ll=${place.latitude},${place.longitude}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(place.address ?? place.name)}`;
}

export function mapEmbedUrl(place: RoutablePlace): string | null {
  if (!hasCoords(place)) return null;
  return `https://maps.google.com/maps?q=${place.latitude},${place.longitude}&z=16&output=embed`;
}

export function googleMapsSearchUrl(place: RoutablePlace): string | null {
  if (!hasCoords(place)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
}
