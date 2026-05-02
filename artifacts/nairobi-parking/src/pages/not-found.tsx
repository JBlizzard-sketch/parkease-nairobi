import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Car, Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center space-y-8">
      {/* Illustration */}
      <div className="relative select-none">
        <div className="text-[8rem] leading-none opacity-10 font-black tracking-tighter text-foreground">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Car */}
            <div className="text-6xl animate-bounce" style={{ animationDuration: "2s" }}>🚗</div>
            {/* Shadow */}
            <div className="mx-auto mt-1 w-10 h-2 rounded-full bg-foreground/10 blur-sm" />
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-3 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Wrong Turn!</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Looks like this parking spot doesn't exist. The page you're looking for has either moved or never existed.
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg" className="gap-2">
          <Link href="/map">
            <Search className="h-4 w-4" />
            Find Parking
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>

      {/* Helpful links grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-sm w-full pt-2">
        {[
          { href: "/bookings", icon: <Car className="h-4 w-4" />, label: "My Bookings" },
          { href: "/owner/dashboard", icon: <MapPin className="h-4 w-4" />, label: "Owner Dashboard" },
          { href: "/admin", icon: <ArrowLeft className="h-4 w-4" />, label: "Analytics" },
        ].map(({ href, icon, label }) => (
          <Link key={href} href={href}>
            <div className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary cursor-pointer">
              {icon}
              <span className="font-medium truncate">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ParkEase brand */}
      <div className="flex items-center gap-2 text-muted-foreground/40 pt-2">
        <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center text-primary font-bold text-xs">P</div>
        <span className="text-sm font-bold">ParkEase Nairobi</span>
      </div>
    </div>
  );
}
