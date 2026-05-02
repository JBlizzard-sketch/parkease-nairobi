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
  CheckCircle2, ChevronRight, Shield, Wallet, BarChart2, Calendar, History,
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

function ParkingHeatmap({ bookings }: { bookings: Array<{ date?: string | null }> }) {
  const WEEKS = 13;
  const DAYS = 7;

  const countMap: Record<string, number> = {};
  for (const b of bookings) {
    if (b.date) countMap[b.date] = (countMap[b.date] ?? 0) + 1;
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * DAYS - 1));
  const dow = startDate.getDay();
  startDate.setDate(startDate.getDate() - dow);

  const allCells: Array<{ date: string; count: number; inRange: boolean }> = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < WEEKS * DAYS; i++) {
    const dateStr = cursor.toISOString().split("T")[0];
    allCells.push({ date: dateStr, count: countMap[dateStr] ?? 0, inRange: cursor <= today });
    cursor.setDate(cursor.getDate() + 1);
  }

  const months: Array<{ label: string; weekIdx: number }> = [];
  for (let w = 0; w < WEEKS; w++) {
    const ws = new Date(startDate);
    ws.setDate(ws.getDate() + w * 7);
    if (w === 0 || ws.getDate() <= 7) {
      months.push({ label: ws.toLocaleDateString("en-KE", { month: "short" }), weekIdx: w });
    }
  }

  const weeks = Array.from({ length: WEEKS }, (_, w) => allCells.slice(w * DAYS, (w + 1) * DAYS));
  const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

  const cellColor = (count: number, inRange: boolean) => {
    if (!inRange) return "bg-transparent";
    if (count === 0) return "bg-muted/70";
    if (count === 1) return "bg-primary/30";
    if (count === 2) return "bg-primary/55";
    return "bg-primary";
  };

  const totalDays = Object.keys(countMap).length;
  const streak = (() => {
    let s = 0;
    const d = new Date(today);
    while (true) {
      const k = d.toISOString().split("T")[0];
      if (!countMap[k]) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  })();

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />Parking Activity
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Your parking days over the last 3 months</p>
          </div>
          <div className="flex gap-3 text-right flex-shrink-0">
            <div>
              <p className="text-lg font-bold text-primary leading-none">{totalDays}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">active days</p>
            </div>
            {streak > 1 && (
              <div>
                <p className="text-lg font-bold text-amber-500 leading-none">{streak}🔥</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">day streak</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex ml-6 mb-0.5 gap-0.5">
              {Array.from({ length: WEEKS }, (_, w) => {
                const ml = months.find((m) => m.weekIdx === w);
                return (
                  <div key={w} className="w-3.5 text-[10px] text-muted-foreground/70 leading-none">
                    {ml ? ml.label : ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-0.5">
              <div className="flex flex-col gap-0.5 mr-1">
                {DAY_LABELS.map((label, i) => (
                  <div key={i} className="h-3.5 w-5 text-[9px] text-muted-foreground/60 flex items-center justify-end pr-0.5 leading-none">
                    {label}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className={`w-3.5 h-3.5 rounded-sm transition-colors ${cellColor(cell.count, cell.inRange)}`}
                      title={cell.inRange ? `${cell.date}: ${cell.count} booking${cell.count !== 1 ? "s" : ""}` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2 justify-end">
              <span className="text-[10px] text-muted-foreground/60">Less</span>
              {(["bg-muted/70", "bg-primary/30", "bg-primary/55", "bg-primary"] as const).map((cls, i) => (
                <div key={i} className={`w-3.5 h-3.5 rounded-sm ${cls}`} />
              ))}
              <span className="text-[10px] text-muted-foreground/60">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

  const frequentSpots = useMemo(() => {
    const map: Record<number, { spotId: number; spotTitle: string; spotAddress: string | null; count: number }> = {};
    for (const b of completed) {
      if (!b.spotId) continue;
      if (!map[b.spotId]) {
        map[b.spotId] = { spotId: b.spotId, spotTitle: b.spotTitle ?? "Parking Spot", spotAddress: b.spotAddress ?? null, count: 0 };
      }
      map[b.spotId].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
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

      {/* Your Regulars — Book Again */}
      {frequentSpots.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />Your Regulars
            </CardTitle>
            <span className="text-xs text-muted-foreground">Spots you visit most</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {frequentSpots.map(({ spotId, spotTitle, spotAddress, count }) => (
                <div
                  key={spotId}
                  className="flex-shrink-0 w-52 bg-muted/30 border border-border rounded-xl p-3.5 space-y-2.5 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm leading-tight line-clamp-2">{spotTitle}</p>
                    {spotAddress && (
                      <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-1 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />{spotAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                      {count}× booked
                    </span>
                    <Button size="sm" className="h-7 text-xs px-2.5 gap-1 flex-shrink-0" asChild>
                      <Link href={`/spots/${spotId}`}>
                        Book again <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <Link href="/saved">See all <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
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

      {/* Parking Activity Heatmap */}
      <ParkingHeatmap bookings={completed} />

      {/* Loyalty Tier Progression */}
      <Card className={cn("border overflow-hidden", tier.border)}>
        <div className={cn("px-5 py-3 flex items-center justify-between gap-3", tier.bg, "border-b", tier.border)}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{tier.icon}</span>
            <div>
              <p className={cn("font-bold text-sm leading-none", tier.color)}>{tier.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.totalTrips} trip{stats.totalTrips !== 1 ? "s" : ""} completed
              </p>
            </div>
          </div>
          {nextTier ? (
            <p className={cn("text-xs font-semibold", tier.color)}>
              {nextTier.needed} trip{nextTier.needed !== 1 ? "s" : ""} to {nextTier.tier.icon} {nextTier.tier.label}
            </p>
          ) : (
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", tier.bg, tier.color, tier.border)}>
              Max Tier Reached 🎉
            </span>
          )}
        </div>

        <CardContent className="p-5 space-y-5">
          {/* Tier track */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-5 right-5 h-1 bg-muted rounded-full" style={{ zIndex: 0 }} />
            <div
              className="absolute top-5 left-5 h-1 bg-primary rounded-full transition-all duration-700"
              style={{
                zIndex: 1,
                width: (() => {
                  const tierIdx = TIERS.indexOf(tier);
                  const fullPct = ((TIERS.length - 1 - tierIdx) / (TIERS.length - 1));
                  if (!nextTier) return `calc(100% - 40px)`;
                  const segW = 1 / (TIERS.length - 1);
                  const fromLeft = (TIERS.length - 1 - tierIdx - 1) * segW;
                  const withinSeg = nextTier
                    ? 1 - (nextTier.needed / nextTier.tier.minTrips)
                    : 1;
                  return `${(fromLeft + segW * withinSeg) * 100}%`;
                })(),
              }}
            />
            <div className="relative flex justify-between" style={{ zIndex: 2 }}>
              {[...TIERS].reverse().map((t, i) => {
                const tierIdx = TIERS.indexOf(tier);
                const reversedIdx = TIERS.length - 1 - TIERS.indexOf(t);
                const isActive = t.label === tier.label;
                const isUnlocked = TIERS.indexOf(t) >= TIERS.indexOf(tier);
                return (
                  <div key={t.label} className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      "w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all",
                      isActive
                        ? cn("border-primary shadow-md scale-110", tier.bg)
                        : isUnlocked
                          ? "bg-muted/60 border-muted-foreground/20"
                          : "bg-muted border-muted opacity-40"
                    )}>
                      {t.icon}
                    </div>
                    <p className={cn(
                      "text-[10px] font-semibold leading-tight text-center",
                      isActive ? tier.color : isUnlocked ? "text-foreground" : "text-muted-foreground/50"
                    )}>
                      {t.label.split(" ")[0]}
                    </p>
                    <p className={cn(
                      "text-[9px] text-center leading-none",
                      isUnlocked ? "text-muted-foreground" : "text-muted-foreground/40"
                    )}>
                      {t.minTrips === 0 ? "Start" : `${t.minTrips}+ trips`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar to next tier */}
          {nextTier && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="font-medium">{stats.totalTrips} trips</span>
                <span>{nextTier.tier.minTrips} trips needed</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (stats.totalTrips / nextTier.tier.minTrips) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {nextTier.needed} more to unlock {nextTier.tier.icon} {nextTier.tier.label}
              </p>
            </div>
          )}

          {/* Perks grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Current tier perks */}
            <div className={cn("rounded-xl border p-3.5 space-y-2", tier.bg, tier.border)}>
              <p className={cn("text-xs font-bold uppercase tracking-wide", tier.color)}>
                {tier.icon} Your perks — {tier.label}
              </p>
              <ul className="space-y-1.5">
                {(
                  tier.label === "Elite Parker"   ? ["Priority waitlist access", "0.5% cashback on every booking", "Free cancellations (24hr notice)", "Exclusive surge-free windows", "Dedicated support line"] :
                  tier.label === "Pro Parker"     ? ["Early access to new spots", "Skip-the-queue on waitlists", "10% off surge pricing", "Monthly earnings summary"] :
                  tier.label === "Regular Parker" ? ["Saved spots sync across devices", "Booking reminders via SMS", "Rate spots after each visit"] :
                                                    ["Standard booking flow", "Favourite any spot", "Join zone waitlists"]
                ).map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className={cn("h-3.5 w-3.5 flex-shrink-0 mt-px", tier.color)} />
                    <span className={tier.color}>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Next tier preview */}
            {nextTier ? (
              <div className="rounded-xl border border-dashed border-muted-foreground/25 p-3.5 space-y-2 bg-muted/20">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {nextTier.tier.icon} Unlock — {nextTier.tier.label}
                </p>
                <ul className="space-y-1.5">
                  {(
                    nextTier.tier.label === "Elite Parker"   ? ["Priority waitlist access", "0.5% cashback on all bookings", "Free cancellations (24hr notice)", "Exclusive surge-free windows", "Dedicated support line"] :
                    nextTier.tier.label === "Pro Parker"     ? ["Early access to new spots", "Skip-the-queue on waitlists", "10% off surge pricing", "Monthly earnings summary"] :
                    nextTier.tier.label === "Regular Parker" ? ["Saved spots sync across devices", "Booking reminders via SMS", "Rate spots after each visit"] :
                                                               ["Standard booking flow", "Favourite any spot", "Join zone waitlists"]
                  ).map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-muted-foreground/70">
                      <div className="h-3.5 w-3.5 flex-shrink-0 mt-px rounded-full border border-muted-foreground/30 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      </div>
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button size="sm" className="w-full h-7 text-xs mt-1 gap-1" asChild>
                  <Link href="/map">
                    Park now to progress <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 p-3.5 bg-primary/5 flex flex-col items-center justify-center gap-2 text-center">
                <span className="text-3xl">💎</span>
                <p className="text-sm font-bold text-primary">You've reached Elite!</p>
                <p className="text-xs text-muted-foreground">All perks are unlocked. Thank you for being a top ParkEase commuter.</p>
                <Button size="sm" className="mt-1 gap-1" asChild>
                  <Link href="/map">Find Parking <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <MapPin className="h-4 w-4" />, label: "Find Parking", href: "/map", color: "text-primary" },
          { icon: <Car className="h-4 w-4" />, label: "My Bookings", href: "/bookings", color: "text-blue-600" },
          { icon: <Heart className="h-4 w-4" />, label: "Saved Spots", href: "/saved", color: "text-red-500" },
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
