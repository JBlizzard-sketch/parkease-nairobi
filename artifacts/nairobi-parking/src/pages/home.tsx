import { useGetZoneSummary } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Zap, ShieldCheck, Clock, CreditCard, Star, TrendingUp, ChevronRight, Car, Users, CheckCircle2 } from "lucide-react";
import { useState } from "react";

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

const RECENT_ACTIVITY = [
  { name: "James M.", action: "booked", zone: "Westlands", ago: "2 min ago" },
  { name: "Grace A.", action: "listed a new spot in", zone: "Kilimani", ago: "5 min ago" },
  { name: "David K.", action: "completed booking in", zone: "CBD", ago: "8 min ago" },
  { name: "Amina S.", action: "joined waitlist for", zone: "Upperhill", ago: "12 min ago" },
  { name: "Wanjiku N.", action: "booked", zone: "Karen", ago: "15 min ago" },
];

export default function Home() {
  const { data: zoneSummary, isLoading } = useGetZoneSummary();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const totalSpots = zoneSummary?.zones.reduce((s, z) => s + z.totalSpots, 0) ?? 0;
  const totalAvailable = zoneSummary?.zones.reduce((s, z) => s + z.availableSpots, 0) ?? 0;
  const surgeZones = zoneSummary?.zones.filter((z) => z.surgeMultiplier > 1).length ?? 0;
  const avgPrice = zoneSummary?.zones.length
    ? Math.round(zoneSummary.zones.reduce((s, z) => s + z.avgPricePerHour, 0) / zoneSummary.zones.length)
    : 160;

  const TRUST_STATS = [
    { value: totalSpots > 0 ? `${totalSpots}` : "35+", label: "Listed Spots", icon: <MapPin className="h-4 w-4" /> },
    { value: totalAvailable > 0 ? `${totalAvailable}` : "20+", label: "Available Now", icon: <Car className="h-4 w-4" /> },
    { value: "4.4★", label: "Avg Rating", icon: <Star className="h-4 w-4" /> },
    { value: `KES ${avgPrice}`, label: "Avg Hourly Rate", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setLocation(`/map?zone=${encodeURIComponent(trimmed)}`);
    } else {
      setLocation("/map");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero ── */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)",
        }} />
        {/* Floating spots decorations */}
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

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-6 relative flex items-center shadow-2xl">
            <MapPin className="absolute left-4 text-muted-foreground h-5 w-5 z-10" />
            <Input
              type="text"
              placeholder="Where do you want to park? (e.g. Westlands, CBD...)"
              className="pl-12 pr-36 h-14 text-base bg-card text-card-foreground rounded-full border-0 focus-visible:ring-secondary focus-visible:ring-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="submit"
              size="lg"
              className="absolute right-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 px-6 font-bold"
            >
              <Search className="h-4 w-4 mr-1.5" /> Search
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-2 text-sm">
            {["Westlands", "CBD", "Kilimani", "Karen", "Parklands", "Upperhill"].map((z) => (
              <button
                key={z}
                onClick={() => setLocation(`/map?zone=${z}`)}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors text-white/90 hover:text-white"
              >
                {ZONE_ICONS[z]} {z}
              </button>
            ))}
          </div>
        </div>
      </section>

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

                        {/* Occupancy bar */}
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

      {/* ── How It Works ── */}
      <section className="py-14 px-4 bg-card border-y border-border">
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
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-card rounded-xl px-3.5 py-2.5 border border-border flex-shrink-0 min-w-fit">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                  {item.name[0]}
                </div>
                <div>
                  <p className="text-xs font-medium">
                    <span className="text-foreground">{item.name}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="text-primary font-semibold">{item.zone}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.ago}</p>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
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
          </div>
        </div>
      </section>
    </div>
  );
}
