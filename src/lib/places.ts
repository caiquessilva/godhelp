export type CategoryId = "parques" | "academias" | "restaurantes";

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  googleTypes: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "parques", label: "Parques", googleTypes: ["park"] },
  { id: "academias", label: "Academias", googleTypes: ["gym", "fitness_center"] },
  { id: "restaurantes", label: "Restaurantes", googleTypes: ["restaurant"] },
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
  return `https://www.google.com/maps?q=${place.latitude},${place.longitude}&z=16&output=embed`;
}
