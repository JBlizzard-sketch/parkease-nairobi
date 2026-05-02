import { useGetMapSpots } from "@workspace/api-client-react";
import type { MapSpot } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Shield, Star, Zap, MapPin } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ZONES = ["All", "Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham", "Parklands", "Karen", "Lavington"];
const SPOT_TYPES = ["driveway", "compound", "basement", "open_plot", "church", "office"];

function createCustomIcon(price: number, isSurge: boolean, selected: boolean) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${selected ? '#f59e0b' : isSurge ? '#ef4444' : '#00A957'};color:white;padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">${isSurge ? '⚡ ' : ''}KES ${price}</div>`,
    iconSize: [70, 30],
    iconAnchor: [35, 30],
  });
}

function MapUpdater({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom());
  }, [lat, lng, zoom, map]);
  return null;
}

type Spot = MapSpot;

export default function MapExplorer() {
  const [browserLocation] = useLocation();
  const qp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialZone = qp.get("zone") || "All";

  const [, setLocation] = useLocation();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [filterZone, setFilterZone] = useState(initialZone);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const zone = p.get("zone");
    if (zone && ZONES.includes(zone as any)) {
      setFilterZone(zone);
    }
  }, [browserLocation]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterMaxPrice, setFilterMaxPrice] = useState(500);
  const [filterCctv, setFilterCctv] = useState(false);
  const [filterRoofed, setFilterRoofed] = useState(false);
  const [filterGated, setFilterGated] = useState(false);
  const [filterSurge, setFilterSurge] = useState(false);
  const [searchText, setSearchText] = useState("");

  const defaultLat = -1.2921;
  const defaultLng = 36.8219;

  const { data, isLoading } = useGetMapSpots({ lat: defaultLat, lng: defaultLng, radiusKm: 20 });

  const filteredSpots = useMemo(() => {
    if (!data?.spots) return [];
    return data.spots.filter((spot) => {
      if (filterZone !== "All" && spot.zone !== filterZone) return false;
      if (spot.pricePerHour > filterMaxPrice) return false;
      if (filterCctv && !spot.hasCctv) return false;
      if (filterSurge && spot.surgeMultiplier <= 1) return false;
      if (searchText && !spot.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [data?.spots, filterZone, filterMaxPrice, filterCctv, filterSurge, searchText]);

  const ZONE_CENTERS: Record<string, [number, number]> = {
    Westlands: [-1.2672, 36.8102],
    CBD: [-1.2874, 36.8216],
    Upperhill: [-1.2966, 36.8154],
    Kilimani: [-1.2933, 36.7855],
    Hurlingham: [-1.3017, 36.7911],
    Parklands: [-1.2628, 36.8209],
    Karen: [-1.3320, 36.7125],
    All: [defaultLat, defaultLng],
  };

  const mapCenter = ZONE_CENTERS[filterZone] ?? [defaultLat, defaultLng];
  const mapZoom = filterZone === "All" ? 12 : 14;

  const toggleType = (t: string) =>
    setFilterTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const activeFilterCount = [
    filterZone !== "All",
    filterTypes.length > 0,
    filterMaxPrice < 500,
    filterCctv,
    filterRoofed,
    filterGated,
    filterSurge,
  ].filter(Boolean).length;

  const FilterPanel = () => (
    <div className="space-y-5 p-1">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zone</Label>
        <Select value={filterZone} onValueChange={setFilterZone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Max Price: KES {filterMaxPrice}/hr
        </Label>
        <Slider
          min={50} max={500} step={10}
          value={[filterMaxPrice]}
          onValueChange={([v]) => setFilterMaxPrice(v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>KES 50</span>
          <span>KES 500</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spot Type</Label>
        <div className="flex flex-wrap gap-2">
          {SPOT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filterTypes.includes(t) ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"}`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</Label>
        <div className="space-y-2.5">
          {([
            [filterCctv, setFilterCctv, "CCTV Surveillance"],
            [filterRoofed, setFilterRoofed, "Covered / Roofed"],
            [filterGated, setFilterGated, "Gated Access"],
            [filterSurge, setFilterSurge, "Surge Pricing Active"],
          ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
            <div key={label} className="flex items-center gap-2">
              <Checkbox checked={val} onCheckedChange={(c) => setter(!!c)} id={label} />
              <label htmlFor={label} className="text-sm cursor-pointer">{label}</label>
            </div>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={() => {
          setFilterZone("All"); setFilterTypes([]); setFilterMaxPrice(500);
          setFilterCctv(false); setFilterRoofed(false); setFilterGated(false); setFilterSurge(false);
        }}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-full md:w-[400px] border-r border-border bg-card flex flex-col h-full">
        {/* Search + filter bar */}
        <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search spots..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative gap-1.5 h-9 flex-shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter Spots</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FilterPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="text-xs text-muted-foreground px-1">
            {isLoading ? "Loading..." : `${filteredSpots.length} of ${data?.spots.length ?? 0} spots`}
            {filterZone !== "All" && <span className="text-primary font-medium"> · {filterZone}</span>}
          </div>
        </div>

        {/* Spot list */}
        <div className="overflow-y-auto flex-1 p-3 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : filteredSpots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No spots match your filters</p>
              <p className="text-xs mt-1">Try adjusting price or zone</p>
            </div>
          ) : (
            filteredSpots.map((spot) => (
              <Card
                key={spot.id}
                className={`cursor-pointer transition-all ${selectedSpotId === spot.id ? "border-primary shadow-md" : "hover:border-primary/50"}`}
                onClick={() => { setSelectedSpotId(spot.id); }}
              >
                <CardContent className="p-3.5">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">{spot.title}</h3>
                    <div className="font-bold text-sm text-primary whitespace-nowrap flex-shrink-0">
                      KES {spot.pricePerHour}/hr
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{spot.zone}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {spot.hasCctv && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <Shield className="h-3 w-3" /> CCTV
                      </span>
                    )}
                    {spot.surgeMultiplier > 1 && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                        <Zap className="h-3 w-3" /> ×{spot.surgeMultiplier}
                      </span>
                    )}
                    {spot.rating && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        <Star className="h-3 w-3 fill-current" /> {spot.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); setLocation(`/spots/${spot.id}`); }}
                  >
                    View &amp; Book
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Map */}
      <div className="hidden md:block flex-1 relative z-0">
        <MapContainer
          center={[defaultLat, defaultLng]}
          zoom={12}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater lat={mapCenter[0]} lng={mapCenter[1]} zoom={mapZoom} />

          {filteredSpots.map((spot) => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createCustomIcon(spot.pricePerHour, spot.surgeMultiplier > 1, selectedSpotId === spot.id)}
              eventHandlers={{ click: () => setSelectedSpotId(spot.id) }}
            >
              <Popup>
                <div className="font-sans min-w-[180px] space-y-1.5">
                  <h3 className="font-bold text-sm">{spot.title}</h3>
                  <p className="text-xs text-gray-500">{spot.zone}</p>
                  <p className="font-semibold text-sm">KES {spot.pricePerHour}/hr</p>
                  {spot.surgeMultiplier > 1 && (
                    <p className="text-xs text-red-600 font-medium">⚡ Surge ×{spot.surgeMultiplier}</p>
                  )}
                  <button
                    className="mt-1 w-full bg-green-600 text-white text-xs font-semibold py-1.5 rounded"
                    onClick={() => setLocation(`/spots/${spot.id}`)}
                  >
                    View &amp; Book
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
