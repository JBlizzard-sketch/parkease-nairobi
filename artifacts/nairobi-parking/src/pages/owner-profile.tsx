import { useParams, Link } from "wouter";
import { useListSpots, useListReviews, getListSpotsQueryKey, getListReviewsQueryKey } from "@workspace/api-client-react";
import type { Review } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Car, ShieldCheck, ArrowLeft, Users, TrendingUp, MessageSquare, Quote } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { Heart } from "lucide-react";

const REVIEWER_GRADS = [
  "from-sky-400 to-sky-600", "from-rose-400 to-rose-600",
  "from-violet-400 to-violet-600", "from-amber-400 to-amber-600",
  "from-teal-400 to-teal-600", "from-fuchsia-400 to-fuchsia-600",
];

function ReviewCard({ review, spotTitle }: { review: Review; spotTitle: string }) {
  const grad = REVIEWER_GRADS[review.reviewerId % REVIEWER_GRADS.length];
  const initial = review.reviewerName?.[0]?.toUpperCase() ?? "?";
  const dateStr = review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{review.reviewerName}</p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{spotTitle} · {dateStr}</p>
        {review.comment && (
          <p className="text-sm text-foreground/80 leading-relaxed mt-1 italic">
            <Quote className="h-3 w-3 inline-block mr-0.5 text-muted-foreground/50 -mt-0.5" />
            {review.comment}
          </p>
        )}
      </div>
    </div>
  );
}

function SpotReviews({ spotId, spotTitle }: { spotId: number; spotTitle: string }) {
  const { data } = useListReviews(
    { spotId },
    { query: { queryKey: getListReviewsQueryKey({ spotId }) } }
  );
  const reviews = data?.reviews ?? [];
  if (!reviews.length) return null;
  return (
    <>
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} spotTitle={spotTitle} />
      ))}
    </>
  );
}

const AVATAR_GRADS = [
  "from-emerald-400 to-emerald-600",
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-amber-400 to-amber-600",
  "from-pink-400 to-pink-600",
  "from-cyan-400 to-cyan-600",
];

const SPOT_PHOTO_IDS = [
  "1590674899484-d5640e854abe",
  "1487958449943-2429e8be8625",
  "1494976388531-d1058494cdd8",
  "1526770632009-2a0a5f3e0a53",
  "1558618666-fcd25c85cd64",
  "1570129477492-45c003446a2e",
];

function getThumb(spotId: number) {
  const idx = (spotId * 3) % SPOT_PHOTO_IDS.length;
  return `https://images.unsplash.com/photo-${SPOT_PHOTO_IDS[idx]}?w=400&h=260&fit=crop&auto=format&q=75`;
}

