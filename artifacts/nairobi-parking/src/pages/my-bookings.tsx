import { useListBookings, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Calendar, Clock, MapPin, ArrowRight, Car } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show:   "bg-gray-100 text-gray-800 border-gray-200",
};

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

export default function MyBookings() {
  const { userId } = useCurrentUser();

  const { data: upcomingData, isLoading: upcomingLoading } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "confirmed", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "confirmed", limit: 20 }) } }
  );

  const { data: pendingData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "pending", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "pending", limit: 20 }) } }
  );

  const { data: pastData, isLoading: pastLoading } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "completed", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "completed", limit: 20 }) } }
  );

  const { data: cancelledData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", status: "cancelled", limit: 20 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "commuter", status: "cancelled", limit: 20 }) } }
  );

  if (!userId) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <Car className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold">Sign in to view bookings</h2>
        <p className="text-muted-foreground">Choose a demo persona to get started</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  const BookingCard = ({ booking }: { booking: NonNullable<typeof upcomingData>["bookings"][number] }) => (
    <Card key={booking.id} data-testid={`card-booking-${booking.id}`} className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold leading-tight">{booking.spotTitle}</h3>
              <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLORS[booking.status]}`}>
                {booking.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {booking.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {fmtHour(booking.startHour)} – {fmtHour(booking.endHour)}
              </span>
            </div>
            <p className="text-sm font-medium">KES {booking.totalAmount.toLocaleString()}</p>
          </div>
          <Link href={`/book/${booking.id}`}>
            <Button variant="outline" size="sm" className="gap-1 flex-shrink-0" data-testid={`button-view-${booking.id}`}>
              {booking.status === "pending" ? "Pay Now" : "View"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-16 text-muted-foreground">
      <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{message}</p>
      <Link href="/map">
        <Button className="mt-4" size="sm">Browse Spots</Button>
      </Link>
    </div>
  );

  const Loading = () => (
    <div className="space-y-3">
      {[1,2,3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
    </div>
  );

  const pendingAndConfirmed = [
    ...(pendingData?.bookings ?? []),
    ...(upcomingData?.bookings ?? []),
  ];

  return (
    <div className="container mx-auto p-4 max-w-3xl py-8 space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-1">Track and manage your parking reservations</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="upcoming">
            Active
            {pendingAndConfirmed.length > 0 && (
              <span className="ml-1.5 bg-primary text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {pendingAndConfirmed.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingLoading ? <Loading /> : pendingAndConfirmed.length === 0
            ? <EmptyState message="No active bookings yet" />
            : pendingAndConfirmed.map((b) => <BookingCard key={b.id} booking={b} />)
          }
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {pastLoading ? <Loading /> : !pastData?.bookings.length
            ? <EmptyState message="No completed bookings yet" />
            : pastData.bookings.map((b) => <BookingCard key={b.id} booking={b} />)
          }
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4 space-y-3">
          {!cancelledData?.bookings.length
            ? <div className="text-center py-16 text-muted-foreground"><p className="font-medium">No cancelled bookings</p></div>
            : cancelledData.bookings.map((b) => <BookingCard key={b.id} booking={b} />)
          }
        </TabsContent>
      </Tabs>
    </div>
  );
}
