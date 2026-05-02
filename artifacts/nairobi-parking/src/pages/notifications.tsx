import { useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useListBookings, useGetZoneSummary } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Bell, Car, Star, Wallet, Clock, Zap, CheckCircle2, XCircle, MapPin, AlertCircle, ArrowRight, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type NotifCategory = "all" | "bookings" | "ratings" | "payouts" | "waitlist";

interface Notification {
  id: string;
  category: Exclude<NotifCategory, "all">;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
  time: string;
  timeGroup: "today" | "week" | "earlier";
  read: boolean;
  href?: string;
}

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

function timeFromBooking(id: number, date: string): { time: string; timeGroup: "today" | "week" | "earlier"; read: boolean } {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(date + "T12:00:00").getTime()) / 86400000));
  let time: string;
  let timeGroup: "today" | "week" | "earlier";

  if (diff === 0) {
    const mins = 5 + (id % 55);
    time = mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)}h ago`;
    timeGroup = "today";
  } else if (diff === 1) {
    time = "Yesterday";
    timeGroup = "week";
  } else if (diff <= 7) {
    time = `${diff} days ago`;
    timeGroup = "week";
  } else {
    time = diff < 21 ? "Last week" : `${Math.floor(diff / 7)} weeks ago`;
    timeGroup = "earlier";
  }

  const read = diff > 1 || (diff === 0 && id % 4 === 0);
  return { time, timeGroup, read };
}

type BookingItem = {
  id: number;
  spotTitle: string;
  spotAddress?: string;
  date: string;
  startHour: number;
  endHour: number;
  totalAmount: number;
  ownerEarning: number;
  mpesaCode?: string;
  commuterName?: string;
  status: string;
  surgeMultiplier?: number;
};

function commuterNotifs(bookings: BookingItem[]): Notification[] {
  return bookings.flatMap((b): Notification[] => {
    const { time, timeGroup, read } = timeFromBooking(b.id, b.date);
    const window = `${fmtHour(b.startHour)}–${fmtHour(b.endHour)}`;

    switch (b.status) {
      case "pending":
        return [{
          id: `c-${b.id}-pending`,
          category: "bookings" as const,
          icon: <Clock className="h-4 w-4" />,
          iconBg: "bg-amber-100 text-amber-600",
          title: "Booking Pending Approval",
          body: `Your request for ${b.spotTitle} on ${b.date} (${window}) is awaiting owner confirmation. KES ${b.totalAmount.toLocaleString()} total.`,
          time, timeGroup, read: false, href: "/bookings",
        }];
      case "confirmed":
        return [{
          id: `c-${b.id}-confirmed`,
          category: "bookings" as const,
          icon: <CheckCircle2 className="h-4 w-4" />,
          iconBg: "bg-emerald-100 text-emerald-600",
          title: "Booking Confirmed!",
          body: `${b.spotTitle} is confirmed for ${b.date}, ${window}.${b.mpesaCode ? ` Show Mpesa code ${b.mpesaCode} on arrival.` : ""}${b.surgeMultiplier && b.surgeMultiplier > 1 ? ` (${b.surgeMultiplier}× surge active)` : ""}`,
          time, timeGroup, read, href: "/bookings",
        }];
      case "completed":
        return [{
          id: `c-${b.id}-rate`,
          category: "ratings" as const,
          icon: <Star className="h-4 w-4" />,
          iconBg: "bg-yellow-100 text-yellow-600",
          title: "Rate Your Recent Visit",
          body: `How was ${b.spotTitle}? Your honest review helps other commuters and rewards great owners.`,
          time, timeGroup, read: timeGroup !== "today", href: "/bookings",
        }];
      case "cancelled":
        return [{
          id: `c-${b.id}-cancelled`,
          category: "bookings" as const,
          icon: <XCircle className="h-4 w-4" />,
          iconBg: "bg-red-100 text-red-500",
          title: "Booking Declined",
          body: `The owner of ${b.spotTitle} declined your request for ${b.date}. Browse similar spots nearby on the map.`,
          time, timeGroup, read: true, href: "/map",
        }];
      case "no_show":
        return [{
          id: `c-${b.id}-noshow`,
          category: "bookings" as const,
          icon: <AlertCircle className="h-4 w-4" />,
          iconBg: "bg-gray-100 text-gray-500",
          title: "No-Show Recorded",
          body: `Your booking at ${b.spotTitle} on ${b.date} was marked as no-show by the owner.`,
          time, timeGroup, read: true,
        }];
      default:
        return [];
    }
  });
}

function ownerNotifs(bookings: BookingItem[]): Notification[] {
  return bookings.flatMap((b): Notification[] => {
    const { time, timeGroup, read } = timeFromBooking(b.id, b.date);
    const window = `${fmtHour(b.startHour)}–${fmtHour(b.endHour)}`;
    const name = b.commuterName ?? "A commuter";
    const net = `KES ${b.ownerEarning.toLocaleString()}`;

    switch (b.status) {
      case "pending":
        return [{
          id: `o-${b.id}-pending`,
          category: "bookings" as const,
          icon: <Car className="h-4 w-4" />,
          iconBg: "bg-blue-100 text-blue-600",
          title: "New Booking Request",
          body: `${name} wants to park at ${b.spotTitle} on ${b.date}, ${window}. KES ${b.totalAmount.toLocaleString()} pending your approval.`,
          time, timeGroup, read: false, href: "/owner/bookings",
        }];
      case "confirmed":
        return [{
          id: `o-${b.id}-confirmed`,
          category: "bookings" as const,
          icon: <CheckCircle2 className="h-4 w-4" />,
          iconBg: "bg-emerald-100 text-emerald-600",
          title: "Mpesa Payment Received",
          body: `${name} paid KES ${b.totalAmount.toLocaleString()} for ${b.spotTitle} on ${b.date}. You earn ${net} after the 15% platform fee.`,
          time, timeGroup, read, href: "/owner/bookings",
        }];
      case "completed":
        return [
          {
            id: `o-${b.id}-payout`,
            category: "payouts" as const,
            icon: <Wallet className="h-4 w-4" />,
            iconBg: "bg-emerald-100 text-emerald-600",
            title: "Payout Ready",
            body: `${net} from ${name}'s booking at ${b.spotTitle} (${b.date}) has been processed to your Mpesa.`,
            time, timeGroup, read, href: "/owner/payouts",
          },
          {
            id: `o-${b.id}-rate`,
            category: "ratings" as const,
            icon: <Star className="h-4 w-4" />,
            iconBg: "bg-yellow-100 text-yellow-600",
            title: "Rate Your Commuter",
            body: `How was ${name} as a guest at ${b.spotTitle}? Your rating helps build a trusted community.`,
            time, timeGroup, read: timeGroup !== "today", href: "/owner/bookings",
          },
        ];
      case "cancelled":
        return [{
          id: `o-${b.id}-cancelled`,
          category: "bookings" as const,
          icon: <XCircle className="h-4 w-4" />,
          iconBg: "bg-red-100 text-red-500",
          title: "Booking Cancelled",
          body: `${name}'s booking at ${b.spotTitle} for ${b.date} (${window}) was cancelled. The slot is now available again.`,
          time, timeGroup, read: true,
        }];
      case "no_show":
        return [{
          id: `o-${b.id}-noshow`,
          category: "bookings" as const,
          icon: <AlertCircle className="h-4 w-4" />,
          iconBg: "bg-gray-100 text-gray-500",
          title: "No-Show Recorded",
          body: `${name} did not arrive for their booking at ${b.spotTitle} on ${b.date}. The slot has been released.`,
          time, timeGroup, read: true,
        }];
      default:
        return [];
    }
  });
}

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  all: "All", bookings: "Bookings", ratings: "Ratings", payouts: "Payouts", waitlist: "Waitlist",
};

