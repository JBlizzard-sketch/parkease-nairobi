import { useGetZoneSummary, useGetMapSpots, useListBookings, getListBookingsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, MapPin, Zap, ShieldCheck, Clock, CreditCard, Star,
  TrendingUp, ChevronRight, Car, Users, CheckCircle2, Heart,
  Navigation, Calendar, ArrowRight, History, X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useFavorites } from "@/hooks/use-favorites";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";

const ZONE_ICONS: Record<string, string> = {
  Westlands: "🏙️", CBD: "🏢", Upperhill: "🏥", Kilimani: "🌿",
  Hurlingham: "🛍️", Parklands: "🌳", Karen: "🏡", Lavington: "🌺",
};

const HOW_IT_WORKS = [
  { icon: <Search className="h-6 w-6" />, title: "Search", desc: "Find a spot near your destination on the interactive map. Filter by price, type, and amenities." },
  { icon: <CreditCard className="h-6 w-6" />, title: "Book & Pay", desc: "Select your hours and pay securely via Mpesa STK push. Get your access instructions instantly." },
  { icon: <ShieldCheck className="h-6 w-6" />, title: "Park Safely", desc: "Arrive at your confirmed spot. All spaces are verified with CCTV or watchman security." },
];

const OWNER_PERKS = [
  { icon: <ShieldCheck className="h-5 w-5 text-primary" />, label: "Verified commuters" },
  { icon: <Clock className="h-5 w-5 text-primary" />, label: "Instant Mpesa payouts" },
  { icon: <Star className="h-5 w-5 text-primary" />, label: "Two-sided reviews" },
  { icon: <Zap className="h-5 w-5 text-primary" />, label: "Surge pricing boost" },
];

const ACTIVITY_FALLBACK = [
  { name: "James M.", action: "booked in", zone: "Westlands", ago: "2 min ago", done: false },
  { name: "Grace A.", action: "completed in", zone: "Kilimani", ago: "5 min ago", done: true },
  { name: "David K.", action: "booked in", zone: "CBD", ago: "8 min ago", done: false },
  { name: "Amina S.", action: "booked in", zone: "Upperhill", ago: "12 min ago", done: false },
  { name: "Wanjiku N.", action: "completed in", zone: "Karen", ago: "15 min ago", done: true },
];

const AVATAR_COLORS = [
  "from-emerald-400 to-emerald-600", "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600", "from-amber-400 to-amber-600",
  "from-pink-400 to-pink-600", "from-cyan-400 to-cyan-600",
];

type ZoneItem = { zone: string; avgPricePerHour: number };

