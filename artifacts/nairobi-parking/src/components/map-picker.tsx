import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

const PIN_ICON = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;background:#00a957;border:3px solid #ffffff;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;background:#ffffff;border-radius:50%"></div></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)),
  });
  return null;
}

function FlyToCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    const prev = prevRef.current;
    if (!prev || Math.abs(prev[0] - center[0]) > 0.001 || Math.abs(prev[1] - center[1]) > 0.001) {
      map.flyTo(center, 16, { duration: 0.7 });
    }
    prevRef.current = center;
  }, [center, map]);
  return null;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  flyToCenter?: [number, number];
}

export function MapPicker({ lat, lng, onChange, flyToCenter }: MapPickerProps) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: "220px" }}>
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker
            draggable
            position={[lat, lng]}
            icon={PIN_ICON}
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const ll = markerRef.current?.getLatLng();
                if (ll) onChange(+ll.lat.toFixed(6), +ll.lng.toFixed(6));
              },
            }}
          />
          <ClickHandler onPick={onChange} />
          {flyToCenter && <FlyToCenter center={flyToCenter} />}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Click the map or drag the green pin</p>
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </code>
      </div>
    </div>
  );
}
