import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSpot, useGetSurgePricing, useCreateBooking, useListReviews, getGetSpotQueryKey, getGetSurgePricingQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useFavorites } from "@/hooks/use-favorites";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Shield, Clock, Star, Car, Zap, ArrowLeft, CalendarDays, Lock, Heart, ChevronLeft, ChevronRight, Images, Share2, CheckCircle2, Phone } from "lucide-react";
import { Link } from "wouter";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
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

export default function SpotDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [photoIdx, setPhotoIdx] = useState(0);

  const { data: spot, isLoading } = useGetSpot(id, {
    query: { enabled: !!id, queryKey: getGetSpotQueryKey(id) },
  });

  const surgeZone = spot?.zone ?? null;
  const { data: surge } = useGetSurgePricing(
    { zone: surgeZone ?? "NONE", date },
    { query: { enabled: !!surgeZone, queryKey: getGetSurgePricingQueryKey({ zone: surgeZone ?? "NONE", date }) } }
  );

  const { data: reviews } = useListReviews({ spotId: id });

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

  const photos = (spot?.photos as string[] | undefined) ?? [];
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
          <Card>
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
                disabled={hours <= 0 || createBooking.isPending}
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
    </div>
  );
}
