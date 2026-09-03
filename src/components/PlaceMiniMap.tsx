import { useMemo } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BRAND = "#1f9c55";

function pinIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 24 32">
    <path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z" fill="${BRAND}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="12" cy="9" r="3.2" fill="#ffffff"/>
  </svg>`;
  return L.divIcon({ html: svg, className: "godhelp-pin", iconSize: [30, 40], iconAnchor: [15, 34] });
}

export default function PlaceMiniMap({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const icon = useMemo(() => pinIcon(), []);
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      scrollWheelZoom={false}
      className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Marker position={[latitude, longitude]} icon={icon} />
    </MapContainer>
  );
}
