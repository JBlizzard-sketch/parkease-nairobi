import { useState, useMemo } from "react";
import { useGetZoneSummary, useListBookings, useListSpots, getGetZoneSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { TrendingUp, Car, Users, Zap, MapPin, DollarSign, Activity, RefreshCw, Star, Clock, Shield, ArrowUpRight, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ZONE_COLORS = ["#00A957", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];
const PIE_COLORS = { Confirmed: "#00A957", Completed: "#3b82f6", Pending: "#f59e0b", Cancelled: "#ef4444" };

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [surgeRunning, setSurgeRunning] = useState(false);
  const [surgeResult, setSurgeResult] = useState<string | null>(null);

  const { data: zones, isLoading: zonesLoading } = useGetZoneSummary({
    query: { queryKey: getGetZoneSummaryQueryKey() }
  });
  const { data: allBookings } = useListBookings({ limit: 500 }, { query: { queryKey: ["bookings-admin"] } });
  const { data: allSpots } = useListSpots({}, { query: { queryKey: ["spots-admin"] } });

  const bookings = allBookings?.bookings ?? [];
  const spots = allSpots?.spots ?? [];

  const totalSpots = spots.length;
  const activeSpots = spots.filter((s) => s.isActive).length;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
  const totalRevenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + (b.platformFee ?? 0), 0);
  const avgRating = spots.filter((s) => s.rating).length
    ? spots.filter((s) => s.rating).reduce((s, sp) => s + (sp.rating ?? 0), 0) / spots.filter((s) => s.rating).length
    : 0;

  const conversionRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;

  // Monthly booking trend from booking dates
  const monthlyMap: Record<string, { bookings: number; revenue: number }> = {};
  for (const b of bookings) {
    const month = b.date?.substring(0, 7);
    if (!month) continue;
    if (!monthlyMap[month]) monthlyMap[month] = { bookings: 0, revenue: 0 };
    monthlyMap[month].bookings += 1;
    if (b.status === "confirmed" || b.status === "completed") {
      monthlyMap[month].revenue += b.platformFee ?? 0;
    }
  }
  const trendData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, d]) => ({
      month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(month.split("-")[1]) - 1],
      bookings: d.bookings,
      revenue: d.revenue,
    }));

  const zoneChartData = zones?.zones.map((z) => ({
    zone: z.zone.substring(0, 4),
    available: z.availableSpots,
    total: z.totalSpots,
    avgPrice: z.avgPricePerHour,
    waitlist: z.waitlistCount,
  })) ?? [];

  const bookingsByStatus = [
    { name: "Confirmed", value: bookings.filter((b) => b.status === "confirmed").length, color: "#00A957" },
    { name: "Completed", value: bookings.filter((b) => b.status === "completed").length, color: "#3b82f6" },
    { name: "Pending",   value: bookings.filter((b) => b.status === "pending").length,   color: "#f59e0b" },
    { name: "Cancelled", value: bookings.filter((b) => b.status === "cancelled").length, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const spotTypeData = spots.reduce<Record<string, number>>((acc, s) => {
    acc[s.spotType] = (acc[s.spotType] ?? 0) + 1;
    return acc;
  }, {});
  const spotTypeChartData = Object.entries(spotTypeData)
    .map(([type, count]) => ({ type: type.replace("_", " "), count }))
    .sort((a, b) => b.count - a.count);

  const topSpotsByBookings = [...spots].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);
  const surgeZones = zones?.zones.filter((z) => z.surgeMultiplier > 1) ?? [];
  const highDemandZones = zones?.zones.filter((z) => z.waitlistCount > 0) ?? [];

  const commuterRows = useMemo(() => {
    const map: Record<number, { id: number; name: string; phone: string; count: number; totalSpend: number }> = {};
    for (const b of bookings) {
      if (!b.comuterId) continue;
      if (!map[b.comuterId]) map[b.comuterId] = { id: b.comuterId, name: b.commuterName ?? "Unknown", phone: b.commuterPhone ?? "", count: 0, totalSpend: 0 };
      map[b.comuterId].count++;
      map[b.comuterId].totalSpend += b.totalAmount;
    }
    return Object.values(map)
      .map((c) => ({ ...c, avgSpend: Math.round(c.totalSpend / c.count) }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [bookings]);

  const ownerRows = useMemo(() => {
    const map: Record<number, { id: number; name: string; phone: string; spotCount: number; totalBookings: number; ratingSum: number; ratingCount: number }> = {};
    for (const s of spots) {
      if (!map[s.ownerId]) map[s.ownerId] = { id: s.ownerId, name: s.ownerName, phone: s.ownerPhone, spotCount: 0, totalBookings: 0, ratingSum: 0, ratingCount: 0 };
      map[s.ownerId].spotCount++;
      map[s.ownerId].totalBookings += s.totalBookings;
      if (s.rating) { map[s.ownerId].ratingSum += s.rating; map[s.ownerId].ratingCount++; }
    }
    return Object.values(map)
      .map((o) => ({ ...o, avgRating: o.ratingCount ? o.ratingSum / o.ratingCount : null }))
      .sort((a, b) => b.totalBookings - a.totalBookings);
  }, [spots]);

  const runSurgeEngine = async () => {
    setSurgeRunning(true);
    setSurgeResult(null);
    try {
      const res = await fetch("/api/analytics/trigger-surge", { method: "POST" });
      const data = await res.json();
      setSurgeResult(data.message);
      toast({ title: "Surge Engine Run", description: data.message });
      queryClient.invalidateQueries({ queryKey: getGetZoneSummaryQueryKey() });
    } catch {
      toast({ title: "Surge engine failed", variant: "destructive" });
    } finally {
      setSurgeRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
            <Badge variant="outline" className="ml-1 text-xs">Admin View</Badge>
          </div>
          <p className="text-muted-foreground text-sm">Live overview of ParkEase Nairobi activity</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={runSurgeEngine} disabled={surgeRunning} variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/5">
            {surgeRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {surgeRunning ? "Running..." : "Run Surge Engine"}
          </Button>
          {surgeResult && <p className="text-xs text-muted-foreground max-w-xs text-right">{surgeResult}</p>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Platform Revenue", value: `KES ${totalRevenue.toLocaleString()}`, sub: "15% commission earned", icon: <DollarSign className="h-4 w-4" />, iconBg: "bg-primary", trend: "+12%" },
          { label: "Active Spots", value: String(activeSpots), sub: `${totalSpots} total listed`, icon: <MapPin className="h-4 w-4" />, iconBg: "bg-secondary", trend: null },
          { label: "Total Bookings", value: String(totalBookings), sub: `${confirmedBookings} confirmed/completed · ${conversionRate}% rate`, icon: <Car className="h-4 w-4" />, iconBg: "bg-blue-500", trend: null },
          { label: "Avg Spot Rating", value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "—", sub: "Across all reviewed spots", icon: <Star className="h-4 w-4" />, iconBg: "bg-amber-500", trend: null },
        ].map(({ label, value, sub, icon, iconBg, trend }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className={`p-1.5 rounded-lg text-white ${iconBg}`}>{icon}</div>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold">{value}</p>
                {trend && <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5 mb-0.5"><ArrowUpRight className="h-3 w-3" />{trend}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Trend + Pie */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Booking Volume — Last 6 Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No trend data yet</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <defs>
                      <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" fill="url(#bookingGrad)" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} name="Bookings" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-500" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsByStatus.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No booking data</div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center gap-4">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={bookingsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {bookingsByStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
                  {bookingsByStatus.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name}</span>
                      <span className="text-xs font-bold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zone Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Spots by Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneChartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="zone" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="available" fill="hsl(var(--primary))" radius={[3,3,0,0]} maxBarSize={28} name="Available" />
                  <Bar dataKey="total" fill="hsl(var(--muted-foreground)/0.25)" radius={[3,3,0,0]} maxBarSize={28} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              Avg Price by Zone (KES/hr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneChartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="zone" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val) => [`KES ${val}`, "Avg Price"]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="avgPrice" radius={[4,4,0,0]} maxBarSize={32} name="Avg Price">
                    {zoneChartData.map((_, i) => <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── USER OVERVIEW ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">User Overview</h2>
          <Badge variant="outline" className="text-xs ml-1">{commuterRows.length + ownerRows.length} accounts</Badge>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Commuters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-500" />
                Top Commuters
                <Badge variant="outline" className="ml-auto text-xs">{commuterRows.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {commuterRows.length === 0 ? (
                <div className="px-6 pb-6 text-center text-sm text-muted-foreground">No commuter data yet</div>
              ) : (
                <div>
                  {commuterRows.slice(0, 8).map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 px-6 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        i === 0 ? "bg-primary text-white" : i === 1 ? "bg-secondary text-white" : i === 2 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />{c.phone} · {c.count} booking{c.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">KES {c.totalSpend.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">avg KES {c.avgSpend.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owners */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Space Owners
                <Badge variant="outline" className="ml-auto text-xs">{ownerRows.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ownerRows.length === 0 ? (
                <div className="px-6 pb-6 text-center text-sm text-muted-foreground">No owner data yet</div>
              ) : (
                <div>
                  {ownerRows.slice(0, 8).map((o, i) => (
                    <div key={o.id} className="flex items-center gap-3 px-6 py-2.5 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        i === 0 ? "bg-primary text-white" : i === 1 ? "bg-secondary text-white" : i === 2 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{o.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />{o.phone} · {o.spotCount} spot{o.spotCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">{o.totalBookings} <span className="font-normal text-muted-foreground text-xs">bookings</span></p>
                        {o.avgRating ? (
                          <p className="text-[10px] text-amber-500 flex items-center gap-0.5 justify-end">
                            <Star className="h-2.5 w-2.5 fill-current" />{o.avgRating.toFixed(1)} avg
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">no reviews</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom row: Top spots + Spot types + Surge */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Spots */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Top Spots by Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topSpotsByBookings.map((spot, i) => (
              <div key={spot.id} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-primary text-white" : i === 1 ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{spot.title}</p>
                  <p className="text-xs text-muted-foreground">{spot.zone}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold">{spot.totalBookings}</p>
                  {spot.rating && <p className="text-[10px] text-amber-500">★{spot.rating.toFixed(1)}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Spot Types */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Spot Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spotTypeChartData.map((item, i) => (
              <div key={item.type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{item.type}</span>
                  <span className="font-bold text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(item.count / (spotTypeChartData[0]?.count || 1)) * 100}%`, background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Surge + Demand */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              Surge &amp; High-Demand
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {surgeZones.length === 0 && highDemandZones.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">No surge zones active</p>
                <p className="text-xs text-muted-foreground">Run the Surge Engine to auto-activate based on waitlists.</p>
                <Button size="sm" variant="outline" onClick={runSurgeEngine} className="gap-1.5 mt-1 text-destructive border-destructive/30">
                  <Zap className="h-3.5 w-3.5" /> Run Now
                </Button>
              </div>
            ) : (
              <>
                {surgeZones.map((z) => (
                  <div key={z.zone} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-destructive" />
                      <span className="font-semibold text-sm">{z.zone}</span>
                    </div>
                    <Badge className="bg-destructive text-white text-xs">×{z.surgeMultiplier} surge</Badge>
                  </div>
                ))}
                {highDemandZones.filter((z) => z.surgeMultiplier <= 1).map((z) => (
                  <div key={z.zone} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-amber-600" />
                      <span className="font-semibold text-sm">{z.zone}</span>
                    </div>
                    <Badge className="bg-amber-500 text-white text-xs">{z.waitlistCount} waiting</Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
