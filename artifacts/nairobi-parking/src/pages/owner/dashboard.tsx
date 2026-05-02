import { useGetOwnerDashboard, getGetOwnerDashboardQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Wallet, Car, Activity, Star } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function OwnerDashboard() {
  const { userId } = useCurrentUser();
  
  const { data: dashboard, isLoading } = useGetOwnerDashboard(
    { ownerId: userId || 0 },
    { query: { enabled: !!userId, queryKey: getGetOwnerDashboardQueryKey({ ownerId: userId || 0 }) } }
  );

  if (!userId) return <div className="p-8 text-center">Please login as owner.</div>;

  if (isLoading) {
    return <div className="p-8 animate-pulse text-center">Loading dashboard...</div>;
  }

  if (!dashboard) return null;

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-sans tracking-tight">Owner Dashboard</h1>
          <p className="text-muted-foreground">Overview of your parking empire.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/owner/spots">My Spots</Link></Button>
          <Button asChild><Link href="/owner/spots/new">Add New Spot</Link></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-muted-foreground">Total Earnings</div>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">KES {dashboard.totalEarnings.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">KES {dashboard.pendingPayouts.toLocaleString()} pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-muted-foreground">Bookings</div>
              <Activity className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-2xl font-bold">{dashboard.totalBookings}</div>
            <div className="text-xs text-muted-foreground mt-1">{dashboard.completedBookings} completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-muted-foreground">Occupancy Rate</div>
              <Car className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-2xl font-bold">{dashboard.occupancyRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">Across {dashboard.activeSpots} active spots</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-muted-foreground">Avg Rating</div>
              <Star className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-2xl font-bold">{dashboard.averageSpotRating?.toFixed(1) || 'N/A'}</div>
            <div className="text-xs text-muted-foreground mt-1">From all reviews</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.earningsByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `KES ${value}`} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Spots */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Spots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboard.topSpots.map((spot, i) => (
              <div key={spot.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="font-bold text-lg text-muted-foreground w-4">{i + 1}</div>
                  <div>
                    <Link href={`/spots/${spot.id}`} className="font-medium hover:text-primary transition-colors">{spot.title}</Link>
                    <div className="text-sm text-muted-foreground">{spot.zone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">KES {spot.earnings.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{spot.bookings} bookings</div>
                </div>
              </div>
            ))}
            {dashboard.topSpots.length === 0 && (
              <div className="text-center text-muted-foreground py-4">No data available yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}