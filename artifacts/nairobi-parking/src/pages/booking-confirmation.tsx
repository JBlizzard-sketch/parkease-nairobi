import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetBooking, useUpdateBookingStatus, useCreateReview, getGetBookingQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, MapPin, Smartphone, Lock, Star, ArrowLeft,
  Copy, Share2, Loader2, AlertCircle, Receipt, Car
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

const generateMpesaCode = () => {
  const chars = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

type PayStep = "idle" | "entered" | "stk_sent" | "waiting" | "success" | "failed";

const STEPS = ["Booking Created", "Pay via Mpesa", "Confirmed", "Park & Go"];

function StepIndicator({ status }: { status: string }) {
  const step = status === "pending" ? 1 : status === "confirmed" ? 2 : status === "completed" ? 3 : 1;
  return (
    <div className="flex items-center justify-between mb-6 px-1">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`flex-1 h-0.5 ${done ? "bg-primary" : "bg-muted"} transition-colors`} />}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                done ? "bg-primary border-primary text-white" :
                active ? "border-primary text-primary bg-primary/10 scale-110" :
                "border-muted-foreground/30 text-muted-foreground/50"
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step - 1 ? "bg-primary" : "bg-muted"} transition-colors`} />}
            </div>
            <span className={cn("text-[10px] font-medium text-center leading-tight hidden sm:block", active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground/50")}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function BookingConfirmation() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = parseInt(params.bookingId, 10);
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [payStep, setPayStep] = useState<PayStep>("idle");
  const [phoneNumber, setPhoneNumber] = useState("0712 345 678");
  const [countdown, setCountdown] = useState(30);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: booking, isLoading } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) },
  });

  const updateStatus = useUpdateBookingStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        setPayStep("success");
        toast({ title: "Payment confirmed!", description: `Mpesa code: ${generatedCode}` });
      },
      onError: () => {
        setPayStep("failed");
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

  useEffect(() => {
    if (payStep !== "waiting") return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          const code = generateMpesaCode();
          setGeneratedCode(code);
          updateStatus.mutate({ id: bookingId, data: { status: "confirmed", mpesaCode: code } });
          return 0;
        }
        return c - 1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [payStep]);

  const handleSendSTK = () => {
    if (!phoneNumber.trim()) return;
    setPayStep("stk_sent");
    setTimeout(() => {
      setPayStep("waiting");
      setCountdown(30);
    }, 2000);
  };

  const handleReview = () => {
    if (!userId || !booking) return;
    createReview.mutate({
      data: { bookingId, reviewerId: userId, spotId: booking.spotId, rating: reviewRating, comment: reviewComment } as any,
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-xl py-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
        <p className="font-medium">Booking not found.</p>
        <Link href="/bookings"><Button>My Bookings</Button></Link>
      </div>
    );
  }

  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="container mx-auto p-4 max-w-xl py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/bookings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Booking #{bookingId}</h1>
          <p className="text-xs text-muted-foreground">{booking.spotTitle}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleCopy(window.location.href)}
          title="Copy link"
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Step indicator */}
      {!isCancelled && <StepIndicator status={booking.status} />}

      {/* Booking Summary Card */}
      <Card className="overflow-hidden">
        <div className={cn("px-4 py-2.5 flex items-center gap-2 text-sm font-semibold border-b",
          isPending ? "bg-amber-50 text-amber-800 border-amber-200" :
          isConfirmed ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
          isCompleted ? "bg-blue-50 text-blue-800 border-blue-200" :
          "bg-red-50 text-red-800 border-red-200"
        )}>
          {isPending ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {isPending ? "Awaiting Payment" : isConfirmed ? "Confirmed — You're all set!" : isCompleted ? "Completed" : "Cancelled"}
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="font-bold text-lg leading-tight">{booking.spotTitle}</h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{booking.spotAddress}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-0.5">Date</p>
              <p className="font-semibold text-xs">{booking.date}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-0.5">From</p>
              <p className="font-semibold text-xs">{fmtHour(booking.startHour)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-0.5">Until</p>
              <p className="font-semibold text-xs">{fmtHour(booking.endHour)}</p>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-muted/40 rounded-lg p-3.5 space-y-1.5 text-sm border border-border/50">
            <div className="flex justify-between text-muted-foreground">
              <span>KES {booking.pricePerHour}/hr × {booking.totalHours}h{booking.surgeMultiplier > 1 ? ` × ${booking.surgeMultiplier}×` : ""}</span>
              <span>KES {(booking.pricePerHour * booking.totalHours).toLocaleString()}</span>
            </div>
            {booking.surgeMultiplier > 1 && (
              <div className="flex justify-between text-red-600">
                <span>Surge multiplier (×{booking.surgeMultiplier})</span>
                <span>+KES {((booking.surgeMultiplier - 1) * booking.pricePerHour * booking.totalHours).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Platform fee (15%)</span>
              <span>−KES {booking.platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-2 mt-1">
              <span>Total charged</span>
              <span className="text-primary text-base">KES {booking.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Mpesa receipt if paid */}
          {booking.mpesaCode && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Mpesa Receipt</p>
                  <p className="font-mono text-sm font-bold text-emerald-900">{booking.mpesaCode}</p>
                </div>
              </div>
              <button
                onClick={() => handleCopy(booking.mpesaCode!)}
                className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded"
                title="Copy code"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MPESA PAYMENT FLOW ── */}
      {isPending && (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Pay via Mpesa
              <Badge variant="outline" className="ml-auto text-xs font-normal">Simulated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {payStep === "idle" && (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1.5">
                  <p className="font-medium text-foreground mb-2">Lipa Na Mpesa — Paybill</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Business No.</span>
                    <span className="font-mono font-bold">222111</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account No.</span>
                    <span className="font-mono font-bold">PKEASY-{bookingId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold text-primary">KES {booking.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mpesa-phone" className="text-sm">Your Safaricom number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mpesa-phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10 font-mono"
                      placeholder="e.g. 0712 345 678"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">An STK push will be sent to this number</p>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 gap-2 font-semibold"
                  onClick={handleSendSTK}
                  data-testid="button-mpesa-pay"
                >
                  <Smartphone className="h-4 w-4" />
                  Send STK Push to {phoneNumber}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  This is a demo — no real money will be charged
                </p>
              </>
            )}

            {payStep === "stk_sent" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Smartphone className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-base">STK Push Sent!</p>
                  <p className="text-sm text-muted-foreground mt-1">Check your phone: <span className="font-mono font-medium">{phoneNumber}</span></p>
                  <p className="text-sm text-muted-foreground">Enter your Mpesa PIN to authorize the payment</p>
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Waiting for PIN entry...
                </div>
              </div>
            )}

            {payStep === "waiting" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (countdown / 30)}`}
                      className="transition-all duration-100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold font-mono text-primary">{countdown}</span>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-base">Processing Payment...</p>
                  <p className="text-sm text-muted-foreground">KES {booking.totalAmount.toLocaleString()} is being verified</p>
                </div>
                <div className="flex gap-1.5 items-center text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting to Mpesa gateway...
                </div>
              </div>
            )}

            {payStep === "success" && (
              <div className="py-6 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-xl text-emerald-700">Payment Successful!</p>
                  <p className="text-sm text-muted-foreground mt-1">Your booking is now confirmed</p>
                </div>
              </div>
            )}

            {payStep === "failed" && (
              <div className="py-4 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="font-medium">Payment failed. Please try again.</p>
                <Button variant="outline" onClick={() => setPayStep("idle")}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ACCESS INSTRUCTIONS ── */}
      {(isConfirmed || isCompleted) && booking.accessInstructions && (
        <Card className="border-emerald-300 bg-emerald-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
              <div className="p-1.5 bg-emerald-600 rounded-full">
                <Lock className="h-3.5 w-3.5 text-white" />
              </div>
              Access Instructions
              <Badge className="ml-auto bg-emerald-600 text-white text-xs">Unlocked</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-emerald-900 leading-relaxed bg-white/60 rounded-lg p-3 border border-emerald-200" data-testid="text-access-instructions">
              {booking.accessInstructions}
            </p>
            <button
              className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              onClick={() => handleCopy(booking.accessInstructions!)}
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy instructions"}
            </button>
          </CardContent>
        </Card>
      )}

      {/* ── LOCKED ACCESS HINT ── */}
      {isPending && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 flex-shrink-0" />
          Access instructions will be unlocked once payment is confirmed
        </div>
      )}

      {/* ── REVIEW SECTION ── */}
      {isCompleted && !reviewSubmitted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              Rate Your Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  data-testid={`star-${star}`}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-200"}`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-muted-foreground">
              {["", "Poor", "Fair", "Good", "Great", "Excellent!"][reviewRating]}
            </p>
            <Textarea
              placeholder="What did you love? Any feedback for the owner?"
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
              {createReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Review
            </Button>
          </CardContent>
        </Card>
      )}

      {reviewSubmitted && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Review submitted — thank you!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your feedback helps other commuters</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── BOTTOM NAV ── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Link href="/bookings">
          <Button variant="outline" className="w-full gap-2">
            <Receipt className="h-4 w-4" />My Bookings
          </Button>
        </Link>
        <Link href="/map">
          <Button variant="outline" className="w-full gap-2">
            <Car className="h-4 w-4" />Find More
          </Button>
        </Link>
      </div>
    </div>
  );
}
