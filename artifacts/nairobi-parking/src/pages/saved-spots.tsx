import { useState, useMemo } from "react";
import { useGetMapSpots } from "@workspace/api-client-react";
import type { MapSpot } from "@workspace/api-client-react";
import { useFavorites } from "@/hooks/use-favorites";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import {
  Heart, MapPin, Star, Shield, Zap, ArrowRight,
  Map, SortAsc, BookOpen, Bookmark, Loader2, TrendingDown, TrendingUp, CheckCircle2,
} from "lucide-react";

type SortKey = "default" | "price_asc" | "price_desc" | "rating";

function SpotCard({ spot, onUnfavorite }: { spot: MapSpot; onUnfavorite: (id: number) => void }) {
  const [, setLocation] = useLocation();

  return (
    <Card className="overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0 mt-0.5">🅿️</span>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {spot.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 line-clamp-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {spot.zone}
              </p>
            </div>
          </div>
          <button
            onClick={() => onUnfavorite(spot.id)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-0.5"
            title="Remove from saved"
            aria-label="Remove from saved"
          >
            <Heart className="h-4 w-4 fill-current" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-primary text-base">
            KES {spot.pricePerHour}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </span>
          <div className="flex items-center gap-2 text-xs">
            {spot.rating ? (
              <span className="inline-flex items-center gap-0.5 text-amber-600">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {spot.rating.toFixed(1)}
              </span>
            ) : null}
            {!spot.isAvailable && (
              <span className="text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded-full">Full</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[11px] py-0">{spot.zone}</Badge>
          {spot.hasCctv && (
            <Badge className="text-[11px] py-0 gap-0.5 bg-emerald-600 text-white">
              <Shield className="h-2.5 w-2.5" />CCTV
            </Badge>
          )}
          {spot.surgeMultiplier > 1 && (
            <Badge className="text-[11px] py-0 gap-0.5 bg-red-500 text-white">
              <Zap className="h-2.5 w-2.5" />×{spot.surgeMultiplier}
            </Badge>
          )}
        </div>

        <Button
          className="w-full h-9 gap-2 text-sm"
          onClick={() => setLocation(`/spots/${spot.id}`)}
        >
          <BookOpen className="h-3.5 w-3.5" />
          View &amp; Book
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SavedSpots() {
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [sortBy, setSortBy] = useState<SortKey>("default");

  const { data, isLoading } = useGetMapSpots({ lat: -1.2921, lng: 36.8219, radiusKm: 20 });

  const savedSpots = useMemo(() => {
    if (!data?.spots) return [];
    const favoriteSet = favorites;
    const matching = data.spots.filter((s) => favoriteSet.has(s.id));

    switch (sortBy) {
      case "price_asc": return [...matching].sort((a, b) => a.pricePerHour - b.pricePerHour);
      case "price_desc": return [...matching].sort((a, b) => b.pricePerHour - a.pricePerHour);
      case "rating": return [...matching].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default: {
        const order = Array.from(favorites);
        return [...matching].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      }
    }
  }, [data?.spots, favorites, sortBy]);

  const isEmpty = favorites.size === 0;

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Spots</h1>
          <p className="text-muted-foreground mt-1">
            {isEmpty
              ? "Bookmark parking spots for quick access"
              : `${favorites.size} saved parking space${favorites.size !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/map">
          <Button variant="outline" className="gap-2 flex-shrink-0">
            <Map className="h-4 w-4" />
            Browse Map
          </Button>
        </Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-24 text-muted-foreground space-y-5">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Heart className="h-10 w-10 text-red-300" />
            </div>
            <Bookmark className="h-5 w-5 text-muted-foreground/40 absolute -bottom-1 -right-1" />
          </div>
          <div>
            <p className="text-lg font-semibold">No saved spots yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Tap the <Heart className="h-3.5 w-3.5 inline text-red-400" /> on any map listing to save it for quick access here
            </p>
          </div>
          <Link href="/map">
            <Button className="gap-2">
              <Map className="h-4 w-4" />
              Browse the Map
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Price comparison summary */}
          {savedSpots.length >= 2 && (() => {
            const maxPrice = Math.max(...savedSpots.map((s) => s.pricePerHour));
            const minPrice = Math.min(...savedSpots.map((s) => s.pricePerHour));
            const availableCount = savedSpots.filter((s) => s.isAvailable).length;
            const cheapest = savedSpots.reduce((a, b) => a.pricePerHour <= b.pricePerHour ? a : b);
            const priciest = savedSpots.reduce((a, b) => a.pricePerHour >= b.pricePerHour ? a : b);
            return (
              <Card className="border-border/50 bg-muted/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold">{availableCount}</span>
                        <span className="text-muted-foreground">/ {savedSpots.length} available now</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <TrendingDown className="h-3.5 w-3.5" />
                        Cheapest: <span className="font-bold">KES {minPrice}/hr</span>
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Priciest: <span className="font-medium">KES {maxPrice}/hr</span>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[...savedSpots]
                      .sort((a, b) => a.pricePerHour - b.pricePerHour)
                      .map((spot) => {
                        const pct = maxPrice > 0 ? Math.max(8, Math.round((spot.pricePerHour / maxPrice) * 100)) : 8;
                        const isCheapest = spot.id === cheapest.id;
                        return (
                          <div key={spot.id} className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground w-28 truncate flex-shrink-0">{spot.title}</p>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isCheapest ? "bg-emerald-500" : "bg-primary/60"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold w-20 text-right flex-shrink-0 ${isCheapest ? "text-emerald-600" : "text-foreground"}`}>
                              KES {spot.pricePerHour}/hr
                              {isCheapest && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded-full">Best</span>}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
              <SortAsc className="h-3.5 w-3.5" />
              Sort:
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Saved Order</SelectItem>
                <SelectItem value="price_asc">Price: Low → High</SelectItem>
                <SelectItem value="price_desc">Price: High → Low</SelectItem>
                <SelectItem value="rating">Best Rated</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => {
                if (window.confirm(`Remove all ${favorites.size} saved spots?`)) {
                  Array.from(favorites).forEach((id) => toggleFavorite(id));
                }
              }}
              className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Heart className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading saved spots…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedSpots.map((spot) => (
                <SpotCard key={spot.id} spot={spot} onUnfavorite={toggleFavorite} />
              ))}
            </div>
          )}

          <div className="text-center pt-2">
            <Link href="/map">
              <Button variant="outline" className="gap-2">
                <Map className="h-4 w-4" />
                Find More Spots
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
