import { useSyncExternalStore } from "react";

export const RADIUS_OPTIONS = [
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
] as const;

const STORAGE_KEY = "godhelp-radius";
const CHANGE_EVENT = "godhelp-radius-change";
export const DEFAULT_RADIUS = 3000;

export function getSearchRadius(): number {
  if (typeof window === "undefined") return DEFAULT_RADIUS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 500 && value <= 15000 ? value : DEFAULT_RADIUS;
}

export function saveSearchRadius(value: number) {
  window.localStorage.setItem(STORAGE_KEY, String(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSearchRadius(): number {
  return useSyncExternalStore(subscribe, getSearchRadius, () => DEFAULT_RADIUS);
}
