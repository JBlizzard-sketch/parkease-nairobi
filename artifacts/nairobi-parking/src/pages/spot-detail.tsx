import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSpot, useGetSurgePricing, useCreateBooking, useListReviews, useListBookings, useCreateReview, useListSpots, getGetSpotQueryKey, getGetSurgePricingQueryKey, getListBookingsQueryKey, getListSpotsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFavorites } from "@/hooks/use-favorites";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Shield, Clock, Star, Car, Zap, ArrowLeft, CalendarDays, Lock, Heart, ChevronLeft, ChevronRight, Images, Share2, CheckCircle2, Phone, XCircle } from "lucide-react";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { cn } from "@/lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function createPriceIcon(price: number) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:#00A957;color:white;padding:4px 8px;border-radius:999px;font-weight:700;font-size:12px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">KES ${price}</div>`,
    iconSize: [70, 30],
    iconAnchor: [35, 30],
  });
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const SPOT_PHOTO_IDS = [
  "1590674899484-d5640e854abe",
  "1487958449943-2429e8be8625",
  "1494976388531-d1058494cdd8",
  "1526770632009-2a0a5f3e0a53",
  "1558618666-fcd25c85cd64",
  "1570129477492-45c003446a2e",
  "1449824913935-59a10b8d2000",
  "1576767479416-d0f7a41a4c03",
  "1543699565-47df2c5a9b4a",
  "1611273426858-450d8e3c9fce",
];

function getSpotPhotos(spotId: number): string[] {
  const count = 3 + (spotId % 2);
  return Array.from({ length: count }, (_, i) => {
    const idx = (spotId * 3 + i * 7) % SPOT_PHOTO_IDS.length;
    return `https://images.unsplash.com/photo-${SPOT_PHOTO_IDS[idx]}?w=800&h=500&fit=crop&auto=format&q=80`;
  });
}
const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

const QUICK_DURATIONS = [
  { label: "1h", hours: 1 },
  { label: "2h", hours: 2 },
  { label: "4h", hours: 4 },
  { label: "8h", hours: 8 },
  { label: "All day", hours: 10 },
];

const AVATAR_COLORS = [
  "from-emerald-400 to-emerald-600",
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-amber-400 to-amber-600",
];

// Zone-based 24h demand profiles (1–10 scale). Values represent typical hourly occupancy pressure.
const ZONE_DEMAND_PROFILES: Record<string, number[]> = {
  CBD:        [2,1,1,1,2,4,7,10,10,8,7,8,10,9,8,7,8,10,10,8,6,5,4,3],
  Westlands:  [2,1,1,1,2,3,5,8,9,10,9,8,9,8,7,6,7,9,9,7,5,4,3,2],
  Upperhill:  [2,1,1,1,2,4,6,9,10,9,8,8,9,10,9,8,9,10,9,7,5,4,3,2],
  Kilimani:   [2,1,1,1,2,3,4,6,8,9,10,10,10,9,8,7,7,8,8,7,5,4,3,2],
  Hurlingham: [2,1,1,1,2,3,4,6,8,9,10,9,8,9,8,7,8,9,9,7,5,4,3,2],
  Parklands:  [2,1,1,1,2,3,5,8,9,10,9,8,9,8,7,7,8,9,9,8,6,4,3,2],
  Karen:      [2,1,1,1,2,3,5,8,9,8,7,8,9,8,7,6,7,8,8,6,5,4,3,2],
  Lavington:  [2,1,1,1,2,3,4,6,8,9,9,9,10,9,8,7,8,9,9,7,5,4,3,2],
};

function getDemandData(spotId: number, zone: string): number[] {
  const base = ZONE_DEMAND_PROFILES[zone] ?? ZONE_DEMAND_PROFILES.CBD;
  return base.map((v, i) => {
    const jitter = ((spotId * 3 + i * 7) % 5) - 2; // deterministic ±2 per hour
    return Math.max(1, Math.min(10, v + jitter));
  });
}

