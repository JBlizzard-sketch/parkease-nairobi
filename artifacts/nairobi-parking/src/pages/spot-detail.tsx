import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetSpot, useGetSurgePricing, useCreateBooking, useListReviews, getGetSpotQueryKey, getGetSurgePricingQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Shield, Clock, Star, Car, Zap, ArrowLeft, CalendarDays, Lock } from "lucide-react";
import { Link } from "wouter";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export default function SpotDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);

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
      onError: () => toast({ title: "Booking failed", description: "This slot may already be taken.", variant: "destructive" }),
    },
  });

  const hours = endHour > startHour ? endHour - startHour : 0;
  const surgeMultiplier = surge?.multiplier ?? 1;
  const baseTotal = spot ? spot.pricePerHour * hours : 0;
  const total = Math.round(baseTotal * surgeMultiplier);
  const platformFee = Math.round(total * 0.15);
  const ownerEarning = total - platformFee;

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
      data: {
        spotId: id,
        commuterId: userId,
        ownerId: spot.ownerId,
        date,
        startHour,
        endHour,
      } as any,
    });
  };

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
      <div className="container mx-auto p-8 text-center">
        <p className="text-muted-foreground">Spot not found.</p>
        <Link href="/map"><Button className="mt-4">Browse Spots</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/map">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <nav className="text-sm text-muted-foreground">
          <Link href="/map" className="hover:text-foreground">Map</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{spot.title}</span>
        </nav>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Left: Spot Info */}
        <div className="md:col-span-3 space-y-5">
          {/* Hero */}
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{spot.title}</h1>
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{spot.address}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-primary">KES {spot.pricePerHour}</p>
                <p className="text-xs text-muted-foreground">per hour</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{spot.zone}</Badge>
              <Badge variant="secondary" className="capitalize">{spot.spotType.replace("_", " ")}</Badge>
              {spot.hasCctv && <Badge className="bg-emerald-600 text-white gap-1"><Shield className="h-3 w-3" />CCTV</Badge>}
              {spot.hasRoofing && <Badge className="bg-blue-600 text-white">Roofed</Badge>}
              {spot.hasGate && <Badge className="bg-gray-700 text-white">Gated</Badge>}
              {surgeMultiplier > 1 && (
                <Badge className="bg-destructive text-white gap-1 animate-pulse">
                  <Zap className="h-3 w-3" />Surge ×{surgeMultiplier}
                </Badge>
              )}
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
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Availability</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-muted-foreground">
                {fmtHour(spot.availableFrom)} – {fmtHour(spot.availableTo)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
                  <span
                    key={day}
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      (spot.availableDays as string[]).includes(day)
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Surge notice */}
          {surgeMultiplier > 1 && surge && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Zap className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Surge Pricing Active</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{surge.reason} — ×{surgeMultiplier} multiplier applied</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Access Instructions (only shown if confirmed) */}
          <Card className="border-dashed border-muted-foreground/40">
            <CardContent className="p-4 flex items-start gap-3">
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Access Instructions</p>
                <p className="text-sm text-muted-foreground mt-0.5">Revealed after confirmed Mpesa payment</p>
              </div>
            </CardContent>
          </Card>

          {/* Owner */}
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {spot.ownerName?.[0]}
              </div>
              <div>
                <p className="font-medium">{spot.ownerName}</p>
                <p className="text-sm text-muted-foreground">{spot.ownerPhone}</p>
              </div>
              {spot.rating && (
                <div className="ml-auto flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{spot.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({spot.reviewCount})</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          {reviews && reviews.reviews.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {reviews.reviews.map((review) => (
                  <div key={review.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{review.reviewerName}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Booking Form */}
        <div className="md:col-span-2">
          <Card className="sticky top-4 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Book This Spot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Arrive</Label>
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
                  <Label>Leave</Label>
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

              {hours > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KES {spot.pricePerHour} × {hours}h{surgeMultiplier > 1 ? ` × ${surgeMultiplier}×` : ""}</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform fee (15%)</span>
                    <span>−KES {platformFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1.5">
                    <span>Total</span>
                    <span className="text-primary">KES {total.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {hours <= 0 && (
                <p className="text-xs text-destructive">End time must be after start time</p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={hours <= 0 || createBooking.isPending}
                onClick={handleBook}
                data-testid="button-book"
              >
                {createBooking.isPending ? "Creating booking..." : "Book & Pay via Mpesa"}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Car className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{spot.totalBookings} bookings · Owner responds quickly</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
