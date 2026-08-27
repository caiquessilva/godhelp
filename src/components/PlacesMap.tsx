import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { formatDistance, titleCase, type Place } from "@/lib/places";

declare global {
  interface Window {
    google?: any;
    __godhelpMapReady?: () => void;
  }
}

const BRAND = "#1f9c55";

function loadMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("godhelp-maps-js");
    const done = () => {
      if (window.google?.maps?.Map) resolve(window.google.maps);
      else reject(new Error("maps failed"));
    };
    const prev = window.__godhelpMapReady;
    window.__godhelpMapReady = () => {
      prev?.();
      done();
    };
    if (existing) return;
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    const script = document.createElement("script");
    script.id = "godhelp-maps-js";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__godhelpMapReady&channel=${channel}`;
    script.onerror = () => reject(new Error("maps failed"));
    document.head.appendChild(script);
  });
}

function pin(color: string) {
  return {
    path: "M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    scale: 1.5,
    anchor: { x: 12, y: 24 } as any,
  };
}

export default function PlacesMap({
  places,
  center,
  category,
}: {
  places: Place[];
  center: { latitude: number; longitude: number };
  category: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then((maps) => {
        if (cancelled || !ref.current) return;
        mapRef.current = new maps.Map(ref.current, {
          center: { lat: center.latitude, lng: center.longitude },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map) return;
    map.setCenter({ lat: center.latitude, lng: center.longitude });

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const anchor = new maps.Point(12, 24);
    markersRef.current.push(
      new maps.Marker({
        map,
        position: { lat: center.latitude, lng: center.longitude },
        icon: { ...pin("#111827"), anchor },
        title: "Você está aqui",
        zIndex: 999,
      }),
    );

    const info = new maps.InfoWindow();
    const bounds = new maps.LatLngBounds();
    bounds.extend({ lat: center.latitude, lng: center.longitude });

    places.forEach((place) => {
      if (place.latitude == null || place.longitude == null) return;
      const position = { lat: place.latitude, lng: place.longitude };
      bounds.extend(position);
      const marker = new maps.Marker({
        map,
        position,
        icon: { ...pin(BRAND), anchor },
        title: titleCase(place.name),
      });
      marker.addListener("click", () => {
        info.setContent(
          `<div style="font-family:inherit;font-size:13px;max-width:180px">
            <strong>${titleCase(place.name).replace(/</g, "")}</strong><br/>
            ${formatDistance(place.distanceMeters)}
          </div>`,
        );
        info.open({ map, anchor: marker });
        void navigate({
          to: "/local/$placeId",
          params: { placeId: place.id },
          search: { category },
        });
      });
      markersRef.current.push(marker);
    });

    if (places.length > 0) map.fitBounds(bounds, 48);
  }, [places, center.latitude, center.longitude, category, navigate]);

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Não foi possível carregar o mapa agora.
      </div>
    );
  }

  return <div ref={ref} className="h-[60vh] w-full rounded-2xl border border-border" />;
}
