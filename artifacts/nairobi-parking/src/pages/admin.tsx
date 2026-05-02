import { useGetZoneSummary, useListBookings, useListSpots, getGetZoneSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Car, Users, Zap, MapPin, DollarSign, Activity } from "lucide-react";

const ZONE_COLORS = ["#00A957", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

export default function AdminAnalytics() {
  const { data: zones, isLoading: zonesLoading } = useGetZoneSummary({
    query: { queryKey: getGetZoneSummaryQueryKey() }
  });

  const { data: allBookings } = useListBookings(
    { limit: 200 },
    { query: { queryKey: ["bookings-admin"] } }
  );

  const { data: allSpots } = useListSpots(
    {},
    { query: { queryKey: ["spots-admin"] } }
  );

  const totalSpots = allSpots?.spots.length ?? 0;
  const activeSpots = allSpots?.spots.filter((s) => s.isActive).length ?? 0;
  const totalBookings = allBookings?.bookings.length ?? 0;
  const confirmedBookings = allBookings?.bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length ?? 0;
  const totalRevenue = allBookings?.bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + (b.platformFee ?? 0), 0) ?? 0;
  const avgRating = allSpots?.spots.filter((s) => s.rating).length
    ? (allSpots!.spots.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating ?? 0), 0) / allSpots!.spots.filter((s) => s.rating).length)
    : 0;

  const zoneChartData = zones?.zones.map((z) => ({
    zone: z.zone,
    available: z.availableSpots,
    total: z.totalSpots,
    avgPrice: z.avgPricePerHour,
    waitlist: z.waitlistCount,
    surge: z.surgeMultiplier,
  })) ?? [];

  const bookingsByStatus = [
    { name: "Confirmed", value: allBookings?.bookings.filter((b) => b.status === "confirmed").length ?? 0, color: "#00A957" },
    { name: "Completed", value: allBookings?.bookings.filter((b) => b.status === "completed").length ?? 0, color: "#3b82f6" },
    { name: "Pending", value: allBookings?.bookings.filter((b) => b.status === "pending").length ?? 0, color: "#f59e0b" },
    { name: "Cancelled", value: allBookings?.bookings.filter((b) => b.status === "cancelled").length ?? 0, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const spotTypeData = allSpots?.spots.reduce<Record<string, number>>((acc, s) => {
    acc[s.spotType] = (acc[s.spotType] ?? 0) + 1;
    return acc;
  }, {}) ?? {};
  const spotTypeChartData = Object.entries(spotTypeData).map(([type, count]) => ({
    type: type.replace("_", " "),
    count,
  })).sort((a, b) => b.count - a.count);

  const surgeZones = zones?.zones.filter((z) => z.surgeMultiplier > 1) ?? [];
  const highDemandZones = zones?.zones.filter((z) => z.waitlistCount > 0) ?? [];

  return (
    <div className="container mx-auto p-4 max-w-7xl py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
          <Badge variant="outline" className="ml-2 text-xs">Admin View</Badge>
        </div>
        <p className="text-muted-foreground">Live overview of ParkEase Nairobi activity</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Platform Revenue</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">15% commission earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Active Spots</span>
              <MapPin className="h-4 w-4 text-secondary" />
            </div>
            <p className="text-2xl font-bold">{activeSpots}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalSpots} total listed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Bookings</span>
              <Car className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{totalBookings}</p>
            <p className="text-xs text-muted-foreground mt-1">{confirmedBookings} confirmed/completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Avg Spot Rating</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all reviewed spots</p>
          </CardContent>
        </Card>
      </div>

      {/* Zone Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Zone Availability Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Spots by Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zonesLoading ? (
              <div className="h-56 bg-muted animate-pulse rounded" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="zone" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="available" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={32} name="Available" />
                    <Bar dataKey="total" fill="hsl(var(--muted-foreground)/0.3)" radius={[3, 3, 0, 0]} maxBarSize={32} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-500" />
              Booking Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsByStatus.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No booking data</div>
            ) : (
              <div className="h-56 flex items-center gap-4">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={bookingsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {bookingsByStatus.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-sm">
                  {bookingsByStatus.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-semibold ml-auto pl-3">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Zone Average Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-secondary" />
            Average Price per Zone (KES/hr)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneChartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="zone" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  formatter={(val) => [`KES ${val}`, "Avg Price"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="avgPrice" radius={[4, 4, 0, 0]} maxBarSize={40} name="Avg Price">
                  {zoneChartData.map((_, i) => (
                    <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Spot Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spot Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spotTypeChartData.map((item, i) => (
                <div key={item.type} className="flex items-center gap-3">
                  <div className="text-sm capitalize font-medium w-28 flex-shrink-0">{item.type}</div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.count / (spotTypeChartData[0]?.count || 1)) * 100}%`,
                        background: ZONE_COLORS[i % ZONE_COLORS.length],
                      }}
                    />
                  </div>
                  <div className="text-sm font-bold w-6 text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Surge + Demand Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              Surge &amp; High-Demand Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {surgeZones.length === 0 && highDemandZones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No surge or high-demand zones right now.</p>
            ) : (
              <>
                {surgeZones.map((z) => (
                  <div key={z.zone} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-destructive" />
                      <span className="font-semibold text-sm">{z.zone}</span>
                    </div>
                    <Badge className="bg-destructive text-white">×{z.surgeMultiplier} surge</Badge>
                  </div>
                ))}
                {highDemandZones.filter((z) => z.surgeMultiplier <= 1).map((z) => (
                  <div key={z.zone} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-600" />
                      <span className="font-semibold text-sm">{z.zone}</span>
                    </div>
                    <Badge className="bg-amber-500 text-white">{z.waitlistCount} waiting</Badge>
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
