import { useMemo } from "react";
import {
  useGetMe, useListBookings, useGetSpot,
  getGetMeQueryKey, getListBookingsQueryKey,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFavorites } from "@/hooks/use-favorites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Car, Clock, TrendingUp, Star, MapPin, Heart, Zap, ArrowRight,
  CheckCircle2, ChevronRight, Shield, Wallet, BarChart2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const ZONE_COLORS: Record<string, string> = {
  Westlands: "#00A957", CBD: "#3b82f6", Upperhill: "#8b5cf6",
  Kilimani: "#f59e0b", Hurlingham: "#ec4899", Parklands: "#06b6d4",
  Karen: "#84cc16", Lavington: "#f97316",
};
const PIE_PALETTE = ["#00A957","#3b82f6","#8b5cf6","#f59e0b","#ec4899","#06b6d4","#84cc16","#f97316"];

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
const fmtDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" }); }
  catch { return d; }
};

type Tier = { label: string; color: string; bg: string; border: string; icon: string; minTrips: number };
const TIERS: Tier[] = [
  { label: "Elite Parker",   color: "text-cyan-700",   bg: "bg-cyan-50",   border: "border-cyan-200",   icon: "💎", minTrips: 30 },
  { label: "Pro Parker",     color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  icon: "🥇", minTrips: 15 },
  { label: "Regular Parker", color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200",  icon: "🥈", minTrips: 5  },
  { label: "Rookie Parker",  color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",icon: "🅿️", minTrips: 0  },
];
function getTier(completedTrips: number): Tier {
  return TIERS.find((t) => completedTrips >= t.minTrips) ?? TIERS[TIERS.length - 1];
}
function getNextTier(completedTrips: number): { tier: Tier; needed: number } | null {
  const idx = TIERS.findIndex((t) => completedTrips >= t.minTrips);
  if (idx === 0) return null;
  const next = TIERS[idx - 1];
  return { tier: next, needed: next.minTrips - completedTrips };
}

function FavoriteSpotCard({ spotId }: { spotId: number }) {
  const { data: spot, isLoading } = useGetSpot(spotId);
  const [, setLocation] = useLocation();
  if (isLoading) return <div className="h-20 w-36 bg-muted animate-pulse rounded-xl flex-shrink-0" />;
  if (!spot) return null;
  return (
    <button
      onClick={() => setLocation(`/spots/${spot.id}`)}
      className="flex-shrink-0 w-36 bg-card border border-border rounded-xl p-3 text-left hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="text-lg mb-1">🅿️</div>
      <p className="text-xs font-semibold leading-tight truncate group-hover:text-primary transition-colors">{spot.title}</p>
      <p className="text-xs text-muted-foreground truncate mt-0.5">{spot.zone}</p>
      <p className="text-xs font-bold text-primary mt-1">KES {spot.pricePerHour}/hr</p>
    </button>
  );
}

export default function CommuterDashboard() {
  const { userId } = useCurrentUser();
  const { favorites } = useFavorites();
  const [, setLocation] = useLocation();

  const { data: me } = useGetMe(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) } }
  );

  const { data: completedData, isLoading: loadingCompleted } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "completed", limit: 200 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "completed", limit: 200 }) } }
  );
  const { data: confirmedData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "confirmed", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "confirmed", limit: 20 }) } }
  );
  const { data: pendingData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "pending", limit: 10 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "pending", limit: 10 }) } }
  );
  const { data: cancelledData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "cancelled", limit: 50 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "cancelled", limit: 50 }) } }
  );

  const completed = completedData?.bookings ?? [];
  const confirmed = confirmedData?.bookings ?? [];
  const pending = pendingData?.bookings ?? [];
  const cancelled = cancelledData?.bookings ?? [];

  const allPast = [...completed, ...cancelled];
  const recent = [...confirmed, ...pending, ...completed]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const activeBooking = confirmed[0] ?? pending[0] ?? null;

  const stats = useMemo(() => {
    const totalTrips = completed.length;
    const totalHours = completed.reduce((s, b) => s + (b.totalHours ?? 0), 0);
    const totalSpent = completed.reduce((s, b) => s + (b.totalAmount ?? 0), 0);
    const ratingsGiven = completed.filter((b) => (b as any).rating != null).length;
    const avgRating = ratingsGiven > 0
      ? completed.filter((b) => (b as any).rating != null).reduce((s, b) => s + ((b as any).rating ?? 0), 0) / ratingsGiven
      : null;
    return { totalTrips, totalHours, totalSpent, avgRating };
  }, [completed]);

  const monthlyChart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of completed) {
      if (!b.date) continue;
      const m = b.date.substring(0, 7);
      map[m] = (map[m] ?? 0) + (b.totalAmount ?? 0);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, spent]) => ({
        month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(month.split("-")[1]) - 1],
        spent,
      }));
  }, [completed]);

  const zoneChart = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of completed) {
      const zone = (b as any).spotZone ?? (b.spotAddress?.split(",").pop()?.trim() ?? "Other");
      map[zone] = (map[zone] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([zone, count]) => ({ zone, count }));
  }, [completed]);

  const tier = getTier(stats.totalTrips);
  const nextTier = getNextTier(stats.totalTrips);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = me?.name.split(" ")[0] ?? "there";

  if (!userId) {
    return (
      <div className="container mx-auto p-8 text-center text-muted-foreground">
        <p className="mb-4">Please log in to view your dashboard.</p>
        <Button asChild><Link href="/login">Login</Link></Button>
      </div>
    );
  }

  const KPIS = [
    {
      label: "Total Trips",
      value: stats.totalTrips,
      sub: `${cancelled.length} cancelled`,
      icon: <Car className="h-4 w-4" />,
      bg: "bg-primary",
      fmt: (v: number) => String(v),
    },
    {
      label: "Hours Parked",
      value: stats.totalHours,
      sub: `avg ${stats.totalTrips > 0 ? (stats.totalHours / stats.totalTrips).toFixed(1) : "0"}h per trip`,
      icon: <Clock className="h-4 w-4" />,
      bg: "bg-blue-500",
      fmt: (v: number) => `${v.toFixed(0)}h`,
    },
    {
      label: "Total Spent",
      value: stats.totalSpent,
      sub: `KES ${Math.round(stats.totalSpent * 0.15).toLocaleString()} platform fees`,
      icon: <Wallet className="h-4 w-4" />,
      bg: "bg-amber-500",
      fmt: (v: number) => `KES ${v.toLocaleString()}`,
    },
    {
      label: "Avg Rating Given",
      value: stats.avgRating ?? 0,
      sub: stats.avgRating != null ? "based on your reviews" : "No reviews yet",
      icon: <Star className="h-4 w-4" />,
      bg: "bg-violet-500",
      fmt: (v: number) => v > 0 ? v.toFixed(1) + "★" : "—",
    },
  ];

  const STATUS_COLORS: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-800 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    completed: "bg-blue-100 text-blue-800 border-blue-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's your parking overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border",
            tier.bg, tier.color, tier.border
          )}>
            <span className="text-base">{tier.icon}</span>
            {tier.label}
          </span>
          {nextTier && (
            <p className="text-xs text-muted-foreground">
              {nextTier.needed} trip{nextTier.needed !== 1 ? "s" : ""} to {nextTier.tier.icon} {nextTier.tier.label}
            </p>
          )}
        </div>
      </div>

      {/* KPI Row */}
      {loadingCompleted ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((kpi) => (
            <Card key={kpi.label} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn("p-1.5 rounded-lg text-white", kpi.bg)}>
                    {kpi.icon}
                  </div>
                </div>
                <p className="text-xl font-bold tracking-tight">{kpi.fmt(kpi.value)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{kpi.label}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug truncate">{kpi.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Booking Banner */}
      {activeBooking && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{activeBooking.spotTitle}</p>
                  <Badge className={cn("text-xs border", STATUS_COLORS[activeBooking.status])}>
                    {activeBooking.status}
                  </Badge>
                  {activeBooking.surgeMultiplier && activeBooking.surgeMultiplier > 1 && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                      <Zap className="h-3 w-3" />×{activeBooking.surgeMultiplier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(activeBooking.date ?? "")} · {fmtHour(activeBooking.startHour ?? 0)} – {fmtHour(activeBooking.endHour ?? 0)} · KES {activeBooking.totalAmount?.toLocaleString()}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5 flex-shrink-0" asChild>
              <Link href={`/book/${activeBooking.id}`}>View Details <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Spending trend */}
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Monthly Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChart.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                <BarChart2 className="h-8 w-8" />
                <p className="text-xs">No spending data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A957" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00A957" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} width={45} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Spent"]}
                  />
                  <Area type="monotone" dataKey="spent" stroke="#00A957" strokeWidth={2} fill="url(#spendGradient)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Zone breakdown */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />Top Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zoneChart.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                <MapPin className="h-8 w-8" />
                <p className="text-xs">No zone data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={zoneChart}
                    dataKey="count"
                    nameKey="zone"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={35}
                    paddingAngle={3}
                  >
                    {zoneChart.map((entry, idx) => (
                      <Cell
                        key={entry.zone}
                        fill={ZONE_COLORS[entry.zone] ?? PIE_PALETTE[idx % PIE_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(v: number) => [`${v} trip${v !== 1 ? "s" : ""}`, ""]}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />Recent Bookings
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" asChild>
              <Link href="/bookings">View all <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <Car className="h-8 w-8 mx-auto opacity-20" />
                <p className="text-xs">No bookings yet</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/map">Find a spot</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((b) => (
                  <Link key={b.id} href={`/book/${b.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🅿️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{b.spotTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(b.date ?? "")} · {fmtHour(b.startHour ?? 0)}–{fmtHour(b.endHour ?? 0)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge className={cn("text-[10px] border px-1.5 py-0.5 leading-none", STATUS_COLORS[b.status])}>
                          {b.status}
                        </Badge>
                        <span className="text-xs font-bold text-primary">KES {b.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Spots */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />Saved Spots
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" asChild>
              <Link href="/map">Browse more <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {favorites.size === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <Heart className="h-8 w-8 mx-auto opacity-20" />
                <p className="text-xs">No saved spots yet</p>
                <p className="text-xs text-muted-foreground/60">Tap the ♡ on any spot to save it</p>
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                {Array.from(favorites).slice(0, 8).map((id: number) => (
                  <FavoriteSpotCard key={id} spotId={id} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loyalty progress */}
      {nextTier && (
        <Card className="border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">{tier.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {stats.totalTrips} of {nextTier.tier.minTrips} trips to {nextTier.tier.icon} {nextTier.tier.label}
                </p>
                <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (stats.totalTrips / nextTier.tier.minTrips) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {nextTier.needed} more trip{nextTier.needed !== 1 ? "s" : ""} to unlock {nextTier.tier.label}
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/map">Find Parking <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <MapPin className="h-4 w-4" />, label: "Find Parking", href: "/map", color: "text-primary" },
          { icon: <Car className="h-4 w-4" />, label: "My Bookings", href: "/bookings", color: "text-blue-600" },
          { icon: <Heart className="h-4 w-4" />, label: "Saved Spots", href: "/map", color: "text-red-500" },
          { icon: <Shield className="h-4 w-4" />, label: "My Profile", href: "/profile", color: "text-violet-600" },
        ].map((a) => (
          <Link key={a.label} href={a.href}>
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
              <span className={cn("transition-transform group-hover:scale-110", a.color)}>{a.icon}</span>
              <span className="text-xs font-medium">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
