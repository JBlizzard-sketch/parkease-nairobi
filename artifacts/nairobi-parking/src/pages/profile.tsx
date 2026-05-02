import { useState } from "react";
import {
  useGetMe, useListBookings, useListReviews, useUpdateMe, useGetSpot,
  getGetMeQueryKey, getListBookingsQueryKey, getListReviewsQueryKey, useListSpots, getListSpotsQueryKey,
} from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFavorites } from "@/hooks/use-favorites";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Car, Calendar, Edit2, Check, X, MapPin, Heart, LogOut,
  Phone, Mail, Shield, Clock, TrendingUp, Home, ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

const fmtDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const AVATAR_COLORS = [
  "from-emerald-400 to-emerald-600",
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-amber-400 to-amber-600",
  "from-rose-400 to-rose-600",
  "from-cyan-400 to-cyan-600",
];

function FavoriteSpotCard({ spotId, onUnfavorite }: { spotId: number; onUnfavorite: (id: number) => void }) {
  const { data: spot, isLoading } = useGetSpot(spotId);

  if (isLoading) {
    return <div className="h-16 bg-muted animate-pulse rounded-xl" />;
  }
  if (!spot) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 hover:border-primary/40 transition-colors group">
      <div className="flex-1 min-w-0">
        <Link href={`/spots/${spot.id}`} className="block">
          <p className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">{spot.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />{spot.zone}
            </span>
            <span className="font-medium text-foreground">KES {spot.pricePerHour}/hr</span>
            {spot.rating && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-3 w-3 fill-current" />{spot.rating.toFixed(1)}
              </span>
            )}
          </div>
        </Link>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Link href={`/spots/${spot.id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Book <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
        <button
          onClick={() => onUnfavorite(spotId)}
          className="p-1 text-red-400 hover:text-red-600 transition-colors"
          title="Remove from saved"
        >
          <Heart className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { userId, role, logout } = useCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { favorites, toggle: toggleFavorite } = useFavorites();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const { data: user, isLoading: userLoading } = useGetMe(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) } }
  );

  const bookingsParams = { userId: userId ?? undefined, role: "commuter" as const, limit: 100 };
  const { data: bookingsData } = useListBookings(
    bookingsParams,
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey(bookingsParams) } }
  );

  const reviewsParams = { revieweeId: userId ?? undefined };
  const { data: reviewsData } = useListReviews(
    reviewsParams,
    { query: { enabled: !!userId, queryKey: getListReviewsQueryKey(reviewsParams) } }
  );

  const { data: spotsData } = useListSpots(
    { ownerId: userId ?? undefined },
    { query: { enabled: !!userId && (role === "owner" || role === "both"), queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) } }
  );

  const updateMe = useUpdateMe({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) });
        toast({ title: "Profile updated!" });
        setEditing(false);
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const startEdit = () => {
    setEditName(user?.name ?? "");
    setEditPhone(user?.phone ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (!userId) return;
    updateMe.mutate({ params: { userId }, data: { name: editName, phone: editPhone } } as any);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!userId) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <Shield className="h-14 w-14 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-bold">Sign in to view your profile</h2>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl py-8 space-y-4">
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  const avgRating = reviewsData?.reviews.length
    ? reviewsData.reviews.reduce((a, r) => a + r.rating, 0) / reviewsData.reviews.length
    : null;

  const completedBookings = bookingsData?.bookings.filter((b) => b.status === "completed") ?? [];
  const confirmedBookings = bookingsData?.bookings.filter((b) => b.status === "confirmed") ?? [];
  const totalSpend = [...completedBookings, ...confirmedBookings].reduce((s, b) => s + b.totalAmount, 0);
  const totalBookings = bookingsData?.bookings.length ?? 0;
  const hoursParked = completedBookings.reduce((s, b) => s + b.totalHours, 0);

  const avatarGradient = AVATAR_COLORS[(userId - 1) % AVATAR_COLORS.length];
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    commuter: { label: "Commuter", icon: <Car className="h-3.5 w-3.5" />, color: "bg-primary/10 text-primary border-primary/20" },
    owner: { label: "Space Owner", icon: <Home className="h-3.5 w-3.5" />, color: "bg-secondary/20 text-secondary-foreground border-secondary/30" },
    both: { label: "Owner & Commuter", icon: <TrendingUp className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-800 border-blue-200" },
    admin: { label: "Admin", icon: <Shield className="h-3.5 w-3.5" />, color: "bg-purple-100 text-purple-800 border-purple-200" },
  };
  const roleMeta = ROLE_META[user.role] ?? ROLE_META.commuter;

  return (
    <div className="container mx-auto p-4 max-w-3xl py-8 space-y-6">
      {/* Hero Card */}
      <Card className="overflow-hidden">
        <div className={`h-24 bg-gradient-to-r ${avatarGradient} opacity-20`} />
        <CardContent className="p-6 -mt-12">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-card`}>
              {initials}
            </div>
            <div className="flex gap-2 pb-1">
              {!editing && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={startEdit}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" /> Log Out
              </Button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-9" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit} disabled={updateMe.isPending} className="gap-1">
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <Badge className={`text-xs border flex items-center gap-1 ${roleMeta.color}`}>
                  {roleMeta.icon} {roleMeta.label}
                </Badge>
                {avgRating !== null && avgRating >= 4.5 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                    ⭐ Top Rated
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {user.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{user.phone}</span>
                )}
                {user.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bookings", value: totalBookings, icon: <Car className="h-4 w-4 text-primary" />, sub: `${completedBookings.length} completed` },
          { label: "Hours Parked", value: `${hoursParked}h`, icon: <Clock className="h-4 w-4 text-blue-500" />, sub: "lifetime" },
          { label: "Total Spent", value: totalSpend >= 1000 ? `KES ${(totalSpend / 1000).toFixed(1)}k` : `KES ${totalSpend}`, icon: <TrendingUp className="h-4 w-4 text-secondary" />, sub: "on parking" },
          { label: "Avg Rating", value: avgRating ? `${avgRating.toFixed(1)} ★` : "—", icon: <Star className="h-4 w-4 text-amber-500" />, sub: `${reviewsData?.reviews.length ?? 0} reviews` },
        ].map(({ label, value, icon, sub }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                {icon}
              </div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Owner spots quick view */}
      {(role === "owner" || role === "both") && spotsData?.spots && spotsData.spots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                My Listed Spots
              </CardTitle>
              <Link href="/owner/spots" className="text-xs text-primary hover:underline">Manage all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {spotsData.spots.slice(0, 3).map((spot) => (
              <div key={spot.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{spot.title}</p>
                  <p className="text-xs text-muted-foreground">{spot.zone} · KES {spot.pricePerHour}/hr · {spot.totalBookings} bookings</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {spot.rating && (
                    <span className="text-xs flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3 w-3 fill-current" />{spot.rating.toFixed(1)}
                    </span>
                  )}
                  <div className={cn("w-2 h-2 rounded-full", spot.isActive ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Saved Spots */}
      {favorites.size > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                Saved Spots
              </CardTitle>
              <Link href="/saved" className="text-xs text-primary hover:underline font-medium">
                {favorites.size} saved · See all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from(favorites).slice(0, 6).map((spotId) => (
              <FavoriteSpotCard
                key={spotId}
                spotId={spotId}
                onUnfavorite={toggleFavorite}
              />
            ))}
            {favorites.size > 6 && (
              <Link href="/saved" className="block text-xs text-center text-primary hover:underline font-medium pt-1">
                +{favorites.size - 6} more saved spots →
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="bookings">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="bookings">
            Booking History
            {totalBookings > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">{totalBookings}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews About Me
            {(reviewsData?.reviews.length ?? 0) > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs rounded-full px-1.5 py-0.5 leading-none">{reviewsData!.reviews.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 space-y-3">
          {!bookingsData?.bookings.length ? (
            <div className="text-center py-14 text-muted-foreground space-y-3">
              <Car className="h-10 w-10 mx-auto opacity-20" />
              <p className="font-medium">No bookings yet</p>
              <Link href="/map"><Button size="sm">Browse Parking Spots</Button></Link>
            </div>
          ) : (
            bookingsData.bookings.map((booking) => (
              <Card key={booking.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3 className="font-semibold text-sm leading-snug truncate">{booking.spotTitle}</h3>
                      {booking.spotAddress && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />{booking.spotAddress}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(booking.date)}</span>
                        <span>{fmtHour(booking.startHour)} – {fmtHour(booking.endHour)}</span>
                        <span className="font-semibold text-foreground">KES {booking.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={`text-xs border ${STATUS_COLORS[booking.status] ?? "bg-muted"}`}>
                        {booking.status}
                      </Badge>
                      <Link href={`/book/${booking.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2">View →</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {avgRating !== null && (
            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-700">{avgRating.toFixed(1)}</p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({length: 5}).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Your average rating</p>
                <p className="text-amber-700 text-xs">{reviewsData!.reviews.length} reviews from spot owners and commuters</p>
              </div>
            </div>
          )}
          {!reviewsData?.reviews.length ? (
            <div className="text-center py-14 text-muted-foreground">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm mt-1">Complete a booking to receive your first review</p>
            </div>
          ) : (
            reviewsData.reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {review.reviewerName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{review.reviewerName}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(review.createdAt ?? "")}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground italic">"{review.comment}"</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
