import { Link, useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetMe, getGetMeQueryKey, useListBookings } from "@workspace/api-client-react";
import { LogOut, Menu, X, User, LayoutDashboard, Car, Bell, MapPin, TrendingUp, Clock, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const AVATAR_COLORS: [string, string][] = [
  ["#00A957", "#007a3e"],
  ["#3b82f6", "#1d4ed8"],
  ["#8b5cf6", "#6d28d9"],
  ["#f59e0b", "#b45309"],
  ["#ef4444", "#b91c1c"],
  ["#06b6d4", "#0e7490"],
];

function UserAvatar({ name, userId, size = "md" }: { name: string; userId: number; size?: "sm" | "md" }) {
  const [from, to] = AVATAR_COLORS[(userId - 1) % AVATAR_COLORS.length];
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold text-white border-2 border-white/20 flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials}
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { userId, role, logout, isAuthenticated } = useCurrentUser();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: me } = useGetMe(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) } }
  );

  const isOwner = role === "owner" || role === "both";
  const isAdmin = (role as string) === "admin";

  const { data: pendingBookingsData } = useListBookings(
    { userId: userId ?? 0, role: "owner", status: "pending", limit: 50 },
    { query: { enabled: !!userId && isOwner, queryKey: ["pending-bookings-bell", userId] } }
  );
  const pendingCount = pendingBookingsData?.total ?? 0;

  const NavLink = ({ href, label, ownerStyle = false }: { href: string; label: string; ownerStyle?: boolean }) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary relative",
        ownerStyle
          ? location.startsWith("/owner") ? "text-secondary" : "text-muted-foreground hover:text-secondary"
          : location === href ? "text-primary" : "text-muted-foreground"
      )}
    >
      {label}
      {location === href && !ownerStyle && (
        <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
      {ownerStyle && location.startsWith("/owner") && (
        <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-secondary rounded-full" />
      )}
    </Link>
  );

  const ROLE_BADGE: Record<string, { label: string; color: string }> = {
    commuter: { label: "Commuter", color: "text-primary" },
    owner: { label: "Owner", color: "text-secondary" },
    both: { label: "Owner & Commuter", color: "text-blue-600" },
    admin: { label: "Admin", color: "text-purple-600" },
  };
  const roleBadge = me ? (ROLE_BADGE[me.role] ?? ROLE_BADGE.commuter) : null;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold font-mono text-sm shadow-sm">
              P
            </div>
            <span className="font-bold text-lg tracking-tight">ParkEase<span className="text-primary">.</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-5 h-16">
            <NavLink href="/map" label="Find Parking" />
            <NavLink href="/bookings" label="My Bookings" />
            <NavLink href="/waitlist" label="Waitlist" />
            {isOwner && <NavLink href="/owner/dashboard" label="Owner" ownerStyle />}
            <NavLink href="/admin" label="Analytics" />

            {/* Notification Bell (owners only) */}
            {isAuthenticated && isOwner && (
              <Link href="/owner/bookings" className="relative">
                <button
                  className={cn(
                    "relative p-1.5 rounded-lg transition-colors hover:bg-muted",
                    location === "/owner/bookings" ? "text-primary bg-primary/5" : "text-muted-foreground"
                  )}
                  title={pendingCount > 0 ? `${pendingCount} pending booking requests` : "Booking requests"}
                >
                  <Bell className="h-5 w-5" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none animate-pulse">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </button>
              </Link>
            )}

            {isAuthenticated && me && userId ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-90 transition-opacity outline-none">
                    <UserAvatar name={me.name} userId={userId} />
                    <span className="text-sm font-medium max-w-[90px] truncate hidden lg:block">{me.name.split(" ")[0]}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-border/50 mb-1">
                    <UserAvatar name={me.name} userId={userId} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{me.name}</p>
                      <p className={`text-xs ${roleBadge?.color}`}>{roleBadge?.label}</p>
                    </div>
                  </div>
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
                  {isOwner && (
                    <DropdownMenuItem asChild>
                      <Link href="/owner/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" /> Owner Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem asChild>
                      <Link href="/owner/payouts" className="flex items-center gap-2 cursor-pointer">
                        <TrendingUp className="h-4 w-4" /> Payouts
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isOwner && pendingCount > 0 && (
                    <DropdownMenuItem asChild>
                      <Link href="/owner/bookings" className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                        <Bell className="h-4 w-4" />
                        <span>Requests</span>
                        <span className="ml-auto bg-destructive text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingCount}</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer text-purple-600 focus:text-purple-600">
                        <Shield className="h-4 w-4" /> Analytics
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
              <Button asChild size="sm" className="shadow-sm">
                <Link href="/login">Login</Link>
              </Button>
            )}
          </nav>

          {/* Mobile: Bell + Toggle */}
          <div className="md:hidden flex items-center gap-1">
            {isAuthenticated && isOwner && (
              <Link href="/owner/bookings" className="relative p-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 bg-destructive text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </Link>
            )}
            {isAuthenticated && me && userId && (
              <Link href="/profile" className="p-1">
                <UserAvatar name={me.name} userId={userId} size="sm" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card px-4 py-4 space-y-1">
            {isAuthenticated && me && userId && (
              <div className="flex items-center gap-3 p-3 mb-2 bg-muted/40 rounded-xl">
                <UserAvatar name={me.name} userId={userId} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{me.name}</div>
                  <div className={`text-xs ${roleBadge?.color}`}>{roleBadge?.label}</div>
                </div>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="text-xs h-7">Profile</Button>
                </Link>
              </div>
            )}

            {[
              { href: "/map", label: "Find Parking", icon: <MapPin className="h-4 w-4" /> },
              { href: "/bookings", label: "My Bookings", icon: <Car className="h-4 w-4" /> },
              { href: "/waitlist", label: "Waitlist", icon: <Clock className="h-4 w-4" /> },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location === href ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {icon}{label}
              </Link>
            ))}

            {isOwner && (
              <Link
                href="/owner/dashboard"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.startsWith("/owner") ? "bg-secondary/10 text-secondary" : "hover:bg-muted text-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />Owner Dashboard
              </Link>
            )}
            {isOwner && (
              <Link
                href="/owner/bookings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Bell className="h-4 w-4" />
                Booking Requests
                {pendingCount > 0 && (
                  <span className="bg-destructive text-white text-xs rounded-full px-1.5 py-0.5 leading-none ml-1">{pendingCount}</span>
                )}
              </Link>
            )}
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location === "/admin" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrendingUp className="h-4 w-4" />Analytics
            </Link>

            <div className="pt-2 border-t border-border/50 mt-2">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 text-destructive hover:text-destructive hover:bg-destructive/5"
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
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
