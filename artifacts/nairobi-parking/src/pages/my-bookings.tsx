import { useListBookings, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Calendar, Clock, MapPin, ArrowRight, Car, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show:   "bg-gray-100 text-gray-800 border-gray-200",
};

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

const fmtDate = (d: string) => {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return d;
  }
};

export default function MyBookings() {
  const { userId } = useCurrentUser();

  const { data: confirmedData, isLoading: confirmedLoading } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "confirmed", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "confirmed", limit: 20 }) } }
  );

  const { data: pendingData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "pending", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "pending", limit: 20 }) } }
  );

  const { data: pastData, isLoading: pastLoading } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "completed", limit: 50 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "completed", limit: 50 }) } }
  );

  const { data: cancelledData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "cancelled", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "cancelled", limit: 20 }) } }
  );

  if (!userId) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <Car className="h-14 w-14 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-bold">Sign in to view bookings</h2>
        <p className="text-muted-foreground text-sm">Choose a demo persona to get started</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  const pending = pendingData?.bookings ?? [];
  const confirmed = confirmedData?.bookings ?? [];
  const past = pastData?.bookings ?? [];
  const cancelled = cancelledData?.bookings ?? [];
  const activeList = [...pending, ...confirmed];

  const totalSpent = past.reduce((s, b) => s + b.totalAmount, 0);
  const hoursParked = past.reduce((s, b) => s + b.totalHours, 0);

  const BookingCard = ({ booking }: { booking: typeof activeList[number] }) => {
    const isPending = booking.status === "pending";
    const isConfirmed = booking.status === "confirmed";

    return (
      <Card
        data-testid={`card-booking-${booking.id}`}
        className={cn(
          "transition-all",
          isPending && "border-amber-200 bg-amber-50/20",
          isConfirmed && "border-emerald-200 bg-emerald-50/10",
        )}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-2 min-w-0">
              {/* Spot name + status */}
              <div className="flex items-start gap-2">
                <h3 className="font-semibold leading-tight line-clamp-1 flex-1">{booking.spotTitle}</h3>
                <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLORS[booking.status]}`}>
                  {booking.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {booking.spotAddress && (
                  <span className="flex items-center gap-1 line-clamp-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[160px]">{booking.spotAddress}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmtDate(booking.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {fmtHour(booking.startHour)} – {fmtHour(booking.endHour)}
                </span>
              </div>

              {/* Price + extras */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">KES {booking.totalAmount.toLocaleString()}</span>
                {booking.surgeMultiplier > 1 && (
                  <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">⚡ ×{booking.surgeMultiplier}</span>
                )}
                {booking.mpesaCode && (
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">{booking.mpesaCode}</span>
                )}
                {isConfirmed && (
                  <span className="text-xs text-emerald-600 flex items-center gap-0.5 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Paid
                  </span>
                )}
              </div>
            </div>

            <Link href={`/book/${booking.id}`}>
              <Button
                variant={isPending ? "default" : "outline"}
                size="sm"
                className={cn("gap-1.5 flex-shrink-0 whitespace-nowrap", isPending && "bg-amber-500 hover:bg-amber-600 text-white border-0")}
                data-testid={`button-view-${booking.id}`}
              >
                {isPending ? (
                  <><CreditCard className="h-3.5 w-3.5" />Pay Now</>
                ) : (
                  <>View <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ message, sub }: { message: string; sub?: string }) => (
    <div className="text-center py-16 text-muted-foreground">
      <Car className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="font-semibold text-base">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
      <Link href="/map">
        <Button className="mt-5" size="sm">Browse Spots</Button>
      </Link>
    </div>
  );

  const Loading = () => (
    <div className="space-y-3">
      {[1,2,3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-3xl py-8 space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Track and manage your parking reservations</p>
      </div>

      {/* Stats strip */}
      {(totalSpent > 0 || hoursParked > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-bold text-primary">{past.length + confirmed.length}</p>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-bold">KES {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Spent</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5 text-center">
            <p className="text-xl font-bold">{hoursParked}h</p>
            <p className="text-xs text-muted-foreground">Hours Parked</p>
          </div>
        </div>
      )}

      {/* Pending pay-now alert */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <span className="font-semibold">{pending.length} booking{pending.length > 1 ? "s" : ""}</span> awaiting payment — pay now to confirm your spot!
          </p>
          <Link href={`/book/${pending[0]?.id}`}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0 flex-shrink-0">Pay Now</Button>
          </Link>
        </div>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="upcoming">
            Active
            {activeList.length > 0 && (
              <span className="ml-1.5 bg-primary text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {activeList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">
            Completed
            {past.length > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">
                {past.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {confirmedLoading ? <Loading /> : activeList.length === 0
            ? <EmptyState message="No active bookings yet" sub="Browse available spots and make your first booking!" />
            : activeList.map((b) => <BookingCard key={b.id} booking={b} />)
          }
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {pastLoading ? <Loading /> : past.length === 0
            ? <EmptyState message="No completed bookings yet" />
            : past.map((b) => <BookingCard key={b.id} booking={b} />)
          }
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {cancelled.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No cancelled bookings</p>
            </div>
          ) : (
            cancelled.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
