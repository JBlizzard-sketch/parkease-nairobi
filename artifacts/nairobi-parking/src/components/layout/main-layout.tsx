import { Link, useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { LogOut, Menu, X, User, LayoutDashboard, Car, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { userId, role, logout, isAuthenticated } = useCurrentUser();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: me } = useGetMe(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) } }
  );

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary",
        location === href ? "text-primary" : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold font-mono text-sm">
              P
            </div>
            <span className="font-bold text-lg tracking-tight">ParkEase<span className="text-primary">.</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navLink("/map", "Find Parking")}
            {navLink("/bookings", "My Bookings")}
            {navLink("/waitlist", "Waitlist")}
            {(role === "owner" || role === "both") && (
              <Link
                href="/owner/dashboard"
                className={cn(
                  "text-sm font-medium transition-colors",
                  location.startsWith("/owner") ? "text-secondary" : "text-muted-foreground hover:text-secondary"
                )}
              >
                Owner Dashboard
              </Link>
            )}
            <Link
              href="/admin"
              className={cn(
                "text-sm font-medium transition-colors",
                location === "/admin" ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              Analytics
            </Link>

            {isAuthenticated && me ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {me.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium max-w-[100px] truncate hidden lg:block">{me.name.split(" ")[0]}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{me.email || me.phone}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" /> My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookings" className="flex items-center gap-2 cursor-pointer">
                      <Car className="h-4 w-4" /> My Bookings
                    </Link>
                  </DropdownMenuItem>
                  {(role === "owner" || role === "both") && (
                    <DropdownMenuItem asChild>
                      <Link href="/owner/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" /> Owner Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </nav>

          {/* Mobile Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card px-4 py-4 space-y-3">
            {isAuthenticated && me && (
              <div className="flex items-center gap-3 pb-2 mb-1 border-b border-border/50">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {me.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{me.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{me.role}</div>
                </div>
              </div>
            )}
            <Link href="/map" className="block text-sm font-medium py-1" onClick={() => setMobileMenuOpen(false)}>Find Parking</Link>
            <Link href="/bookings" className="block text-sm font-medium py-1" onClick={() => setMobileMenuOpen(false)}>My Bookings</Link>
            <Link href="/waitlist" className="block text-sm font-medium py-1" onClick={() => setMobileMenuOpen(false)}>Waitlist</Link>
            {isAuthenticated && (
              <Link href="/profile" className="block text-sm font-medium py-1" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
            )}
            {(role === "owner" || role === "both") && (
              <Link href="/owner/dashboard" className="block text-sm font-medium text-secondary py-1" onClick={() => setMobileMenuOpen(false)}>
                Owner Dashboard
              </Link>
            )}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="w-full justify-start px-0 text-destructive hover:text-destructive"
                onClick={() => { logout(); setMobileMenuOpen(false); }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            ) : (
              <Button asChild className="w-full">
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
