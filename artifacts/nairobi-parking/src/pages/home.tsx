import { useGetZoneSummary } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Zap, ShieldCheck, Clock, CreditCard, Star, TrendingUp, ChevronRight } from "lucide-react";
import { useState } from "react";

const ZONE_ICONS: Record<string, string> = {
  Westlands: "🏙️",
  CBD: "🏢",
  Upperhill: "🏥",
  Kilimani: "🌿",
  Hurlingham: "🛍️",
  Parklands: "🌳",
  Karen: "🏡",
};

const HOW_IT_WORKS = [
  { icon: <Search className="h-6 w-6" />, title: "Search", desc: "Find a spot near your destination on the interactive map. Filter by price, type, and amenities." },
  { icon: <CreditCard className="h-6 w-6" />, title: "Book & Pay", desc: "Select your hours and pay securely via Mpesa. Get your access instructions instantly." },
  { icon: <ShieldCheck className="h-6 w-6" />, title: "Park Safely", desc: "Arrive at your confirmed spot. All spaces are verified and host a security measure." },
];

const TRUST_STATS = [
  { value: "2,400+", label: "Active Spots" },
  { value: "18,000+", label: "Monthly Bookings" },
  { value: "4.8★", label: "Average Rating" },
  { value: "KES 120", label: "Avg Hourly Rate" },
];

export default function Home() {
  const { data: zoneSummary, isLoading } = useGetZoneSummary();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/map?zone=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation("/map");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero ── */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="container mx-auto max-w-4xl px-4 py-20 text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-2">
            <Zap className="h-3.5 w-3.5" /> Nairobi's #1 P2P Parking Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-sans tracking-tight leading-tight">
            Find Parking in Nairobi.<br />
            <span className="text-secondary">Fast, Safe &amp; Affordable.</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Unlock private driveways, church compounds, and secure office basements across the city.
            Avoid the hustle — book your spot in seconds.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-6 relative flex items-center">
            <MapPin className="absolute left-4 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Where do you want to park? (e.g. Westlands, CBD)"
              className="pl-12 pr-36 h-14 text-base bg-card text-card-foreground rounded-full border-none shadow-xl focus-visible:ring-secondary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="submit"
              size="lg"
              className="absolute right-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 px-5 font-bold"
            >
              <Search className="h-4 w-4 mr-1.5" /> Search
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm opacity-80">
            {["Westlands", "CBD", "Kilimani", "Karen"].map((z) => (
              <button
                key={z}
                onClick={() => setLocation(`/map?zone=${z}`)}
                className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
              >
                {ZONE_ICONS[z]} {z}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Stats ── */}
      <section className="bg-card border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-primary font-mono">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
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
              <h2 className="text-2xl font-bold font-sans">Popular Zones</h2>
              <p className="text-muted-foreground text-sm mt-1">Live spot availability across Nairobi</p>
            </div>
            <Button variant="outline" asChild className="gap-1.5">
              <Link href="/map">View Map <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-28 animate-pulse bg-muted border-none" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zoneSummary?.zones.map((zone) => (
                <Link key={zone.zone} href={`/map?zone=${encodeURIComponent(zone.zone)}`}>
                  <Card className="cursor-pointer border-border/50 hover:border-primary/50 hover:shadow-md transition-all group h-full">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{ZONE_ICONS[zone.zone] ?? "🅿️"}</span>
                          <h3 className="font-bold text-lg">{zone.zone}</h3>
                        </div>
                        {zone.surgeMultiplier > 1 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                            <Zap className="h-3 w-3" /> ×{zone.surgeMultiplier}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          <span className="font-bold text-foreground">{zone.availableSpots}</span> spots
                        </span>
                        <span>
                          Avg <span className="font-bold text-foreground">KES {zone.avgPricePerHour}</span>/hr
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Browse spots <ChevronRight className="h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-14 px-4 bg-card border-y border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold font-sans">How ParkEase Works</h2>
            <p className="text-muted-foreground text-sm mt-2">Book parking in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ icon, title, desc }, i) => (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    {icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
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

      {/* ── For Owners CTA ── */}
      <section className="py-14 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wide">For Space Owners</span>
              </div>
              <h2 className="text-2xl font-bold">Turn Your Empty Space Into Income</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                List your driveway, compound, or basement on ParkEase and start earning today.
                We handle payments — you keep 85%.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Verified commuters</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Instant payouts</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-primary" /> Two-sided reviews</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button asChild size="lg" className="font-bold gap-2 shadow-lg">
                <Link href="/login">List My Space</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
