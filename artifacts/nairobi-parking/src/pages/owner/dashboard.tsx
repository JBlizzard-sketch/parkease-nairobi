import { useGetOwnerDashboard, useListBookings, getGetOwnerDashboardQueryKey, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Wallet, Car, Activity, Star, Plus, Settings, Bell, TrendingUp, ChevronRight, AlertCircle, MapPin, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function OwnerDashboard() {
  const { userId } = useCurrentUser();

  const { data: dashboard, isLoading } = useGetOwnerDashboard(
    { ownerId: userId || 0 },
    { query: { enabled: !!userId, queryKey: getGetOwnerDashboardQueryKey({ ownerId: userId || 0 }) } }
  );

  const { data: pendingBookings } = useListBookings(
    { userId: userId ?? undefined, role: "owner", status: "pending", limit: 10 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "owner", status: "pending", limit: 10 }) } }
  );

  const { data: recentActivity } = useListBookings(
    { userId: userId ?? undefined, role: "owner", limit: 8 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "owner", limit: 8 }) } }
  );

  const pendingCount = pendingBookings?.total ?? 0;

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please login as owner.</div>;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl py-8 space-y-6">
        <div className="h-10 w-56 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!dashboard) return null;

  const thisMonth = dashboard.earningsByMonth[dashboard.earningsByMonth.length - 1];
  const lastMonth = dashboard.earningsByMonth[dashboard.earningsByMonth.length - 2];
  const growth = lastMonth && lastMonth.earnings > 0
    ? Math.round(((thisMonth?.earnings ?? 0) - lastMonth.earnings) / lastMonth.earnings * 100)
    : null;

  const KPIS = [
    {
      label: "Total Earnings",
      value: `KES ${dashboard.totalEarnings.toLocaleString()}`,
      sub: `KES ${dashboard.pendingPayouts.toLocaleString()} pending payout`,
      icon: <Wallet className="h-4 w-4" />,
      iconBg: "bg-primary",
      href: "/owner/payouts",
    },
    {
      label: "Total Bookings",
      value: String(dashboard.totalBookings),
      sub: `${dashboard.completedBookings} completed · ${dashboard.cancelledBookings} cancelled`,
      icon: <Car className="h-4 w-4" />,
      iconBg: "bg-blue-500",
      href: "/owner/bookings",
    },
    {
      label: "Occupancy Rate",
      value: `${dashboard.occupancyRate.toFixed(0)}%`,
      sub: `${dashboard.activeSpots} active spots`,
      icon: <Activity className="h-4 w-4" />,
      iconBg: "bg-secondary",
      href: "/owner/spots",
    },
    {
      label: "Avg Rating",
      value: dashboard.averageSpotRating ? `${dashboard.averageSpotRating.toFixed(1)} ★` : "N/A",
      sub: "Across all reviewed spots",
      icon: <Star className="h-4 w-4" />,
      iconBg: "bg-amber-500",
      href: "/owner/spots",
    },
  ];

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight">Owner Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your parking portfolio overview
            {growth !== null && (
              <span className={`ml-2 font-medium ${growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% vs last month
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/owner/spots"><Settings className="h-4 w-4" />My Spots</Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/owner/spots/new"><Plus className="h-4 w-4" />Add Spot</Link>
          </Button>
        </div>
      </div>

      {/* Pending action banner */}
      {pendingCount > 0 && (
        <Link href="/owner/bookings">
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-300 hover:border-amber-400 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-full">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  {pendingCount} booking request{pendingCount > 1 ? "s" : ""} need{pendingCount === 1 ? "s" : ""} your response
                </p>
                <p className="text-sm text-amber-700">Commuters are waiting — confirm or decline quickly</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-600 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map(({ label, value, sub, icon, iconBg, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <div className={`p-1.5 rounded-lg text-white ${iconBg}`}>{icon}</div>
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Earnings by Month
              </CardTitle>
              {thisMonth && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{thisMonth.month}</p>
                  <p className="font-bold text-primary">KES {thisMonth.earnings.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {dashboard.earningsByMonth.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                No earnings data yet
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.earningsByMonth} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v.split("-")[1] ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(v.split("-")[1]) - 1] : v}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: number) => [`KES ${val.toLocaleString()}`, "Earnings"]}
                    />
                    <Bar dataKey="earnings" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {dashboard.earningsByMonth.map((_, i) => (
                        <Cell key={i} fill={i === dashboard.earningsByMonth.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.4)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Spots */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-secondary" />
                Top Spots
              </CardTitle>
              <Link href="/owner/spots" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard.topSpots.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No spot data yet</p>
                <Button asChild size="sm" className="gap-1.5">
                  <Link href="/owner/spots/new"><Plus className="h-3.5 w-3.5" />Add a Spot</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.topSpots.map((spot, i) => (
                  <div key={spot.id}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-primary text-white" : i === 1 ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/spots/${spot.id}`} className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">{spot.title}</Link>
                        <p className="text-xs text-muted-foreground">{spot.zone} · {spot.bookings} bookings</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold">KES {(spot.earnings / 1000).toFixed(0)}k</p>
                        {spot.rating && (
                          <p className="text-xs text-amber-500 flex items-center justify-end gap-0.5">
                            <Star className="h-3 w-3 fill-current" />{spot.rating.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                    {i < dashboard.topSpots.length - 1 && <div className="border-b border-border/50 mt-3" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {(recentActivity?.bookings ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Recent Activity
              </CardTitle>
              <Link href="/owner/bookings" className="text-xs text-primary hover:underline">See all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-4 pt-0">
            {(recentActivity?.bookings ?? []).slice(0, 6).map((b, i) => {
              const STATUS_DOT: Record<string, string> = {
                pending:   "bg-amber-500",
                confirmed: "bg-emerald-500",
                completed: "bg-blue-500",
                cancelled: "bg-red-400",
                no_show:   "bg-gray-400",
              };
              const STATUS_TEXT: Record<string, string> = {
                pending:   "text-amber-700",
                confirmed: "text-emerald-700",
                completed: "text-blue-700",
                cancelled: "text-red-600",
                no_show:   "text-gray-600",
              };
              const dot = STATUS_DOT[b.status] ?? "bg-muted-foreground";
              const txt = STATUS_TEXT[b.status] ?? "text-muted-foreground";
              const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
              return (
                <Link key={b.id} href={`/owner/bookings`}>
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors ${i < (recentActivity?.bookings.length ?? 1) - 1 ? "" : ""}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{b.spotTitle}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {b.commuterName ?? "Commuter"} · {b.date} · {fmtHour(b.startHour)}–{fmtHour(b.endHour)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <p className="text-xs font-bold">KES {b.totalAmount.toLocaleString()}</p>
                      <p className={`text-[10px] font-medium capitalize ${txt}`}>{b.status.replace("_", " ")}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/owner/bookings", icon: <Bell className="h-5 w-5" />, label: "Requests", badge: pendingCount > 0 ? pendingCount : undefined, color: "text-amber-600" },
          { href: "/owner/payouts", icon: <Wallet className="h-5 w-5" />, label: "Payouts", color: "text-primary" },
          { href: "/owner/spots", icon: <MapPin className="h-5 w-5" />, label: "My Spots", color: "text-blue-500" },
          { href: "/owner/spots/new", icon: <Plus className="h-5 w-5" />, label: "Add Spot", color: "text-emerald-600" },
        ].map(({ href, icon, label, badge, color }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center relative">
                <div className={`${color} relative`}>
                  {icon}
                  {badge && (
                    <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
