import { useState, useMemo } from "react";
import { useListSpots, useUpdateSpot, useDeleteSpot, useListBookings, getListSpotsQueryKey, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { MapPin, Star, Car, Plus, Pencil, Trash2, Shield, Search, Eye, TrendingUp, Activity, Zap, BarChart2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortKey = "bookings" | "rating" | "price" | "none";
type FilterKey = "all" | "active" | "inactive";

function SpotStatsPanel({ spotId }: { spotId: number }) {
  const { data, isLoading } = useListBookings(
    { spotId, limit: 200 } as any,
    { query: { queryKey: getListBookingsQueryKey({ spotId, limit: 200 } as any) } }
  );

  const bk = data?.bookings ?? [];

  const { totalEarnings, avgDuration, monthlyData } = useMemo(() => {
    const totalEarnings = bk.reduce((s, b) => s + b.ownerEarning, 0);
    const completed = bk.filter((b) => b.status === "completed");
    const avgDuration = completed.length
      ? Math.round((completed.reduce((s, b) => s + b.totalHours, 0) / completed.length) * 10) / 10
      : null;

    const now = new Date();
    const map: Record<string, { month: string; bookings: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().substring(0, 7);
      map[key] = { month: d.toLocaleString("en", { month: "short" }), bookings: 0 };
    }
    for (const b of bk) {
      const m = b.date?.substring(0, 7);
      if (m && map[m]) map[m].bookings++;
    }
    return { totalEarnings, avgDuration, monthlyData: Object.values(map) };
  }, [bk]);

  if (isLoading)
    return (
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-sm font-bold">{bk.length}</p>
          <p className="text-[10px] text-muted-foreground">All bookings</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-sm font-bold text-primary">KES {totalEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Net earned</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-sm font-bold">{avgDuration !== null ? `${avgDuration}h` : "—"}</p>
          <p className="text-[10px] text-muted-foreground">Avg stay</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bookings — last 6 months</p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                formatter={(v) => [v, "Bookings"]}
              />
              <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function OwnerSpots() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("bookings");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [surgePendingId, setSurgePendingId] = useState<number | null>(null);
  const [openStatsId, setOpenStatsId] = useState<number | null>(null);

  const SURGE_STEPS = [1.0, 1.5, 2.0, 2.5] as const;
  type SurgeStep = typeof SURGE_STEPS[number];

  const handleSurge = (id: number, multiplier: SurgeStep) => {
    setSurgePendingId(id);
    updateSpot.mutate(
      { id, data: { surgeMultiplier: multiplier } as any },
      {
        onSuccess: () => {
          setSurgePendingId(null);
          queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) });
          toast({
            title: multiplier > 1
              ? `⚡ Surge ×${multiplier} enabled`
              : "Surge pricing disabled",
            description: multiplier > 1
              ? `Commuters will see KES pricing at ×${multiplier} rate`
              : "Standard pricing restored",
          });
        },
        onError: () => { setSurgePendingId(null); toast({ title: "Failed to update surge", variant: "destructive" }); },
      }
    );
  };

  const { data, isLoading } = useListSpots(
    { ownerId: userId ?? undefined },
    { query: { enabled: !!userId, queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) } }
  );

  const updateSpot = useUpdateSpot({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) });
        toast({ title: (vars.data as any).isActive ? "Spot activated" : "Spot deactivated" });
      },
    },
  });

  const deleteSpot = useDeleteSpot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) });
        toast({ title: "Spot removed", description: `"${deleteTarget?.title}" has been deleted.` });
        setDeleteTarget(null);
      },
      onError: () => {
        toast({ title: "Failed to delete spot", variant: "destructive" });
        setDeleteTarget(null);
      },
    },
  });

  const handleToggle = (id: number, isActive: boolean) => {
    updateSpot.mutate({ id, data: { isActive: !isActive } });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSpot.mutate({ id: deleteTarget.id });
  };

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  const allSpots = data?.spots ?? [];
  const activeCount = allSpots.filter((s) => s.isActive).length;
  const totalBookings = allSpots.reduce((s, sp) => s + sp.totalBookings, 0);
  const ratedSpots = allSpots.filter((s) => s.rating);
  const avgRating = ratedSpots.length
    ? ratedSpots.reduce((s, sp) => s + (sp.rating ?? 0), 0) / ratedSpots.length
    : null;

  let spots = [...allSpots];
  if (search) spots = spots.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.zone.toLowerCase().includes(search.toLowerCase()));
  if (filter === "active") spots = spots.filter((s) => s.isActive);
  if (filter === "inactive") spots = spots.filter((s) => !s.isActive);
  if (sortBy === "bookings") spots.sort((a, b) => b.totalBookings - a.totalBookings);
  else if (sortBy === "rating") spots.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  else if (sortBy === "price") spots.sort((a, b) => b.pricePerHour - a.pricePerHour);

  const SPOT_TYPE_ICONS: Record<string, string> = {
    driveway: "🏠", compound: "🏚️", basement: "🅿️",
    open_plot: "🌿", church: "⛪", office: "🏢",
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6 py-8">
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove this spot?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You're about to permanently remove{" "}
                <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span> from ParkEase.
              </span>
              <span className="block text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-sm">
                ⚠️ Existing confirmed bookings will not be automatically cancelled. Notify affected commuters manually.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Spot</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
              disabled={deleteSpot.isPending}
            >
              Yes, Remove It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Spots</h1>
          <p className="text-muted-foreground mt-1">Manage your listed parking spaces</p>
        </div>
        <Link href="/owner/spots/new">
          <Button data-testid="button-add-spot" className="gap-2">
            <Plus className="h-4 w-4" /> List a Spot
          </Button>
        </Link>
      </div>

      {/* Summary stats */}
      {allSpots.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{activeCount}/{allSpots.length}</p>
                <p className="text-xs text-muted-foreground">Active spots</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Car className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xl font-bold">{totalBookings}</p>
                <p className="text-xs text-muted-foreground">Total bookings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xl font-bold">{avgRating ? avgRating.toFixed(1) : "—"}</p>
                <p className="text-xs text-muted-foreground">Avg rating</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + filters */}
      {allSpots.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["all", "active", "inactive"] as FilterKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn("px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    filter === f ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"
                  )}
                >{f}</button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card"
            >
              <option value="bookings">Sort: Most Booked</option>
              <option value="rating">Sort: Highest Rated</option>
              <option value="price">Sort: Highest Price</option>
              <option value="none">Sort: Default</option>
            </select>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-52 bg-muted animate-pulse rounded-xl" />)}
        </div>
      )}

      {!isLoading && allSpots.length === 0 && (
        <div className="text-center py-24 text-muted-foreground space-y-4">
          <div className="text-6xl">🅿️</div>
          <div>
            <p className="text-lg font-semibold">No spots listed yet</p>
            <p className="text-sm mt-1">Add your first parking space and start earning today</p>
          </div>
          <Link href="/owner/spots/new">
            <Button className="gap-2 mt-2"><Plus className="h-4 w-4" />List Your First Spot</Button>
          </Link>
        </div>
      )}

      {!isLoading && allSpots.length > 0 && spots.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No spots match "{search}"</p>
          <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline mt-1">Clear search</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {spots.map((spot) => (
          <Card
            key={spot.id}
            data-testid={`card-spot-${spot.id}`}
            className={cn("overflow-hidden transition-all hover:shadow-md", !spot.isActive && "opacity-70")}
          >
            <CardContent className="p-5 space-y-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{SPOT_TYPE_ICONS[spot.spotType] ?? "🅿️"}</span>
                    <h3 className="font-bold text-base leading-tight line-clamp-1">{spot.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{spot.address}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-xs font-medium", spot.isActive ? "text-emerald-600" : "text-muted-foreground/60")}>
                    {spot.isActive ? "Live" : "Off"}
                  </span>
                  <Switch
                    data-testid={`switch-spot-active-${spot.id}`}
                    checked={spot.isActive}
                    onCheckedChange={() => handleToggle(spot.id, spot.isActive)}
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">{spot.zone}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{spot.spotType.replace("_", " ")}</Badge>
                {spot.hasCctv && <Badge className="text-xs gap-1 bg-emerald-600 text-white"><Shield className="h-2.5 w-2.5" />CCTV</Badge>}
                {spot.hasRoofing && <Badge className="text-xs bg-blue-600 text-white">Roofed</Badge>}
                {spot.hasGate && <Badge className="text-xs bg-gray-700 text-white">Gated</Badge>}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 rounded-lg p-3">
                <div className="text-center">
                  {(spot as any).surgeMultiplier > 1 ? (
                    <>
                      <p className="text-base font-bold text-red-600 flex items-center justify-center gap-0.5">
                        <Zap className="h-3.5 w-3.5" />
                        KES {Math.round(spot.pricePerHour * (spot as any).surgeMultiplier)}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-through">KES {spot.pricePerHour}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold text-primary">KES {spot.pricePerHour}</p>
                      <p className="text-[10px] text-muted-foreground">per hour</p>
                    </>
                  )}
                </div>
                <div className="text-center border-x border-border/50">
                  <p className="text-base font-bold flex items-center justify-center gap-0.5">
                    <Car className="h-3.5 w-3.5 text-blue-500" />{spot.totalBookings}
                  </p>
                  <p className="text-[10px] text-muted-foreground">bookings</p>
                </div>
                <div className="text-center">
                  {spot.rating ? (
                    <>
                      <p className="text-base font-bold flex items-center justify-center gap-0.5">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{spot.rating.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">rating</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold text-muted-foreground/40">—</p>
                      <p className="text-[10px] text-muted-foreground">no reviews</p>
                    </>
                  )}
                </div>
              </div>

              {/* Surge pricing control */}
              <div className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Zap className="h-3.5 w-3.5" />
                    Surge Pricing
                  </div>
                  {(spot as any).surgeMultiplier > 1 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <Zap className="h-3 w-3" />Active ×{(spot as any).surgeMultiplier}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 font-medium">Off</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {SURGE_STEPS.map((step) => {
                    const isActive = Math.abs(((spot as any).surgeMultiplier ?? 1) - step) < 0.01;
                    const isPending = surgePendingId === spot.id;
                    return (
                      <button
                        key={step}
                        disabled={isPending || isActive}
                        onClick={() => handleSurge(spot.id, step)}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                          isActive
                            ? step === 1
                              ? "bg-muted border-border text-muted-foreground cursor-default"
                              : "bg-red-600 border-red-600 text-white cursor-default shadow-sm"
                            : "bg-card border-border text-muted-foreground hover:border-primary hover:text-primary",
                          isPending && "opacity-50 cursor-wait"
                        )}
                      >
                        {step === 1 ? "Off" : `×${step}`}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  {(spot as any).surgeMultiplier > 1
                    ? `Commuters see KES ${Math.round(spot.pricePerHour * (spot as any).surgeMultiplier)}/hr · ${Math.round(((spot as any).surgeMultiplier - 1) * 100)}% revenue boost`
                    : "Enable surge during peak hours to boost earnings"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/spots/${spot.id}`} className="flex-none">
                  <Button variant="outline" size="sm" className="gap-1" title="View listing">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("gap-1.5 flex-none", openStatsId === spot.id && "bg-primary/5 border-primary/40 text-primary")}
                  onClick={() => setOpenStatsId(openStatsId === spot.id ? null : spot.id)}
                  title="View spot analytics"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  {openStatsId === spot.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
                <Link href={`/owner/spots/${spot.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5" data-testid={`button-edit-spot-${spot.id}`}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 flex-none gap-1"
                  data-testid={`button-delete-spot-${spot.id}`}
                  onClick={() => setDeleteTarget({ id: spot.id, title: spot.title })}
                  disabled={deleteSpot.isPending && deleteTarget?.id === spot.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Per-spot analytics panel */}
              {openStatsId === spot.id && <SpotStatsPanel spotId={spot.id} />}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings CTA */}
      {allSpots.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Maximise Your Earnings</p>
                <p className="text-xs text-muted-foreground">Check your payout history and request transfers to Mpesa</p>
              </div>
            </div>
            <Link href="/owner/payouts">
              <Button size="sm" variant="outline" className="flex-shrink-0">View Payouts</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
