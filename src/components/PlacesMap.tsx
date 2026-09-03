import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { formatDistance, titleCase, type Place } from "@/lib/places";

const BRAND = "#1f9c55";

/** Pin em SVG inline — evita depender das imagens padrão do Leaflet. */
function pinIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 24 32">
    <path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="12" cy="9" r="3.2" fill="#ffffff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "godhelp-pin",
    iconSize: [30, 40],
    iconAnchor: [15, 34],
    popupAnchor: [0, -30],
  });
}

function FitBounds({
  center,
  places,
}: {
  center: { latitude: number; longitude: number };
  places: Place[];
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [[center.latitude, center.longitude]];
    places.forEach((place) => {
      if (place.latitude != null && place.longitude != null) {
        points.push([place.latitude, place.longitude]);
      }
    });
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([center.latitude, center.longitude], 15);
    }
  }, [map, center.latitude, center.longitude, places]);
  return null;
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
  const navigate = useNavigate();
  const brandIcon = useMemo(() => pinIcon(BRAND), []);
  const meIcon = useMemo(() => pinIcon("#111827"), []);

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={15}
      scrollWheelZoom
      className="h-[60vh] w-full overflow-hidden rounded-2xl border border-border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitBounds center={center} places={places} />

      <Marker position={[center.latitude, center.longitude]} icon={meIcon}>
        <Popup>Você está aqui</Popup>
      </Marker>

      {places.map((place) =>
        place.latitude != null && place.longitude != null ? (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={brandIcon}
            eventHandlers={{
              click: () => {
                void navigate({
                  to: "/local/$placeId",
                  params: { placeId: place.id },
                  search: { category },
                });
              },
            }}
          >
            <Popup>
              <strong>{titleCase(place.name)}</strong>
              <br />
              {formatDistance(place.distanceMeters)}
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  );
}