function PeakHoursWidget({
  spotId, zone, availableFrom, availableTo, startHour, endHour, surgeMultiplier,
}: {
  spotId: number; zone: string; availableFrom: number; availableTo: number;
  startHour: number; endHour: number; surgeMultiplier: number;
}) {
  const demand = getDemandData(spotId, zone);

  // Best consecutive 2h window within available range
  let bestStart = availableFrom;
  let bestScore = Infinity;
  for (let h = availableFrom; h <= availableTo - 2; h++) {
    const score = (demand[h] ?? 5) + (demand[h + 1] ?? 5);
    if (score < bestScore) { bestScore = score; bestStart = h; }
  }

  const windowDemand = endHour > startHour
    ? demand.slice(startHour, endHour).reduce((s, v) => s + v, 0) / (endHour - startHour)
    : 0;
  const demandLevel = windowDemand <= 3 ? "Low" : windowDemand <= 6 ? "Medium" : "High";
  const demandColor = windowDemand <= 3 ? "text-emerald-600" : windowDemand <= 6 ? "text-amber-600" : "text-red-600";

  const barColor = (h: number, d: number) => {
    const available = h >= availableFrom && h < availableTo;
    const selected  = h >= startHour && h < endHour;
    if (!available) return "bg-muted";
    if (d <= 3) return selected ? "bg-emerald-600" : "bg-emerald-300";
    if (d <= 6) return selected ? "bg-amber-500"   : "bg-amber-300";
    return selected ? "bg-red-600" : "bg-red-300";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Typical Demand by Hour
        </CardTitle>
        <p className="text-xs text-muted-foreground">Hourly booking patterns in {zone} — shaded bars show your selected window</p>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {/* Bar chart */}
        <div className="flex items-end gap-[1.5px] h-14 mt-1">
          {demand.map((d, h) => (
            <div
              key={h}
              className={`flex-1 rounded-sm transition-colors ${barColor(h, d)}`}
              style={{ height: `${(d / 10) * 56}px` }}
              title={`${fmtHour(h)} — ${d <= 3 ? "Low" : d <= 6 ? "Medium" : "High"} demand`}
            />
          ))}
        </div>

        {/* X-axis */}
        <div className="flex justify-between text-[10px] text-muted-foreground/70 px-0">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>

        {/* Legend + recommendation */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 inline-block" />Low</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" />Medium</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 inline-block" />High</span>
          </div>
          {endHour > startHour && (
            <span className={`font-semibold ${demandColor}`}>{demandLevel} demand window</span>
          )}
        </div>

        {/* Smart tip */}
        {(surgeMultiplier > 1 || (endHour > startHour && windowDemand > 6)) && bestStart !== startHour && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 text-xs text-emerald-800">
            <Zap className="h-3 w-3 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>
              <span className="font-semibold">Tip:</span> Lower demand around{" "}
              <span className="font-semibold">{fmtHour(bestStart)}</span> — consider parking earlier for standard pricing.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SpotDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const today = new Date().toISOString().split("T")[0];
  const _qp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const _paramDate = _qp.get("date");
  const _paramStart = parseInt(_qp.get("start") ?? "", 10);
  const _paramEnd = parseInt(_qp.get("end") ?? "", 10);
  const [date, setDate] = useState(_paramDate && /^\d{4}-\d{2}-\d{2}$/.test(_paramDate) ? _paramDate : today);
  const [startHour, setStartHour] = useState(!isNaN(_paramStart) && _paramStart >= 0 && _paramStart < 24 ? _paramStart : 8);
  const [endHour, setEndHour] = useState(!isNaN(_paramEnd) && _paramEnd > 0 && _paramEnd <= 24 ? _paramEnd : 17);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: spot, isLoading } = useGetSpot(id, {
    query: { enabled: !!id, queryKey: getGetSpotQueryKey(id) },
  });

  const surgeZone = spot?.zone ?? null;
  const { data: surge } = useGetSurgePricing(
    { zone: surgeZone ?? "NONE", date },
    { query: { enabled: !!surgeZone, queryKey: getGetSurgePricingQueryKey({ zone: surgeZone ?? "NONE", date }) } }
  );

  const { data: reviews } = useListReviews({ spotId: id });

  const { data: similarData } = useListSpots(
    { zone: spot?.zone ?? "" },
    { query: { enabled: !!spot?.zone, queryKey: getListSpotsQueryKey({ zone: spot?.zone ?? "" }) } }
  );
  const similarSpots = (similarData?.spots ?? []).filter((s) => s.id !== id && s.isActive).slice(0, 3);

  const userBookingsParams = { userId: userId ?? undefined, role: "commuter" as const, limit: 100 };
  const { data: userBookings } = useListBookings(
    userBookingsParams,
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey(userBookingsParams) } }
  );

  const spotBookingsParams = { spotId: id, status: "confirmed" as const, limit: 100 };
  const { data: spotBookings } = useListBookings(
    spotBookingsParams,
    { query: { enabled: !!id, queryKey: getListBookingsQueryKey(spotBookingsParams) } }
  );

  const conflictBooking = useMemo(() => {
    const onDate = (spotBookings?.bookings ?? []).filter((b) => b.date === date);
    return onDate.find((b) => b.startHour < endHour && b.endHour > startHour) ?? null;
  }, [spotBookings, date, startHour, endHour]);

  const bookedHoursOnDate = useMemo(() => {
    const set = new Set<number>();
    (spotBookings?.bookings ?? [])
      .filter((b) => b.date === date)
      .forEach((b) => {
        for (let h = b.startHour; h < b.endHour; h++) set.add(h);
      });
    return set;
  }, [spotBookings, date]);

  const { addToRecent } = useRecentlyViewed();
  useEffect(() => {
    if (spot?.id) addToRecent(spot.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id]);

  const createReview = useCreateReview({
    mutation: {
      onSuccess: () => {
        setReviewSubmitted(true);
        toast({ title: "Review submitted!", description: "Thank you — it helps other drivers." });
      },
    },
  });

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: (booking) => {
        queryClient.invalidateQueries({ queryKey: getGetSpotQueryKey(id) });
        toast({ title: "Booking created!", description: "Proceed to pay via Mpesa." });
        setLocation(`/book/${booking.id}`);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "This slot may already be taken.";
        toast({ title: "Booking failed", description: msg, variant: "destructive" });
      },
    },
  });

  const hours = endHour > startHour ? endHour - startHour : 0;
  const surgeMultiplier = surge?.multiplier ?? 1;
  const baseTotal = spot ? spot.pricePerHour * hours : 0;
  const total = Math.round(baseTotal * surgeMultiplier);
  const platformFee = Math.round(total * 0.15);

  const completedBookingHere = userBookings?.bookings.find(
    (b) => b.spotId === id && b.status === "completed"
  );
  const alreadyReviewed = reviews?.reviews.some((r) => r.reviewerId === userId);
  const canReview = !!completedBookingHere && !alreadyReviewed && !reviewSubmitted;

  const handleReview = () => {
    if (!userId || !completedBookingHere) return;
    createReview.mutate({
      data: {
        bookingId: completedBookingHere.id,
        reviewerId: userId,
        spotId: id,
        rating: reviewRating,
        comment: reviewComment,
      } as any,
    });
  };

  const applyQuickDuration = (h: number) => {
    if (!spot) return;
    const from = Math.max(startHour, spot.availableFrom);
    const to = Math.min(from + h, spot.availableTo);
    setStartHour(from);
    setEndHour(to);
  };

  const handleBook = () => {
    if (!userId) {
      toast({ title: "Please log in first", description: "Select a demo persona to continue." });
      setLocation("/login");
      return;
    }
    if (!spot || hours <= 0) {
      toast({ title: "Invalid time range", description: "End time must be after start time.", variant: "destructive" });
      return;
    }
    createBooking.mutate({
      data: { spotId: id, commuterId: userId, ownerId: spot.ownerId, date, startHour, endHour } as any,
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: spot?.title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Share this spot with others." });
    }
  };

  const photos = useMemo(() => {
    const stored = (spot?.photos as string[] | undefined) ?? [];
    if (stored.length > 0) return stored;
    if (!spot) return [];
    return getSpotPhotos(spot.id);
  }, [spot]);
  const prevPhoto = () => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  const nextPhoto = () => setPhotoIdx((i) => (i + 1) % photos.length);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl py-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!spot) {
    return (
      <div className="container mx-auto p-8 text-center space-y-3">
        <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Spot not found.</p>
        <Link href="/map"><Button>Browse Spots</Button></Link>
      </div>
    );
  }

  const ownerInitial = spot.ownerName?.[0] ?? "?";
  const ownerAvatarGrad = AVATAR_COLORS[(spot.ownerId - 1) % AVATAR_COLORS.length];
  const reviewAvg = reviews?.reviews.length
    ? reviews.reviews.reduce((s, r) => s + r.rating, 0) / reviews.reviews.length
    : null;

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/map">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <nav className="text-sm text-muted-foreground flex-1 min-w-0">
          <Link href="/map" className="hover:text-foreground">Map</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground truncate">{spot.title}</span>
        </nav>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-sm text-muted-foreground"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => toggleFavorite(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors text-sm ${
              isFavorite(id) ? "border-red-300 bg-red-50 text-red-500" : "border-border hover:border-red-300 text-muted-foreground"
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite(id) ? "fill-red-500 text-red-500" : ""}`} />
            <span className="hidden sm:inline font-medium">{isFavorite(id) ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>

      {/* Photo carousel */}
      {photos.length > 0 ? (
        <div className="relative rounded-xl overflow-hidden h-56 sm:h-80 bg-muted group">
          <img
            src={photos[photoIdx]}
            alt={`${spot.title} photo ${photoIdx + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800"; }}
          />
          {photos.length > 1 && (
            <>
              <button onClick={prevPhoto} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextPhoto} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setPhotoIdx(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? "bg-white scale-125" : "bg-white/50"}`} />
                ))}
              </div>
              <div className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Images className="h-3 w-3" /> {photoIdx + 1}/{photos.length}
              </div>
            </>
          )}
          {surgeMultiplier > 1 && (
            <div className="absolute top-3 left-3 bg-destructive text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold animate-pulse">
              <Zap className="h-3.5 w-3.5" /> Surge ×{surgeMultiplier}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl h-40 sm:h-56 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No photos yet</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left: Spot Info */}
        <div className="md:col-span-3 space-y-5">
          {/* Title + price */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{spot.title}</h1>
                <div className="flex items-center gap-1 text-muted-foreground mt-1.5">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{spot.address}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-primary">KES {spot.pricePerHour}</p>
                <p className="text-xs text-muted-foreground">per hour</p>
                {reviewAvg && (
                  <div className="flex items-center gap-1 justify-end mt-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold">{reviewAvg.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({reviews!.reviews.length})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{spot.zone}</Badge>
              <Badge variant="secondary" className="capitalize">{spot.spotType.replace("_", " ")}</Badge>
              {spot.hasCctv && <Badge className="bg-emerald-600 text-white gap-1"><Shield className="h-3 w-3" />CCTV</Badge>}
              {spot.hasRoofing && <Badge className="bg-blue-600 text-white">Roofed</Badge>}
              {spot.hasGate && <Badge className="bg-gray-700 text-white">Gated</Badge>}
              {surgeMultiplier > 1 && <Badge className="bg-destructive text-white gap-1 animate-pulse"><Zap className="h-3 w-3" />Surge ×{surgeMultiplier}</Badge>}
            </div>
          </div>

          {/* Description */}
          {spot.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">About this spot</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">{spot.description}</CardContent>
            </Card>
          )}

          {/* Availability */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{fmtHour(spot.availableFrom)} – {fmtHour(spot.availableTo)}</p>
              <div className="flex flex-wrap gap-1.5">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
                  <span key={day} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${(spot.availableDays as string[]).includes(day) ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {day}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: `${spot.totalBookings} bookings`, ok: true },
                  { label: "Quick confirmation", ok: true },
                  ...(spot.hasCctv ? [{ label: "CCTV secured", ok: true }] : []),
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${ok ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Surge warning */}
          {surgeMultiplier > 1 && surge && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Zap className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Surge Pricing Active</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{surge.reason} — ×{surgeMultiplier} multiplier on the base rate</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mini-map */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div style={{ height: 200 }}>
                <MapContainer
                  center={[spot.lat, spot.lng]}
                  zoom={15}
                  style={{ height: "100%", width: "100%", zIndex: 0 }}
                  scrollWheelZoom={false}
                  zoomControl={true}
                  dragging={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[spot.lat, spot.lng]} icon={createPriceIcon(spot.pricePerHour)} />
                </MapContainer>
              </div>
              <div className="p-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{spot.address}</span>
              </div>
            </CardContent>
          </Card>

          {/* Access hint */}
          <Card className="border-dashed">
            <CardContent className="p-4 flex items-start gap-3">
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Access Instructions</p>
                <p className="text-sm text-muted-foreground mt-0.5">Gate codes and entry details are revealed after confirmed Mpesa payment.</p>
              </div>
            </CardContent>
          </Card>

          {/* Owner */}
          <Link href={`/owner-profile/${spot.ownerId}`}>
            <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${ownerAvatarGrad} flex items-center justify-center font-bold text-white text-lg flex-shrink-0`}>
                  {ownerInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{spot.ownerName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{spot.ownerPhone}</p>
                  </div>
                  <p className="text-xs text-primary mt-1">View all listings →</p>
                </div>
                {spot.rating && (
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold">{spot.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{spot.reviewCount} reviews</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Peak Hours heatmap */}
          <PeakHoursWidget
            spotId={spot.id}
            zone={spot.zone}
            availableFrom={spot.availableFrom}
            availableTo={spot.availableTo}
            startHour={startHour}
            endHour={endHour}
            surgeMultiplier={surgeMultiplier}
          />

          {/* Reviews */}
          {reviews && reviews.reviews.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    Reviews
                  </CardTitle>
                  {reviewAvg && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      {reviewAvg.toFixed(1)} avg
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.reviews.map((review) => (
                  <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {review.reviewerName?.charAt(0)}
                        </div>
                        <span className="font-semibold text-sm">{review.reviewerName}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground italic">"{review.comment}"</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Write a review — shown only to commuters with a completed booking here */}
          {canReview && (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Rate Your Stay
                </CardTitle>
                <p className="text-xs text-muted-foreground">You parked here — share your experience with other drivers.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Star picker */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Your rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`h-8 w-8 ${n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-semibold text-amber-600 self-center">
                      {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Comments <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="How was the access, security, or location?"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button
                  onClick={handleReview}
                  disabled={createReview.isPending}
                  className="w-full h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createReview.isPending ? (
                    <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Submitting...</>
                  ) : (
                    <><Star className="h-4 w-4 fill-white" /> Submit Review</>
                  )}
                </button>
              </CardContent>
            </Card>
          )}

          {/* Confirmation after submission */}
          {reviewSubmitted && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800">Review submitted — thank you!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Your {reviewRating}-star rating is now live for other drivers.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Booking Form */}
        <div className="md:col-span-2">
          <Card className="sticky top-4 shadow-lg border-primary/10">
            <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5" />
                Book This Spot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Date</Label>
                <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} data-testid="input-date" />
              </div>

              {/* Quick duration buttons */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Quick Duration</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_DURATIONS.map(({ label, hours: h }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => applyQuickDuration(h)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        endHour - startHour === h ? "bg-primary text-white border-primary" : "bg-card border-border hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Arrive</Label>
                  <Select value={String(startHour)} onValueChange={(v) => setStartHour(Number(v))}>
                    <SelectTrigger data-testid="select-start"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS.filter(h => h >= spot.availableFrom && h < spot.availableTo).map((h) => (
                        <SelectItem key={h} value={String(h)}>{fmtHour(h)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Leave</Label>
                  <Select value={String(endHour)} onValueChange={(v) => setEndHour(Number(v))}>
                    <SelectTrigger data-testid="select-end"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HOURS.filter(h => h > spot.availableFrom && h <= spot.availableTo).map((h) => (
                        <SelectItem key={h} value={String(h)}>{fmtHour(h)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Hourly timeline */}
              {spot.availableTo > spot.availableFrom && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Availability on {new Date(date + "T12:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <div className="relative">
                    <div className="flex gap-px">
                      {Array.from({ length: spot.availableTo - spot.availableFrom }, (_, i) => {
                        const h = spot.availableFrom + i;
                        const isBooked = bookedHoursOnDate.has(h);
                        const isSelected = h >= startHour && h < endHour;
                        const isConflict = isBooked && isSelected;
                        return (
                          <button
                            key={h}
                            type="button"
                            title={`${fmtHour(h)}–${fmtHour(h + 1)}: ${isBooked ? "Booked" : "Available"}`}
                            onClick={() => {
                              if (!isBooked) {
                                setStartHour(h);
                                setEndHour(Math.min(h + (endHour - startHour || 1), spot.availableTo));
                              }
                            }}
                            className={cn(
                              "flex-1 h-6 rounded-sm transition-all first:rounded-l-md last:rounded-r-md relative",
                              isConflict  ? "bg-red-500" :
                              isBooked    ? "bg-red-200 cursor-not-allowed" :
                              isSelected  ? "bg-primary" :
                                            "bg-muted hover:bg-primary/20 cursor-pointer"
                            )}
                          />
                        );
                      })}
                    </div>
                    {/* Hour labels */}
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground select-none">
                      <span>{fmtHour(spot.availableFrom)}</span>
                      {spot.availableTo - spot.availableFrom >= 8 && (
                        <span style={{ marginLeft: `${((Math.round((spot.availableFrom + spot.availableTo) / 2) - spot.availableFrom) / (spot.availableTo - spot.availableFrom)) * 100}%`, transform: "translateX(-50%)", position: "absolute", bottom: 0 }}>
                          {fmtHour(Math.round((spot.availableFrom + spot.availableTo) / 2))}
                        </span>
                      )}
                      <span>{fmtHour(spot.availableTo)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary inline-block" /> Your slot</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-200 inline-block" /> Taken</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-muted inline-block" /> Free</span>
                    {bookedHoursOnDate.size > 0 && (
                      <span className="ml-auto font-medium text-red-600">{bookedHoursOnDate.size}h booked today</span>
                    )}
                  </div>
                </div>
              )}

              {/* Availability indicator */}
              {hours > 0 && (
                <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg border ${
                  conflictBooking
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}>
                  {conflictBooking ? (
                    <>
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        <span className="font-semibold">Slot taken:</span> someone has booked{" "}
                        {fmtHour(conflictBooking.startHour)}–{fmtHour(conflictBooking.endHour)} on this date
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>
                        <span className="font-semibold">Available</span> — {fmtHour(startHour)} to {fmtHour(endHour)} on {new Date(date + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </>
                  )}
                </div>
              )}

              {hours > 0 ? (
                <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      KES {spot.pricePerHour} × {hours}h{surgeMultiplier > 1 ? ` × ×${surgeMultiplier}` : ""}
                    </span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform fee (15%)</span>
                    <span>−KES {platformFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-border pt-2">
                    <span>You pay</span>
                    <span className="text-primary text-lg">KES {total.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-destructive text-center bg-destructive/5 rounded-lg p-2">
                  End time must be after start time
                </p>
              )}

              <Button
                className="w-full h-11 text-base font-semibold"
                disabled={hours <= 0 || !!conflictBooking || createBooking.isPending}
                onClick={handleBook}
                data-testid="button-book"
              >
                {createBooking.isPending ? "Creating booking..." : "Book & Pay via Mpesa"}
              </Button>

              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  <span>Instant booking confirmation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span>{spot.totalBookings} bookings · Owner responds quickly</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SIMILAR SPOTS ── */}
      {similarSpots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">More spots in {spot.zone}</h2>
            <Link href={`/map?zone=${encodeURIComponent(spot.zone)}`} className="text-sm text-primary hover:underline font-medium">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {similarSpots.map((s) => (
              <Link key={s.id} href={`/spots/${s.id}`}>
                <div className="group rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all bg-card p-4 space-y-3 cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-1">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 line-clamp-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />{s.address}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0 capitalize">{s.spotType.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-primary text-base">KES {s.pricePerHour}<span className="text-xs font-normal text-muted-foreground">/hr</span></span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {s.rating ? (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {s.rating.toFixed(1)}
                        </span>
                      ) : null}
                      {s.hasCctv && <Shield className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
