import { useGetZoneSummary } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Zap } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { data: zoneSummary, isLoading } = useGetZoneSummary();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/map?zone=${encodeURIComponent(searchQuery)}`);
    } else {
      setLocation('/map');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold font-sans tracking-tight">
            Find Parking in Nairobi.<br/>Fast, Safe, and Affordable.
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
            Unlock hidden driveways, church compounds, and secure office basements across the city. Avoid the hassle, book your spot instantly.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-8 relative flex items-center">
            <MapPin className="absolute left-4 text-muted-foreground h-5 w-5" />
            <Input 
              type="text"
              placeholder="Where do you want to park? (e.g. Westlands, CBD)"
              className="pl-12 pr-32 h-14 text-lg bg-card text-card-foreground rounded-full border-none shadow-lg focus-visible:ring-secondary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="lg" className="absolute right-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Search className="h-5 w-5 mr-2" /> Search
            </Button>
          </form>
        </div>
      </section>

      {/* Zones Grid */}
      <section className="py-16 px-4 bg-background container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold font-sans">Popular Zones</h2>
          <Button variant="outline" asChild>
            <Link href="/map">View Map</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="h-32 animate-pulse bg-muted border-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zoneSummary?.zones.map(zone => (
              <Link key={zone.zone} href={`/map?zone=${encodeURIComponent(zone.zone)}`}>
                <Card className="hover-elevate cursor-pointer border-border/50 hover:border-primary/50 transition-colors h-full flex flex-col justify-between">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-xl">{zone.zone}</h3>
                      {zone.surgeMultiplier > 1 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                          <Zap className="h-3 w-3" /> Surge x{zone.surgeMultiplier}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-end text-sm text-muted-foreground">
                      <div>
                        <span className="font-bold text-foreground">{zone.availableSpots}</span> spots available
                      </div>
                      <div className="text-right">
                        Avg <span className="font-bold text-foreground">KES {zone.avgPricePerHour}</span>/hr
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}