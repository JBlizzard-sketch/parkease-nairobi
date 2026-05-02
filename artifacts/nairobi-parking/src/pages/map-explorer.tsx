import { useGetMapSpots } from "@workspace/api-client-react";
import type { MapSpot } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Shield, Star, Zap, MapPin, Map, List, Heart, ArrowUpDown } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ZONES = ["All", "Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham", "Parklands", "Karen", "Lavington"];

type SortKey = "default" | "price_asc" | "price_desc" | "rating";

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
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState<SortKey>("default");

  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const zone = p.get("zone");
    if (zone && ZONES.includes(zone as any)) setFilterZone(zone);
  }, [browserLocation]);

  const [filterMaxPrice, setFilterMaxPrice] = useState(500);
  const [filterCctv, setFilterCctv] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterSurge, setFilterSurge] = useState(false);
  const [searchText, setSearchText] = useState("");

  const defaultLat = -1.2921;
  const defaultLng = 36.8219;

  const { data, isLoading } = useGetMapSpots({ lat: defaultLat, lng: defaultLng, radiusKm: 20 });

  const filteredSpots = useMemo(() => {
    if (!data?.spots) return [];
    let spots = data.spots.filter((spot) => {
      if (filterZone !== "All" && spot.zone !== filterZone) return false;
      if (spot.pricePerHour > filterMaxPrice) return false;
      if (filterCctv && !spot.hasCctv) return false;
      if (filterSurge && spot.surgeMultiplier <= 1) return false;
      if (filterMinRating > 0 && (spot.rating ?? 0) < filterMinRating) return false;
      if (searchText && !spot.title.toLowerCase().includes(searchText.toLowerCase()) && !spot.zone.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });

    switch (sortBy) {
      case "price_asc": return [...spots].sort((a, b) => a.pricePerHour - b.pricePerHour);
      case "price_desc": return [...spots].sort((a, b) => b.pricePerHour - a.pricePerHour);
      case "rating": return [...spots].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default: return spots;
    }
  }, [data?.spots, filterZone, filterMaxPrice, filterCctv, filterSurge, filterMinRating, searchText, sortBy]);

  const ZONE_CENTERS: Record<string, [number, number]> = {
    Westlands: [-1.2672, 36.8102], CBD: [-1.2874, 36.8216],
    Upperhill: [-1.2966, 36.8154], Kilimani: [-1.2933, 36.7855],
    Hurlingham: [-1.3017, 36.7911], Parklands: [-1.2628, 36.8209],
    Karen: [-1.3320, 36.7125], All: [defaultLat, defaultLng],
  };

  const mapCenter = ZONE_CENTERS[filterZone] ?? [defaultLat, defaultLng];
  const mapZoom = filterZone === "All" ? 12 : 14;

  const activeFilterCount = [
    filterZone !== "All", filterMaxPrice < 500,
    filterCctv, filterSurge, filterMinRating > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterZone("All"); setFilterMaxPrice(500);
    setFilterCctv(false); setFilterSurge(false); setFilterMinRating(0);
  };

  const FilterPanel = () => (
    <div className="space-y-5 p-1">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zone</Label>
        <Select value={filterZone} onValueChange={setFilterZone}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Max Price: KES {filterMaxPrice}/hr
        </Label>
        <Slider min={50} max={500} step={10} value={[filterMaxPrice]} onValueChange={([v]) => setFilterMaxPrice(v)} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground"><span>KES 50</span><span>KES 500</span></div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min Rating</Label>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setFilterMinRating(r)}
              className={cn("text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                filterMinRating === r ? "bg-amber-500 text-white border-amber-500" : "border-border hover:border-amber-300"
              )}
            >
              {r === 0 ? "Any" : `${r}★+`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amenities</Label>
        <div className="space-y-2.5">
          {([
            [filterCctv, setFilterCctv, "🎥 CCTV Surveillance"],
            [filterSurge, setFilterSurge, "⚡ Surge Pricing Active"],
          ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
            <div key={label} className="flex items-center gap-2">
              <Checkbox checked={val} onCheckedChange={(c) => setter(!!c)} id={label} />
              <label htmlFor={label} className="text-sm cursor-pointer">{label}</label>
            </div>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  const SpotCard = ({ spot }: { spot: Spot }) => (
    <Card
      className={cn("cursor-pointer transition-all", selectedSpotId === spot.id ? "border-primary shadow-md" : "hover:border-primary/40")}
      onClick={() => setSelectedSpotId(spot.id)}
    >
      <CardContent className="p-3.5">
        <div className="flex justify-between items-start gap-2 mb-1">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <span className="text-base flex-shrink-0 mt-0.5">🅿️</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-snug line-clamp-1">{spot.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{spot.zone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(spot.id); }}
              className="p-0.5 hover:scale-110 transition-transform"
              aria-label={isFavorite(spot.id) ? "Remove from favorites" : "Save"}
            >
              <Heart className={cn("h-4 w-4 transition-colors", isFavorite(spot.id) ? "fill-red-500 text-red-500" : "text-muted-foreground/40 hover:text-red-400")} />
            </button>
          </div>
        </div>

        {/* Price + rating row */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm text-primary">KES {spot.pricePerHour}/hr</span>
          <div className="flex items-center gap-2">
            {spot.rating && (
              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                <Star className="h-3 w-3 fill-current" />{spot.rating.toFixed(1)}
              </span>
            )}
            {spot.surgeMultiplier > 1 && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                <Zap className="h-3 w-3" />×{spot.surgeMultiplier}
              </span>
            )}
          </div>
        </div>

        {/* Amenity badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {spot.hasCctv && (
            <span className="inline-flex items-center gap-0.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              <Shield className="h-3 w-3" />CCTV
            </span>
          )}
          {spot.surgeMultiplier > 1 && (
            <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
              <Zap className="h-3 w-3" />Surge
            </span>
          )}
        </div>

        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); setLocation(`/spots/${spot.id}`); }}
        >
          View &amp; Book
        </Button>
      </CardContent>
    </Card>
  );

  const MapView = () => (
    <MapContainer center={[defaultLat, defaultLng]} zoom={12} style={{ height: "100%", width: "100%", zIndex: 0 }}>
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
            <div className="font-sans min-w-[190px] space-y-2">
              <div className="flex items-start gap-1.5">
                <span>🅿️</span>
                <div>
                  <h3 className="font-bold text-sm leading-tight">{spot.title}</h3>
                  <p className="text-xs text-gray-500">{spot.zone}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-green-700">KES {spot.pricePerHour}/hr</span>
                {spot.rating && <span className="text-amber-500 text-xs">★ {spot.rating.toFixed(1)}</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {spot.hasCctv && <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">CCTV</span>}
                {spot.surgeMultiplier > 1 && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">⚡ Surge</span>}
              </div>
              <button
                className="mt-1 w-full bg-green-600 text-white text-xs font-semibold py-1.5 rounded hover:bg-green-700 transition-colors"
                onClick={() => setLocation(`/spots/${spot.id}`)}
              >
                View &amp; Book
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Mobile View Toggle */}
      <div className="md:hidden flex border-b border-border bg-card flex-shrink-0">
        <button
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
            mobileView === "list" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          )}
          onClick={() => setMobileView("list")}
        >
          <List className="h-4 w-4" /> List
          {filteredSpots.length > 0 && <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5">{filteredSpots.length}</span>}
        </button>
        <button
          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
            mobileView === "map" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
          )}
          onClick={() => setMobileView("map")}
        >
          <Map className="h-4 w-4" /> Map
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          mobileView === "list" ? "flex" : "hidden",
          "md:flex w-full md:w-[400px] border-r border-border bg-card flex-col h-full"
        )}>
          {/* Search + sort + filter bar */}
          <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search spots or zones..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="relative gap-1.5 h-9 flex-shrink-0">
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {activeFilterCount}
                      </span>
                    ) : "Filters"}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 overflow-y-auto">
                  <SheetHeader><SheetTitle>Filter Spots</SheetTitle></SheetHeader>
                  <div className="mt-4"><FilterPanel /></div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Sort + count row */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : (
                  <>
                    <span className="font-semibold text-foreground">{filteredSpots.length}</span> of {data?.spots.length ?? 0} spots
                    {filterZone !== "All" && <span className="text-primary font-medium"> · {filterZone}</span>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="text-xs border-0 bg-transparent text-muted-foreground focus:outline-none cursor-pointer"
                >
                  <option value="default">Default</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="rating">Best Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Spot list */}
          <div className="overflow-y-auto flex-1 p-3 space-y-2.5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : filteredSpots.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground space-y-2">
                <MapPin className="h-8 w-8 mx-auto opacity-20" />
                <p className="font-medium">No spots match your filters</p>
                <p className="text-xs">Try adjusting price, zone, or amenities</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-1">Clear filters</button>
                )}
              </div>
            ) : (
              filteredSpots.map((spot) => <SpotCard key={spot.id} spot={spot} />)
            )}
          </div>
        </div>

        {/* Map */}
        <div className={cn(mobileView === "map" ? "flex" : "hidden", "md:flex flex-1 relative z-0")}>
          <MapView />
        </div>
      </div>
    </div>
  );
}