export default function OwnerProfile() {
  const params = useParams<{ ownerId: string }>();
  const ownerId = parseInt(params.ownerId ?? "0", 10);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const { data, isLoading } = useListSpots(
    { ownerId },
    { query: { enabled: !!ownerId, queryKey: getListSpotsQueryKey({ ownerId }) } }
  );

  const spots = data?.spots ?? [];
  const ownerName = spots[0]?.ownerName ?? `Host #${ownerId}`;
  const ownerInitial = ownerName[0]?.toUpperCase() ?? "?";
  const avatarGrad = AVATAR_GRADS[ownerId % AVATAR_GRADS.length];

  const totalBookings = spots.reduce((s, sp) => s + (sp.totalBookings ?? 0), 0);
  const ratedSpots = spots.filter((sp) => sp.rating != null);
  const avgRating = ratedSpots.length
    ? ratedSpots.reduce((s, sp) => s + (sp.rating ?? 0), 0) / ratedSpots.length
    : null;
  const activeSpots = spots.filter((sp) => sp.isActive).length;
  const avgPrice = spots.length
    ? Math.round(spots.reduce((s, sp) => s + sp.pricePerHour, 0) / spots.length)
    : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl py-8 space-y-6 animate-pulse">
        <div className="h-36 bg-muted rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
        {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
      </div>
    );
  }

  if (spots.length === 0) {
    return (
      <div className="container mx-auto p-4 max-w-3xl py-16 text-center text-muted-foreground">
        <Car className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="font-semibold text-lg">Owner not found</p>
        <p className="text-sm mt-1">This host doesn't have any active listings yet.</p>
        <Link href="/map">
          <Button className="mt-6" size="sm">Browse all spots</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl py-8 space-y-6">
      <Link href="/map">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to map
        </button>
      </Link>

      {/* Owner hero card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/10" />
        <CardContent className="px-5 pb-5 -mt-10">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center font-bold text-white text-2xl shadow-lg border-4 border-background mb-3`}
          >
            {ownerInitial}
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">{ownerName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  ✓ Verified Host
                </Badge>
                {avgRating && (
                  <span className="flex items-center gap-1 text-sm text-amber-600 font-semibold">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} avg rating
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{spots.length} listing{spots.length !== 1 ? "s" : ""} on ParkEase</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-primary">{spots.length}</p>
          <p className="text-xs text-muted-foreground">Listings</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold">{totalBookings}</p>
          <p className="text-xs text-muted-foreground">Bookings</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-600">{activeSpots}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xl font-bold">KES {avgPrice}</p>
          <p className="text-xs text-muted-foreground">Avg/hr</p>
        </div>
      </div>

      {/* Overview badges */}
      <div className="flex flex-wrap gap-2">
        {avgRating && avgRating >= 4.0 && (
          <span className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Top-Rated Host
          </span>
        )}
        {totalBookings >= 10 && (
          <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
            <Users className="h-3.5 w-3.5" /> {totalBookings}+ Bookings
          </span>
        )}
        {spots.some((s) => s.hasCctv) && (
          <span className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
            <ShieldCheck className="h-3.5 w-3.5" /> CCTV Security
          </span>
        )}
        {spots.length >= 3 && (
          <span className="flex items-center gap-1.5 text-xs bg-violet-50 text-violet-800 border border-violet-200 px-3 py-1.5 rounded-full font-medium">
            <TrendingUp className="h-3.5 w-3.5" /> Multi-Spot Host
          </span>
        )}
      </div>

      {/* Reviews section */}
      {(() => {
        const reviewedSpots = spots.filter((s) => s.reviewCount > 0);
        const totalReviews = spots.reduce((acc, s) => acc + s.reviewCount, 0);
        if (totalReviews === 0) return null;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                What commuters say
                <Badge variant="outline" className="ml-auto text-xs">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewedSpots.map((s) => (
                <SpotReviews key={s.id} spotId={s.id} spotTitle={s.title} />
              ))}
            </CardContent>
          </Card>
        );
      })()}

      {/* Listings */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Parking Spaces</h2>
        <div className="space-y-3">
          {spots.map((spot) => (
            <Link key={spot.id} href={`/spots/${spot.id}`}>
              <Card className={`hover:border-primary/40 hover:shadow-md transition-all cursor-pointer ${!spot.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-0 overflow-hidden flex">
                  {/* Thumbnail */}
                  <div className="w-28 h-28 sm:w-36 sm:h-auto flex-shrink-0 overflow-hidden">
                    <img
                      src={getThumb(spot.id)}
                      alt={spot.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3.5 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-sm leading-tight">{spot.title}</h3>
                          {!spot.isActive && (
                            <Badge className="text-[10px] bg-gray-100 text-gray-600 border-gray-200 px-1.5">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{spot.address}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(spot.id); }}
                        className="flex-shrink-0 p-0.5"
                      >
                        <Heart className={`h-4 w-4 transition-colors ${isFavorite(spot.id) ? "fill-red-500 text-red-500" : "text-muted-foreground/30 hover:text-red-400"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-wrap gap-1">
                        {spot.hasCctv && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            <ShieldCheck className="h-2.5 w-2.5" />CCTV
                          </span>
                        )}
                        </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-primary text-sm">KES {spot.pricePerHour}/hr</p>
                        {spot.rating && (
                          <div className="flex items-center gap-0.5 justify-end">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-600">{spot.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
