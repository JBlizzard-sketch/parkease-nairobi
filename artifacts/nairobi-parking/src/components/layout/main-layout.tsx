import { Link, useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { role, logout, isAuthenticated } = useCurrentUser();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold font-mono">
              P
            </div>
            <span className="font-bold text-lg tracking-tight">ParkEase<span className="text-primary">.</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/map" className={cn("text-sm font-medium transition-colors hover:text-primary", location === '/map' ? "text-primary" : "text-muted-foreground")}>Find Parking</Link>
            <Link href="/bookings" className={cn("text-sm font-medium transition-colors hover:text-primary", location === '/bookings' ? "text-primary" : "text-muted-foreground")}>My Bookings</Link>
            <Link href="/waitlist" className={cn("text-sm font-medium transition-colors hover:text-primary", location === '/waitlist' ? "text-primary" : "text-muted-foreground")}>Waitlist</Link>
            
            {role === 'owner' || role === 'both' ? (
              <Link href="/owner/dashboard" className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors">Owner Dashboard</Link>
            ) : null}

            {isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card px-4 py-4 space-y-4">
            <Link href="/map" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Find Parking</Link>
            <Link href="/bookings" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>My Bookings</Link>
            <Link href="/waitlist" className="block text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>Waitlist</Link>
            {role === 'owner' || role === 'both' ? (
              <Link href="/owner/dashboard" className="block text-sm font-medium text-secondary" onClick={() => setMobileMenuOpen(false)}>Owner Dashboard</Link>
            ) : null}
            {isAuthenticated ? (
              <Button variant="ghost" className="w-full justify-start px-0" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            ) : (
              <Button asChild className="w-full justify-start">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