function EarningsCalculator({ zones }: { zones: ZoneItem[] }) {
  const [calcZone, setCalcZone] = useState<string>("");
  const [calcHours, setCalcHours] = useState(6);
  const [calcDays, setCalcDays] = useState(5);

  const effectiveZone = calcZone || (zones[0]?.zone ?? "");
  const selectedZone = zones.find((z) => z.zone === effectiveZone) ?? zones[0];
  const avgPrice = selectedZone?.avgPricePerHour ?? 200;
  const monthly = Math.round(avgPrice * calcHours * calcDays * 4.33 * 0.85);
  const weekly = Math.round(avgPrice * calcHours * calcDays * 0.85);

  if (!zones.length) return null;

  return (
    <div className="mt-8 border-t border-primary/20 pt-6 space-y-4">
      <div>
        <h3 className="font-bold text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Earnings Calculator
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">See what your space could earn — adjust the sliders</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Zone</label>
          <select
            value={effectiveZone}
            onChange={(e) => setCalcZone(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {zones.map((z) => (
              <option key={z.zone} value={z.zone}>
                {z.zone} — KES {z.avgPricePerHour}/hr avg
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Hours / day: <span className="text-foreground">{calcHours}h</span>
          </label>
          <input
            type="range" min={1} max={12} value={calcHours}
            onChange={(e) => setCalcHours(Number(e.target.value))}
            className="w-full accent-primary mt-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>1h</span><span>6h</span><span>12h</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Days / week: <span className="text-foreground">{calcDays}d</span>
          </label>
          <input
            type="range" min={1} max={7} value={calcDays}
            onChange={(e) => setCalcDays(Number(e.target.value))}
            className="w-full accent-primary mt-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>1d</span><span>4d</span><span>7d</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-5 py-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Estimated take-home earnings</p>
          <p className="text-3xl font-bold text-primary">
            KES {monthly.toLocaleString()}
            <span className="text-base font-normal text-muted-foreground"> / month</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">≈ KES {weekly.toLocaleString()} / week</p>
        </div>
        <div className="sm:ml-auto text-xs text-muted-foreground space-y-0.5">
          <p>KES {avgPrice}/hr × {calcHours}h × {calcDays}d/wk × 4.3 wks</p>
          <p className="text-primary font-semibold">After 15% ParkEase platform fee</p>
        </div>
      </div>
    </div>
  );
}

const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export default function Home() {
  const { data: zoneSummary, isLoading } = useGetZoneSummary();
  const { data: mapData } = useGetMapSpots({ lat: -1.2921, lng: 36.8219, radiusKm: 20 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setLocation] = useLocation();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { userId } = useCurrentUser();
  const { recentIds, clearRecent } = useRecentlyViewed();

  const { data: bookingsData } = useListBookings(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? 0 }) } }
  );

  const { data: platformActivity } = useListBookings(
    { limit: 20 },
    { query: { queryKey: ["home-platform-activity"] } }
  );

  // Most recent active booking: confirmed first, then pending
  const activeBooking = (() => {
    const all = bookingsData?.bookings ?? [];
    return (
      all.find((b) => b.status === "confirmed") ??
      all.find((b) => b.status === "pending") ??
      null
    );
  })();

  const liveActivity = useMemo(() => {
    const bookings = (platformActivity?.bookings ?? [])
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .slice(0, 5);
    if (bookings.length === 0) return ACTIVITY_FALLBACK;
    return bookings.map((b) => {
      const zone = b.spotAddress?.split(",").pop()?.trim() || "Nairobi";
      const done = b.status === "completed";
      const mins = 2 + (b.id % 47);
      const ago = mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`;
      return { name: b.commuterName ?? "A commuter", action: done ? "completed in" : "booked in", zone, ago, done };
    });
  }, [platformActivity]);

  const totalSpots     = zoneSummary?.zones.reduce((s, z) => s + z.totalSpots, 0) ?? 0;
  const totalAvailable = zoneSummary?.zones.reduce((s, z) => s + z.availableSpots, 0) ?? 0;
  const surgeZones     = zoneSummary?.zones.filter((z) => z.surgeMultiplier > 1).length ?? 0;
  const avgPrice       = zoneSummary?.zones.length
    ? Math.round(zoneSummary.zones.reduce((s, z) => s + z.avgPricePerHour, 0) / zoneSummary.zones.length)
    : 160;

  // Top-rated spots from the live API
  const topSpots = (mapData?.spots ?? [])
    .filter((s) => s.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  const TRUST_STATS = [
    { value: totalSpots > 0 ? `${totalSpots}` : "35+", label: "Listed Spots", icon: <MapPin className="h-4 w-4" /> },
    { value: totalAvailable > 0 ? `${totalAvailable}` : "20+", label: "Available Now", icon: <Car className="h-4 w-4" /> },
    { value: "4.4★", label: "Avg Rating", icon: <Star className="h-4 w-4" /> },
    { value: `KES ${avgPrice}`, label: "Avg Hourly Rate", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ type: "zone" | "spot"; label: string; sub: string; href: string }> = [];
    for (const zone of (zoneSummary?.zones ?? [])) {
      if (zone.zone.toLowerCase().includes(q)) {
        results.push({
          type: "zone",
          label: zone.zone,
          sub: `${zone.availableSpots} available · KES ${zone.avgPricePerHour}/hr avg`,
          href: `/map?zone=${encodeURIComponent(zone.zone)}`,
        });
      }
    }
    for (const spot of (mapData?.spots ?? [])) {
      if (results.length >= 6) break;
      if (spot.title.toLowerCase().includes(q) || spot.zone.toLowerCase().includes(q)) {
        results.push({
          type: "spot",
          label: spot.title,
          sub: `${spot.zone} · KES ${spot.pricePerHour}/hr`,
          href: `/spots/${spot.id}`,
        });
      }
    }
    return results.slice(0, 6);
  }, [searchQuery, zoneSummary, mapData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const trimmed = searchQuery.trim();
    setLocation(trimmed ? `/map?zone=${encodeURIComponent(trimmed)}` : "/map");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero ── */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)",
        }} />
        <div className="absolute top-10 right-10 opacity-10 text-6xl select-none">🚗</div>
        <div className="absolute bottom-10 left-8 opacity-10 text-4xl select-none">🅿️</div>

        <div className="container mx-auto max-w-4xl px-4 py-20 text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-medium px-4 py-1.5 rounded-full">
            <Zap className="h-3.5 w-3.5 text-secondary" />
            Nairobi's #1 P2P Parking Platform
            {surgeZones > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{surgeZones} surge zone{surgeZones > 1 ? "s" : ""}</span>
            )}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Find Parking in Nairobi.<br />
            <span className="text-secondary">Fast, Safe &amp; Affordable.</span>
          </h1>

          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Unlock private driveways, church compounds, and secure office basements across the city. Book your spot in seconds.
          </p>

          <div className="max-w-2xl mx-auto mt-6 relative">
            <form onSubmit={handleSearch} className="relative flex items-center shadow-2xl">
              <MapPin className="absolute left-4 text-muted-foreground h-5 w-5 z-10" />
              <Input
                type="text"
                placeholder="Where do you want to park? (e.g. Westlands, CBD...)"
                className="pl-12 pr-36 h-14 text-base bg-card text-card-foreground rounded-full border-0 focus-visible:ring-secondary focus-visible:ring-2"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              <Button type="submit" size="lg" className="absolute right-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 px-6 font-bold">
                <Search className="h-4 w-4 mr-1.5" /> Search
              </Button>
            </form>

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 text-left border-b border-border last:border-0 transition-colors"
                    onMouseDown={() => { setLocation(s.href); setShowSuggestions(false); setSearchQuery(""); }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {s.type === "zone"
                        ? <MapPin className="h-3.5 w-3.5 text-primary" />
                        : <Car className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2 text-sm">
            {["Westlands", "CBD", "Kilimani", "Karen", "Parklands", "Upperhill"].map((z) => (
              <button key={z} onClick={() => setLocation(`/map?zone=${z}`)}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors text-white/90 hover:text-white"
              >
                {ZONE_ICONS[z]} {z}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Active Booking Banner ── */}
      {activeBooking && (
        <section className="bg-primary/5 border-b border-primary/20">
          <div className="container mx-auto max-w-4xl px-4 py-3">
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${activeBooking.status === "confirmed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                {activeBooking.status === "confirmed" ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{activeBooking.spotTitle}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{activeBooking.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtHour(activeBooking.startHour)} – {fmtHour(activeBooking.endHour)}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 ${activeBooking.status === "confirmed" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                    {activeBooking.status === "confirmed" ? "Confirmed" : "Awaiting Payment"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                {activeBooking.status === "confirmed" && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeBooking.spotLat},${activeBooking.spotLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Navigation className="h-3.5 w-3.5" />
                      Directions
                    </Button>
                  </a>
                )}
                <Link href={`/book/${activeBooking.id}`}>
                  <Button size="sm" className="gap-1.5 h-8 text-xs">
                    View <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Live Trust Stats ── */}
      <section className="bg-card border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_STATS.map(({ value, label, icon }) => (
              <div key={label} className="flex items-center gap-3 justify-center">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
                <div>
                  <div className="text-xl font-bold text-primary font-mono">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Continue Browsing ── */}
      {recentIds.length > 0 && (
        <section className="py-8 px-4 bg-background border-b border-border">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-bold text-base">Continue Browsing</h2>
                <span className="text-xs text-muted-foreground">({recentIds.length} recently viewed)</span>
              </div>
              <button
                onClick={clearRecent}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {recentIds.slice(0, 6).map((spotId) => {
                const spot = mapData?.spots.find((s) => s.id === spotId);
                if (!spot) return null;
                return (
                  <Link key={spotId} href={`/spots/${spot.id}`}>
                    <Card className="flex-shrink-0 w-52 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer group">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-xs leading-tight line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                            {spot.title}
                          </h3>
                          {spot.rating && (
                            <span className="flex items-center gap-0.5 text-amber-500 flex-shrink-0 text-[10px] font-bold">
                              <Star className="h-2.5 w-2.5 fill-current" />{spot.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{spot.zone}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-primary">KES {spot.pricePerHour}/hr</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${spot.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                            {spot.isAvailable ? "Free" : "Booked"}
                          </span>
                        </div>
                        {spot.surgeMultiplier > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                            <Zap className="h-2.5 w-2.5" /> Surge ×{spot.surgeMultiplier}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Zones Grid ── */}
      <section className="py-14 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Browse by Zone</h2>
              <p className="text-muted-foreground text-sm mt-1">Live availability across all Nairobi zones</p>
            </div>
            <Button variant="outline" asChild className="gap-1.5 hidden sm:flex">
              <Link href="/map">View Full Map <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map((i) => <Card key={i} className="h-28 animate-pulse bg-muted border-none" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {zoneSummary?.zones.map((zone) => {
                const occupancy = zone.totalSpots > 0 ? ((zone.totalSpots - zone.availableSpots) / zone.totalSpots) * 100 : 0;
                return (
                  <Link key={zone.zone} href={`/map?zone=${encodeURIComponent(zone.zone)}`}>
                    <Card className="cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-2xl mb-1">{ZONE_ICONS[zone.zone] ?? "🅿️"}</div>
                            <h3 className="font-bold text-sm">{zone.zone}</h3>
                          </div>
                          {zone.surgeMultiplier > 1 && (
                            <span className="text-[10px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Zap className="h-2.5 w-2.5" /> ×{zone.surgeMultiplier}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                          <span className="font-semibold text-foreground">{zone.availableSpots}/{zone.totalSpots}</span>
                          <span>KES {zone.avgPricePerHour}/hr</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${occupancy > 80 ? "bg-red-500" : occupancy > 50 ? "bg-amber-500" : "bg-primary"}`}
                            style={{ width: `${occupancy}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {occupancy > 80 ? "Almost full" : occupancy > 50 ? "Filling up" : "Available"}
                        </p>
                        {zone.waitlistCount > 0 && (
                          <p className="text-[10px] text-amber-600 flex items-center gap-0.5 mt-1">
                            <Users className="h-2.5 w-2.5" /> {zone.waitlistCount} waiting
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild>
              <Link href="/map">View Full Map <ChevronRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Top Rated Spots ── */}
      {topSpots.length > 0 && (
        <section className="py-12 px-4 bg-card border-y border-border">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Top Rated Spots</h2>
                <p className="text-muted-foreground text-sm mt-1">Highest-rated spaces across Nairobi</p>
              </div>
              <Button variant="outline" asChild className="gap-1.5 hidden sm:flex">
                <Link href="/map">All Spots <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topSpots.map((spot, i) => (
                <Card key={spot.id} className="hover:shadow-md hover:border-primary/40 transition-all group">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm leading-tight line-clamp-1">{spot.title}</h3>
                          <p className="text-xs text-muted-foreground">{spot.zone}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(spot.id); }}
                        className="flex-shrink-0 p-0.5"
                      >
                        <Heart className={`h-4 w-4 transition-colors ${isFavorite(spot.id) ? "fill-red-500 text-red-500" : "text-muted-foreground/30 hover:text-red-400"}`} />
                      </button>
                    </div>

                    {/* Rating + price */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s < Math.round(spot.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                        <span className="text-xs font-semibold text-amber-600 ml-1">{spot.rating?.toFixed(1)}</span>
                      </div>
                      <span className="font-bold text-sm text-primary">KES {spot.pricePerHour}/hr</span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {spot.hasCctv && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" />CCTV
                        </span>
                      )}
                      {spot.surgeMultiplier > 1 && (
                        <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                          <Zap className="h-3 w-3" />Surge
                        </span>
                      )}
                      <span className="text-xs bg-primary/5 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                        {spot.isAvailable ? "Available" : "Booked"}
                      </span>
                    </div>

                    <Link href={`/spots/${spot.id}`}>
                      <Button size="sm" className="w-full h-8 text-xs gap-1.5 group-hover:bg-primary">
                        View &amp; Book
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="py-14 px-4 bg-background border-b border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">How ParkEase Works</h2>
            <p className="text-muted-foreground text-sm mt-2">Book parking in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-7 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {HOW_IT_WORKS.map(({ icon, title, desc }, i) => (
              <div key={title} className="flex flex-col items-center text-center gap-3 relative">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                    {icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Activity Ticker ── */}
      <section className="py-8 px-4 bg-muted/30 border-b border-border overflow-hidden">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Activity</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-1">
            {liveActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-card rounded-xl px-3.5 py-2.5 border border-border flex-shrink-0 min-w-fit">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center font-bold text-white text-xs flex-shrink-0`}>
                  {item.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium">
                    <span className="text-foreground">{item.name}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="text-primary font-semibold">{item.zone}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.ago}</p>
                </div>
                <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${item.done ? "text-blue-500" : "text-emerald-500"}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Owners CTA ── */}
      <section className="py-14 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-secondary/5 border border-primary/20 p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-primary uppercase tracking-widest">For Space Owners</span>
                </div>
                <h2 className="text-3xl font-bold leading-tight">Turn Your Empty Space Into Income</h2>
                <p className="text-muted-foreground max-w-md">
                  List your driveway, compound, or basement on ParkEase and start earning today. We handle all payments — you keep <strong className="text-foreground">85%</strong> of every booking.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {OWNER_PERKS.map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {icon} {label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center gap-3">
                <Button asChild size="lg" className="font-bold gap-2 shadow-lg px-8 h-12">
                  <Link href="/login">List My Space</Link>
                </Button>
                <p className="text-xs text-muted-foreground">Free to list · No monthly fees</p>
              </div>
            </div>

            {/* Earnings Calculator */}
            <EarningsCalculator zones={zoneSummary?.zones ?? []} />
          </div>
        </div>
      </section>
    </div>
  );
}
