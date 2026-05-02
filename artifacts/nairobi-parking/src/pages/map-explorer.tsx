import { useGetMapSpots } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Fix standard leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function createCustomIcon(price: number, isSurge: boolean) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="px-2 py-1 rounded-full font-bold text-sm shadow-md whitespace-nowrap ${isSurge ? 'bg-destructive text-white' : 'bg-primary text-white border-2 border-white'}">KES ${price}</div>`,
    iconSize: [60, 30],
    iconAnchor: [30, 30],
  });
}

function MapUpdater({ centerLat, centerLng }: { centerLat: number, centerLng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([centerLat, centerLng], map.getZoom());
  }, [centerLat, centerLng, map]);
  return null;
}

export default function MapExplorer() {
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const zone = searchParams.get('zone');
  const [, setLocation] = useLocation();

  // Default Nairobi Center
  const defaultLat = -1.2921;
  const defaultLng = 36.8219;

  const { data, isLoading } = useGetMapSpots({ lat: defaultLat, lng: defaultLng, radiusKm: 10 });

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-full md:w-[400px] border-r border-border bg-card flex flex-col h-full overflow-y-auto p-4 space-y-4">
        <h2 className="font-bold text-xl">Find Parking</h2>
        <div className="text-sm text-muted-foreground">
          {zone ? `Showing results in or near ${zone}` : 'Showing results around Nairobi'}
        </div>

        {isLoading ? (
          <div className="space-y-4">
             <div className="h-32 bg-muted animate-pulse rounded-lg" />
             <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {data?.spots.map(spot => (
              <Card key={spot.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setLocation(`/spots/${spot.id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold line-clamp-1">{spot.title}</h3>
                    <div className="font-bold whitespace-nowrap text-primary">KES {spot.pricePerHour}/hr</div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{spot.zone}</Badge>
                    {spot.hasCctv && <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/20">CCTV</Badge>}
                    {spot.surgeMultiplier > 1 && <Badge variant="destructive">Surge x{spot.surgeMultiplier}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {data?.spots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No spots found in this area.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="hidden md:block flex-1 relative bg-muted z-0">
        <MapContainer 
          center={[defaultLat, defaultLng]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data?.centerLat && <MapUpdater centerLat={data.centerLat} centerLng={data.centerLng} />}
          
          {data?.spots.map(spot => (
            <Marker 
              key={spot.id} 
              position={[spot.lat, spot.lng]}
              icon={createCustomIcon(spot.pricePerHour, spot.surgeMultiplier > 1)}
              eventHandlers={{
                click: () => setLocation(`/spots/${spot.id}`)
              }}
            >
              <Popup className="min-w-[200px]">
                <div className="font-sans">
                  <h3 className="font-bold">{spot.title}</h3>
                  <p className="text-sm my-1">KES {spot.pricePerHour}/hr</p>
                  <Button size="sm" className="w-full mt-2" onClick={() => setLocation(`/spots/${spot.id}`)}>View Details</Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}