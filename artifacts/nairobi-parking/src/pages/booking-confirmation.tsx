import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetBooking, useUpdateBookingStatus, useCreateReview, getGetBookingQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, MapPin, Smartphone, Lock, Star, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "Pending Payment",   color: "bg-amber-100 text-amber-800 border-amber-200",   icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: "Confirmed",         color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="h-4 w-4" /> },
  completed: { label: "Completed",         color: "bg-blue-100 text-blue-800 border-blue-200",       icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: "Cancelled",         color: "bg-red-100 text-red-800 border-red-200",          icon: <Clock className="h-4 w-4" /> },
};

export default function BookingConfirmation() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = parseInt(params.bookingId, 10);
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) },
  });

  const updateStatus = useUpdateBookingStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        toast({ title: "Payment confirmed!", description: `Mpesa code: ${generateMpesaCode()}` });
      },
    },
  });

  const createReview = useCreateReview({
    mutation: {
      onSuccess: () => {
        setReviewSubmitted(true);
        toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      },
    },
  });

  const generateMpesaCode = () => {
    const chars = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleMpesaPay = () => {
    const code = generateMpesaCode();
    updateStatus.mutate({ id: bookingId, data: { status: "confirmed", mpesaCode: code } });
  };

  const handleReview = () => {
    if (!userId || !booking) return;
    createReview.mutate({
      data: {
        bookingId,
        reviewerId: userId,
        spotId: booking.spotId,
        rating: reviewRating,
        comment: reviewComment,
      } as any,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-xl py-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-muted-foreground">Booking not found.</p>
        <Link href="/bookings"><Button className="mt-4">My Bookings</Button></Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

  return (
    <div className="container mx-auto p-4 max-w-xl py-8 space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/bookings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Booking #{bookingId}</h1>
      </div>

      {/* Status Card */}
      <Card className="overflow-hidden">
        <div className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-b ${statusCfg.color}`}>
          {statusCfg.icon}
          {statusCfg.label}
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <h2 className="font-bold text-lg">{booking.spotTitle}</h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{booking.spotAddress}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Date</p>
              <p className="font-semibold">{booking.date}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Time</p>
              <p className="font-semibold">{fmtHour(booking.startHour)} – {fmtHour(booking.endHour)}</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>KES {booking.pricePerHour}/hr × {booking.totalHours}h{booking.surgeMultiplier > 1 ? ` × ${booking.surgeMultiplier}×` : ""}</span>
              <span>KES {booking.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform fee (15%)</span>
              <span>−KES {booking.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5">
              <span>Total</span>
              <span className="text-primary">KES {booking.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {booking.mpesaCode && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-emerald-700 font-medium">Mpesa Confirmed</p>
                <p className="font-mono text-sm font-bold text-emerald-800">{booking.mpesaCode}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay with Mpesa */}
      {booking.status === "pending" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Pay via Mpesa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1 text-muted-foreground">
              <p>1. Go to Mpesa on your phone</p>
              <p>2. Lipa Na Mpesa → Paybill</p>
              <p className="font-medium text-foreground">Business No: 222111</p>
              <p className="font-medium text-foreground">Account: PKEASY-{bookingId}</p>
              <p className="font-medium text-foreground">Amount: KES {booking.totalAmount.toLocaleString()}</p>
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
              onClick={handleMpesaPay}
              disabled={updateStatus.isPending}
              data-testid="button-mpesa-pay"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {updateStatus.isPending ? "Processing..." : "Simulate Mpesa Payment"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Access Instructions - only after confirmed */}
      {(booking.status === "confirmed" || booking.status === "completed") && booking.accessInstructions && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
              <Lock className="h-4 w-4" />
              Access Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-900 leading-relaxed" data-testid="text-access-instructions">
              {booking.accessInstructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leave a Review */}
      {booking.status === "completed" && !reviewSubmitted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              Leave a Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  data-testid={`star-${star}`}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Share your experience with this spot..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              data-testid="input-review"
            />
            <Button
              className="w-full"
              onClick={handleReview}
              disabled={createReview.isPending}
              data-testid="button-submit-review"
            >
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}

      {reviewSubmitted && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">Review submitted — thank you!</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/bookings" className="flex-1">
          <Button variant="outline" className="w-full">My Bookings</Button>
        </Link>
        <Link href="/map" className="flex-1">
          <Button variant="outline" className="w-full">Find More Spots</Button>
        </Link>
      </div>
    </div>
  );
}
