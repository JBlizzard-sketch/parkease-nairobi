import { useState, useMemo } from "react";
import { useListBookings, useUpdateBookingStatus, useCreateReview, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Check, X, DollarSign, CheckCircle2, TrendingUp, Loader2, MessageSquare, Star, UserX, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-gray-100 text-gray-800 border-gray-200",
};

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

type Status = "all" | "pending" | "confirmed" | "completed" | "cancelled" | "calendar";

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-emerald-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-400",
  no_show: "bg-gray-400",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function OwnerBookings() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Status>("pending");
  const [updating, setUpdating] = useState<number | null>(null);
  const [ratingOpen, setRatingOpen] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratedBookings, setRatedBookings] = useState<Set<number>>(new Set());
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calDay, setCalDay] = useState<string | null>(null);

  const qk = () =>
    getListBookingsQueryKey({ userId: userId ?? undefined, role: "owner", limit: 100 });

  const { data: allData, isLoading } = useListBookings(
    { userId: userId ?? undefined, role: "owner", limit: 100 },
    { query: { enabled: !!userId, queryKey: qk() } }
  );

  const rateCommuter = useCreateReview({
    mutation: {
      onSuccess: (_d, vars) => {
        const bookingId = (vars.data as any).bookingId as number;
        setRatedBookings((prev) => new Set([...prev, bookingId]));
        setRatingOpen(null);
        setRatingComment("");
        setRatingValue(5);
        toast({ title: "Rating submitted!", description: "Your feedback has been recorded." });
      },
    },
  });

  const updateStatus = useUpdateBookingStatus({
    mutation: {
      onSuccess: (_d, vars) => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: qk() });
        const action = vars.data.status === "confirmed" ? "confirmed" : vars.data.status === "cancelled" ? "declined" : vars.data.status === "no_show" ? "marked as no-show" : "marked complete";
        toast({ title: `Booking ${action}`, description: vars.data.status === "confirmed" ? "The commuter has been notified." : undefined });
        setUpdating(null);
      },
      onError: () => setUpdating(null),
    },
  });

  const handleAction = (id: number, status: "confirmed" | "cancelled" | "completed" | "no_show") => {
    setUpdating(id);
    updateStatus.mutate({ id, data: { status } } as any);
  };

  const handleRate = (bookingId: number, commuterId: number) => {
    if (!userId) return;
    rateCommuter.mutate({
      data: {
        bookingId,
        reviewerId: userId,
        revieweeId: commuterId as number,
        rating: ratingValue,
        comment: ratingComment,
      } as any,
    });
  };

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  const bookings = allData?.bookings ?? [];

  const bookingsByDate = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    for (const b of bookings) {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    }
    return map;
  }, [bookings]);

  const { calFirstDay, calDaysInMonth } = useMemo(() => {
    const { year, month } = calMonth;
    return {
      calFirstDay: new Date(year, month, 1).getDay(),
      calDaysInMonth: new Date(year, month + 1, 0).getDate(),
    };
  }, [calMonth]);

  const todayStr = new Date().toISOString().split("T")[0];
  const calMonthLabel = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleString("en", { month: "long", year: "numeric" });

  const prevMonth = () => setCalMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setCalMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );
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
                <>
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                    onClick={() => handleAction(booking.id, "no_show")}
                    disabled={isUpdating}
                    title="Commuter did not show up"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    No-show
                  </Button>
                </>
              )}
              {booking.status === "completed" && !ratedBookings.has(booking.id) && ratingOpen !== booking.id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => { setRatingOpen(booking.id); setRatingValue(5); setRatingComment(""); }}
                >
                  <Star className="h-3.5 w-3.5" />
                  Rate Driver
                </Button>
              )}
              {booking.status === "completed" && ratedBookings.has(booking.id) && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Rated
                </span>
              )}
            </div>
          </div>

          {/* Inline commuter rating form */}
          {ratingOpen === booking.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Rate {booking.commuterName}
              </p>
              <div className="flex gap-1 items-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingValue(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`h-7 w-7 ${n <= ratingValue ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
                <span className="ml-1.5 text-sm font-medium text-amber-600">
                  {["", "Poor", "Fair", "Good", "Great", "Excellent"][ratingValue]}
                </span>
              </div>
              <Textarea
                rows={2}
                placeholder="Punctual? Left the space clean? (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                  onClick={() => handleRate(booking.id, booking.comuterId)}
                  disabled={rateCommuter.isPending}
                >
                  {rateCommuter.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5 fill-white" />}
                  Submit Rating
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => setRatingOpen(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
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

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Status); setCalDay(null); }}>
        <TabsList className="w-full grid grid-cols-6">
          {(["pending", "confirmed", "completed", "cancelled", "all"] as Exclude<Status, "calendar">[]).map((s) => {
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
          <TabsTrigger value="calendar" className="gap-1 text-xs sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cal</span>
          </TabsTrigger>
        </TabsList>

        {(["pending", "confirmed", "completed", "cancelled", "all"] as Exclude<Status, "calendar">[]).map((s) => (
          <TabsContent key={s} value={s} className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : (() => {
              const list = s === "all" ? bookings : s === "pending" ? pending : s === "confirmed" ? confirmed : s === "completed" ? completed : cancelled;
              return list.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No {s === "all" ? "" : s} bookings</p>
                  {s === "pending" && <p className="text-sm mt-1">New requests will appear here for you to accept or decline</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {list.map((b) => <BookingCard key={b.id} booking={b} />)}
                </div>
              );
            })()}
          </TabsContent>
        ))}

        {/* Calendar view */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="h-64 bg-muted animate-pulse rounded-xl" />
          ) : (
            <>
              <Card className="border-border/60">
                <CardContent className="p-4">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h2 className="font-bold text-base">{calMonthLabel}</h2>
                    <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-3">
                    {(["pending", "confirmed", "completed", "cancelled", "no_show"] as const).map((s) => (
                      <span key={s} className="flex items-center gap-1.5 text-[10px] text-muted-foreground capitalize">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[s])} />
                        {s.replace("_", " ")}
                      </span>
                    ))}
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-px mb-1">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 gap-px">
                    {Array.from({ length: calFirstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {Array.from({ length: calDaysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const dayBookings = bookingsByDate[dateStr] ?? [];
                      const isToday = dateStr === todayStr;
                      const isSelected = calDay === dateStr;
                      const visible = dayBookings.slice(0, 3);
                      const extra = dayBookings.length - 3;

                      return (
                        <button
                          key={day}
                          onClick={() => setCalDay(isSelected ? null : dateStr)}
                          className={cn(
                            "aspect-square rounded-lg border flex flex-col items-center justify-start pt-1 px-0.5 transition-all hover:border-primary/40 hover:bg-muted/40 text-xs leading-none",
                            isToday && !isSelected && "border-primary/50 bg-primary/5 font-bold",
                            isSelected ? "border-primary bg-primary/10 font-bold" : "border-transparent",
                            dayBookings.length > 0 ? "cursor-pointer" : "cursor-default opacity-60"
                          )}
                        >
                          <span className={cn("text-[11px]", isToday ? "text-primary font-bold" : "")}>{day}</span>
                          {dayBookings.length > 0 && (
                            <div className="flex flex-wrap gap-px justify-center mt-1">
                              {visible.map((b, bi) => (
                                <span key={bi} className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[b.status] ?? "bg-gray-300")} />
                              ))}
                              {extra > 0 && (
                                <span className="text-[8px] text-muted-foreground leading-none mt-px">+{extra}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Day detail panel */}
              {calDay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {new Date(calDay + "T12:00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      <span className="text-muted-foreground font-normal">·</span>
                      <span className="text-muted-foreground font-normal">{(bookingsByDate[calDay] ?? []).length} booking{(bookingsByDate[calDay] ?? []).length !== 1 ? "s" : ""}</span>
                    </h3>
                    <button onClick={() => setCalDay(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      ✕ Close
                    </button>
                  </div>

                  {/* Revenue for day */}
                  {(bookingsByDate[calDay] ?? []).length > 0 && (
                    <div className="flex gap-3 flex-wrap">
                      {(["pending", "confirmed", "completed"] as const).map((s) => {
                        const items = (bookingsByDate[calDay] ?? []).filter((b) => b.status === s);
                        if (items.length === 0) return null;
                        const rev = items.reduce((sum, b) => sum + b.ownerEarning, 0);
                        return (
                          <div key={s} className={cn("px-3 py-1.5 rounded-lg text-xs border", STATUS_COLORS[s])}>
                            <span className="font-bold">{items.length} {s}</span>
                            <span className="ml-1.5 opacity-80">· KES {rev.toLocaleString()} net</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-3">
                    {(bookingsByDate[calDay] ?? []).map((b) => <BookingCard key={b.id} booking={b} />)}
                  </div>
                </div>
              )}

              {/* Month summary */}
              {bookings.length > 0 && !calDay && (
                <Card className="border-border/60 bg-muted/20">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {calMonthLabel} — Overview
                    </p>
                    {(() => {
                      const monthPrefix = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}`;
                      const monthBookings = bookings.filter((b) => b.date.startsWith(monthPrefix));
                      const monthEarnings = monthBookings
                        .filter((b) => b.status === "completed")
                        .reduce((s, b) => s + b.ownerEarning, 0);
                      const activeDays = new Set(monthBookings.map((b) => b.date)).size;
                      return (
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-lg font-bold">{monthBookings.length}</p>
                            <p className="text-[10px] text-muted-foreground">Total bookings</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-primary">KES {monthEarnings.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">Net earned</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{activeDays}</p>
                            <p className="text-[10px] text-muted-foreground">Active days</p>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
