import { useListBookings, useUpdateBookingStatus, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, Check, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function OwnerBookings() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useListBookings(
    { userId: userId ?? undefined, role: "owner", limit: 50 },
    { query: { enabled: !!userId, queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "owner", limit: 50 }) } }
  );

  const updateStatus = useUpdateBookingStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ userId: userId ?? undefined, role: "owner", limit: 50 }) });
        toast({ title: "Booking updated" });
      },
    },
  });

  const handleAction = (id: number, status: "confirmed" | "cancelled") => {
    updateStatus.mutate({ id, data: { status } });
  };

  const formatHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incoming Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage reservations across all your spots</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      )}

      {!isLoading && (!data?.bookings || data.bookings.length === 0) && (
        <div className="text-center py-20 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Bookings will appear here when commuters reserve your spots</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.bookings.map((booking) => (
          <Card key={booking.id} data-testid={`card-booking-${booking.id}`} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{booking.spotTitle}</span>
                    <Badge className={`text-xs border ${STATUS_COLORS[booking.status]}`} data-testid={`status-booking-${booking.id}`}>
                      {booking.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {booking.commuterName} · {booking.commuterPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {booking.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatHour(booking.startHour)} – {formatHour(booking.endHour)}
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    KES {booking.totalAmount.toLocaleString()}
                    <span className="text-muted-foreground font-normal ml-1">· You earn KES {booking.ownerEarning.toLocaleString()}</span>
                  </div>
                </div>

                {booking.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid={`button-confirm-${booking.id}`}
                      onClick={() => handleAction(booking.id, "confirmed")}
                      disabled={updateStatus.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      data-testid={`button-cancel-${booking.id}`}
                      onClick={() => handleAction(booking.id, "cancelled")}
                      disabled={updateStatus.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