const GROUP_LABELS: Record<string, string> = {
  today: "Today", week: "This Week", earlier: "Earlier",
};

const GROUP_ORDER: Array<"today" | "week" | "earlier"> = ["today", "week", "earlier"];

export default function Notifications() {
  const { userId, role } = useCurrentUser();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<NotifCategory>("all");
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  const isOwner = role === "owner" || role === "both";
  const isCommuter = role === "commuter" || role === "both";

  const { data: commuterData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", limit: 30 },
    { query: { enabled: !!userId && isCommuter, queryKey: ["notifs-commuter", userId] } }
  );

  const { data: ownerData } = useListBookings(
    { userId: userId ?? undefined, role: "owner", limit: 30 },
    { query: { enabled: !!userId && isOwner, queryKey: ["notifs-owner", userId] } }
  );

  const { data: zoneSummary } = useGetZoneSummary();

  const allNotifs = useMemo(() => {
    const notifs: Notification[] = [];

    if (isCommuter && commuterData?.bookings) {
      notifs.push(...commuterNotifs(commuterData.bookings as BookingItem[]));
    }
    if (isOwner && ownerData?.bookings) {
      notifs.push(...ownerNotifs(ownerData.bookings as BookingItem[]));
    }

    // Surge platform alerts derived from real zone data
    const surgeZones = (zoneSummary?.zones ?? []).filter((z) => z.surgeMultiplier > 1);
    surgeZones.slice(0, 2).forEach((z, i) => {
      notifs.push({
        id: `surge-${z.zone}`,
        category: "bookings",
        icon: <Zap className="h-4 w-4" />,
        iconBg: "bg-orange-100 text-orange-500",
        title: "Surge Pricing Active",
        body: `Demand in ${z.zone} is ${z.surgeMultiplier}× normal right now. ${isCommuter ? "Pre-book to lock in your slot." : "Your spot is earning more per hour."}`,
        time: `${10 + i * 8} min ago`,
        timeGroup: "today",
        read: true,
        href: isOwner ? undefined : "/map",
      });
    });

    // Sort: today first, then by id descending within each group
    return notifs.sort((a, b) => {
      const gOrder = GROUP_ORDER.indexOf(a.timeGroup) - GROUP_ORDER.indexOf(b.timeGroup);
      if (gOrder !== 0) return gOrder;
      return b.id.localeCompare(a.id);
    });
  }, [commuterData, ownerData, zoneSummary, isCommuter, isOwner]);

  if (!userId) {
    return (
      <div className="container mx-auto p-4 max-w-2xl py-20 text-center space-y-4">
        <BellOff className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-bold">Sign in to see notifications</h2>
        <Button asChild><Link href="/login">Login</Link></Button>
      </div>
    );
  }

  const filtered = tab === "all" ? allNotifs : allNotifs.filter((n) => n.category === tab);
  const unreadCount = allNotifs.filter((n) => !n.read && !readSet.has(n.id)).length;

  const markAllRead = () => setReadSet(new Set(allNotifs.map((n) => n.id)));

  const groups: Array<{ key: string; items: Notification[] }> = GROUP_ORDER.map((g) => ({
    key: g,
    items: filtered.filter((n) => n.timeGroup === g),
  })).filter((g) => g.items.length > 0);

  const showPayouts = isOwner;

  return (
    <div className="container mx-auto p-4 max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-7 w-7 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {/* Category tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as NotifCategory)} className="mb-5">
        <TabsList className="w-full flex gap-1 h-auto p-1 bg-muted/60 flex-wrap">
          {(["all", "bookings", "ratings", showPayouts && "payouts", isCommuter && "waitlist"].filter(Boolean) as NotifCategory[]).map((cat) => {
            const count = cat === "all"
              ? allNotifs.filter((n) => !n.read && !readSet.has(n.id)).length
              : allNotifs.filter((n) => n.category === cat && !n.read && !readSet.has(n.id)).length;
            return (
              <TabsTrigger key={cat} value={cat} className="flex-1 gap-1.5 text-xs sm:text-sm py-1.5">
                {CATEGORY_LABELS[cat]}
                {count > 0 && (
                  <span className="bg-destructive text-white text-[9px] font-bold rounded-full px-1 py-0.5 leading-none">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <BellOff className="h-12 w-12 mx-auto text-muted-foreground opacity-25" />
          <p className="text-muted-foreground">No {tab === "all" ? "" : CATEGORY_LABELS[tab].toLowerCase() + " "}notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ key, items }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                {GROUP_LABELS[key]}
              </p>
              <div className="space-y-1">
                {items.map((notif) => {
                  const isRead = notif.read || readSet.has(notif.id);
                  const inner = (
                    <div
                      onClick={() => setReadSet((s) => new Set([...s, notif.id]))}
                      className={cn(
                        "flex gap-3 p-4 rounded-xl border transition-colors cursor-pointer group",
                        isRead
                          ? "bg-background border-border/50 hover:bg-muted/40"
                          : "bg-primary/3 border-primary/20 hover:bg-primary/5"
                      )}
                    >
                      {/* Unread dot */}
                      <div className="flex-shrink-0 pt-0.5 w-2 flex items-start justify-center">
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        )}
                      </div>

                      {/* Icon */}
                      <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5", notif.iconBg)}>
                        {notif.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-snug", isRead ? "font-normal text-foreground" : "font-semibold text-foreground")}>
                            {notif.title}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{notif.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{notif.body}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] py-0 h-4 capitalize px-1.5">
                            {notif.category}
                          </Badge>
                          {notif.href && (
                            <span className="text-[11px] text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              View <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return notif.href ? (
                    <Link key={notif.id} href={notif.href}>{inner}</Link>
                  ) : (
                    <div key={notif.id}>{inner}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-8">
          Showing {filtered.length} notification{filtered.length > 1 ? "s" : ""} · Older notifications are automatically cleared after 30 days
        </p>
      )}
    </div>
  );
}
