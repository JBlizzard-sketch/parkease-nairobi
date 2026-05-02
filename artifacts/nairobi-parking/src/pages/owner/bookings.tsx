import { useState } from "react";
import { useListBookings, useUpdateBookingStatus, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, Check, X, DollarSign, CheckCircle2, TrendingUp, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-800 border-gray-200",
};

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

type Status = "all" | "pending" | "confirmed" | "completed" | "cancelled";

export default function OwnerBookings() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [updating, setUpdating] = useState<number | null>(null);

  const qk = () =>
    getListBookingsQueryKey({ userId: userId ?? undefined, role: "owner", limit: 100 });

  const { data: allData, isLoading } = useListBookings(
    { userId: userId ?? undefined, role: "owner", limit: 100 },
    { query: { enabled: !!userId, queryKey: qk() } }
  );

  const updateStatus = useUpdateBookingStatus({
    mutation: {
      onSuccess: (_d, vars) => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: qk() });
        const action = vars.data.status === "confirmed" ? "confirmed" : vars.data.status === "cancelled" ? "declined" : "marked complete";
        toast({ title: `Booking ${action}`, description: vars.data.status === "confirmed" ? "The commuter has been notified." : undefined });
        setUpdating(null);
      },
      onError: () => setUpdating(null),
    },
  });

  const handleAction = (id: number, status: "confirmed" | "cancelled" | "completed") => {
    setUpdating(id);
    updateStatus.mutate({ id, data: { status } });
  };

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  const bookings = allData?.bookings ?? [];
  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const totalPendingRevenue = pending.reduce((s, b) => s + b.ownerEarning, 0);
  const totalConfirmedRevenue = confirmed.reduce((s, b) => s + b.ownerEarning, 0);
  const totalEarned = completed.reduce((s, b) => s + b.ownerEarning, 0);

  const getList = () => {
    if (activeTab === "pending") return pending;
    if (activeTab === "confirmed") return confirmed;
    if (activeTab === "completed") return completed;
    if (activeTab === "cancelled") return cancelled;
    return bookings;
  };

  const BookingCard = ({ booking }: { booking: typeof bookings[number] }) => {
    const isUpdating = updating === booking.id;
    const today = new Date().toISOString().split("T")[0];
    const isPast = booking.date < today;

    return (
      <Card
        data-testid={`card-booking-${booking.id}`}
        className={cn("transition-all", booking.status === "pending" && "border-amber-200 bg-amber-50/30")}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-base leading-tight">{booking.spotTitle}</span>
                <Badge className={`text-xs border flex-shrink-0 ${STATUS_COLORS[booking.status]}`} data-testid={`status-booking-${booking.id}`}>
                  {booking.status.replace("_", " ")}
                </Badge>
                {booking.surgeMultiplier > 1 && (
                  <Badge className="text-xs bg-red-500 text-white flex-shrink-0">⚡ ×{booking.surgeMultiplier}</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">{booking.commuterName}</span>
                  <span>· {booking.commuterPhone}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {booking.date}
                  {isPast && booking.status === "confirmed" && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Past</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {fmtHour(booking.startHour)} – {fmtHour(booking.endHour)} ({booking.totalHours}h)
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-primary">KES {booking.ownerEarning.toLocaleString()} <span className="text-muted-foreground font-normal">net</span></span>
                <span className="text-muted-foreground text-xs">(KES {booking.totalAmount.toLocaleString()} gross)</span>
                {booking.mpesaCode && (
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">{booking.mpesaCode}</span>
                )}
              </div>
            </div>

            <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
              {booking.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none"
                    data-testid={`button-confirm-${booking.id}`}
                    onClick={() => handleAction(booking.id, "confirmed")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5 flex-1 sm:flex-none"
                    data-testid={`button-cancel-${booking.id}`}
                    onClick={() => handleAction(booking.id, "cancelled")}
                    disabled={isUpdating}
                  >
                    <X className="h-3.5 w-3.5" />
                    Decline
                  </Button>
                </>
              )}
              {booking.status === "confirmed" && isPast && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => handleAction(booking.id, "completed")}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Mark Done
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const list = getList();

  return (
    <div className="container mx-auto p-4 max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Booking Requests</h1>
        <p className="text-muted-foreground mt-1">Manage reservations across all your spaces</p>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-700">Pending Revenue</p>
              <p className="font-bold text-amber-900">KES {totalPendingRevenue.toLocaleString()}</p>
              <p className="text-xs text-amber-600">{pending.length} requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-700">Confirmed</p>
              <p className="font-bold text-emerald-900">KES {totalConfirmedRevenue.toLocaleString()}</p>
              <p className="text-xs text-emerald-600">{confirmed.length} upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700">Total Earned</p>
              <p className="font-bold text-blue-900">KES {totalEarned.toLocaleString()}</p>
              <p className="text-xs text-blue-600">{completed.length} completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending banner */}
      {pending.length > 0 && activeTab !== "pending" && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-800">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">{pending.length} booking request{pending.length > 1 ? "s" : ""} awaiting your response</span>
          </div>
          <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100" onClick={() => setActiveTab("pending")}>
            Review
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)}>
        <TabsList className="w-full grid grid-cols-5">
          {(["pending", "confirmed", "completed", "cancelled", "all"] as Status[]).map((s) => {
            const count = s === "all" ? bookings.length : s === "pending" ? pending.length : s === "confirmed" ? confirmed.length : s === "completed" ? completed.length : cancelled.length;
            return (
              <TabsTrigger key={s} value={s} className="capitalize text-xs sm:text-sm gap-1">
                {s}
                {count > 0 && (
                  <span className={cn("text-[10px] rounded-full px-1.5 py-0.5 leading-none font-bold",
                    s === "pending" ? "bg-amber-500 text-white" :
                    s === "confirmed" ? "bg-emerald-500 text-white" :
                    "bg-muted text-muted-foreground"
                  )}>{count}</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No {activeTab === "all" ? "" : activeTab} bookings</p>
              {activeTab === "pending" && <p className="text-sm mt-1">New requests will appear here for you to accept or decline</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
