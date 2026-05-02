import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useListBookings } from "@workspace/api-client-react";
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

function buildNotifications(userId: number, role: string): Notification[] {
  const isOwner = role === "owner" || role === "both";
  const isCommuter = role === "commuter" || role === "both";
  const seed = userId % 3;

  const commuter: Notification[] = [
    {
      id: "c1", category: "bookings",
      icon: <CheckCircle2 className="h-4 w-4" />, iconBg: "bg-emerald-100 text-emerald-600",
      title: "Booking Confirmed!",
      body: "Your spot at Westlands Church Compound is confirmed for today 9 AM – 12 PM. Access code: WCC-8821.",
      time: "32 min ago", timeGroup: "today", read: false, href: "/bookings",
    },
    {
      id: "c2", category: "bookings",
      icon: <Clock className="h-4 w-4" />, iconBg: "bg-amber-100 text-amber-600",
      title: "Booking Reminder",
      body: "Your parking at Kilimani Compound starts in 2 hours. Don't forget to pay via Mpesa before arrival.",
      time: "1 hr ago", timeGroup: "today", read: false, href: "/bookings",
    },
    {
      id: "c3", category: "ratings",
      icon: <Star className="h-4 w-4" />, iconBg: "bg-yellow-100 text-yellow-600",
      title: "Rate Your Recent Visit",
      body: seed === 0
        ? "How was CBD Basement Parking? Share your experience to help other commuters."
        : "How was Upperhill Office Compound? Your feedback helps owners improve.",
      time: "3 hrs ago", timeGroup: "today", read: true, href: "/bookings",
    },
    {
      id: "c4", category: "waitlist",
      icon: <Zap className="h-4 w-4" />, iconBg: "bg-purple-100 text-purple-600",
      title: "Waitlist Spot Available!",
      body: seed === 1
        ? "A spot opened in Westlands — you're #1 on the waitlist. Claim it before it fills up!"
        : "A spot opened in CBD — you're #2 on the waitlist. One person ahead of you.",
      time: "5 hrs ago", timeGroup: "today", read: false, href: "/waitlist",
    },
    {
      id: "c5", category: "bookings",
      icon: <XCircle className="h-4 w-4" />, iconBg: "bg-red-100 text-red-500",
      title: "Booking Declined",
      body: "The owner of Karen Driveway declined your request for Saturday. Browse alternatives on the map.",
      time: "Yesterday", timeGroup: "week", read: true, href: "/map",
    },
    {
      id: "c6", category: "ratings",
      icon: <Star className="h-4 w-4" />, iconBg: "bg-yellow-100 text-yellow-600",
      title: "Owner Rated You ★★★★★",
      body: "James M. (Westlands Church) gave you 5 stars. \"Punctual and respectful of the space.\"",
      time: "2 days ago", timeGroup: "week", read: true,
    },
    {
      id: "c7", category: "waitlist",
      icon: <Bell className="h-4 w-4" />, iconBg: "bg-blue-100 text-blue-600",
      title: "Waitlist Position Updated",
      body: "You moved from #5 to #3 on the Parklands waitlist. Surge demand is high — stay alert.",
      time: "3 days ago", timeGroup: "week", read: true, href: "/waitlist",
    },
    {
      id: "c8", category: "bookings",
      icon: <Zap className="h-4 w-4" />, iconBg: "bg-orange-100 text-orange-500",
      title: "Surge Pricing Active — CBD",
      body: "Demand is 2.1× in CBD right now. Pre-book your regular spot to lock in your usual rate.",
      time: "Last week", timeGroup: "earlier", read: true, href: "/map",
    },
  ];

  const owner: Notification[] = [
    {
      id: "o1", category: "bookings",
      icon: <Car className="h-4 w-4" />, iconBg: "bg-blue-100 text-blue-600",
      title: "New Booking Request",
      body: seed === 0
        ? "Amara K. wants to park today 2 PM – 6 PM at your Westlands spot. KES 800 + 15% fee."
        : "Brian O. requests Friday 8 AM – 5 PM. KES 1,350 pending your approval.",
      time: "15 min ago", timeGroup: "today", read: false, href: "/owner/bookings",
    },
    {
      id: "o2", category: "payouts",
      icon: <Wallet className="h-4 w-4" />, iconBg: "bg-emerald-100 text-emerald-600",
      title: "Payout Processed",
      body: "KES 4,250 has been sent to your M-Pesa (+254 7** ***321) for 6 bookings this week.",
      time: "2 hrs ago", timeGroup: "today", read: false, href: "/owner/payouts",
    },
    {
      id: "o3", category: "ratings",
      icon: <Star className="h-4 w-4" />, iconBg: "bg-yellow-100 text-yellow-600",
      title: "New Review on Your Spot",
      body: "\"Great location, easy access.\" — Commuter gave your Kilimani spot ★★★★★.",
      time: "4 hrs ago", timeGroup: "today", read: true, href: "/owner/spots",
    },
    {
      id: "o4", category: "bookings",
      icon: <CheckCircle2 className="h-4 w-4" />, iconBg: "bg-emerald-100 text-emerald-600",
      title: "Booking Auto-Confirmed",
      body: "Mpesa payment received from Faith N. for tomorrow 7 AM – 9 AM. KES 340 net to you.",
      time: "6 hrs ago", timeGroup: "today", read: true, href: "/owner/bookings",
    },
    {
      id: "o5", category: "bookings",
      icon: <Zap className="h-4 w-4" />, iconBg: "bg-orange-100 text-orange-500",
      title: "Surge Pricing Activated",
      body: "Demand in your zone is 1.8× normal. Your spot is earning 80% more per hour right now.",
      time: "Yesterday", timeGroup: "week", read: true,
    },
    {
      id: "o6", category: "payouts",
      icon: <Wallet className="h-4 w-4" />, iconBg: "bg-emerald-100 text-emerald-600",
      title: "Weekly Earnings Summary",
      body: `You earned KES ${(seed === 2 ? 12400 : seed === 1 ? 9800 : 15650).toLocaleString()} this week across your ${seed + 2} active spots. Up 12% vs last week.`,
      time: "2 days ago", timeGroup: "week", read: true, href: "/owner/payouts",
    },
    {
      id: "o7", category: "bookings",
      icon: <AlertCircle className="h-4 w-4" />, iconBg: "bg-red-100 text-red-500",
      title: "No-Show Reported",
      body: "A commuter did not arrive for their 10 AM slot. The booking has been marked as no-show. No charge applied.",
      time: "3 days ago", timeGroup: "week", read: true,
    },
    {
      id: "o8", category: "ratings",
      icon: <Star className="h-4 w-4" />, iconBg: "bg-yellow-100 text-yellow-600",
      title: "Your Rating Improved",
      body: "Your average spot rating is now 4.7 ★ — up from 4.5 last month. Keep it up!",
      time: "Last week", timeGroup: "earlier", read: true, href: "/owner/spots",
    },
    {
      id: "o9", category: "payouts",
      icon: <MapPin className="h-4 w-4" />, iconBg: "bg-primary/10 text-primary",
      title: "Platform Fee Reminder",
      body: "ParkEase retains 15% of each transaction as platform fee. Your net earnings for last month: KES 42,300.",
      time: "Last week", timeGroup: "earlier", read: true, href: "/owner/payouts",
    },
  ];

  const result: Notification[] = [];
  if (isCommuter) result.push(...commuter);
  if (isOwner) result.push(...owner);
  return result;
}

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  all: "All", bookings: "Bookings", ratings: "Ratings", payouts: "Payouts", waitlist: "Waitlist",
};

const GROUP_LABELS: Record<string, string> = {
  today: "Today", week: "This Week", earlier: "Earlier",
};

export default function Notifications() {
  const { userId, role } = useCurrentUser();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<NotifCategory>("all");
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  if (!userId) {
    return (
      <div className="container mx-auto p-4 max-w-2xl py-20 text-center space-y-4">
        <BellOff className="h-16 w-16 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-bold">Sign in to see notifications</h2>
        <Button asChild><Link href="/login">Login</Link></Button>
      </div>
    );
  }

  const allNotifs = buildNotifications(userId, role ?? "commuter");
  const filtered = tab === "all" ? allNotifs : allNotifs.filter((n) => n.category === tab);
  const unreadCount = allNotifs.filter((n) => !n.read && !readSet.has(n.id)).length;

  const markAllRead = () => setReadSet(new Set(allNotifs.map((n) => n.id)));

  const groups: Array<{ key: string; items: Notification[] }> = [
    { key: "today", items: filtered.filter((n) => n.timeGroup === "today") },
    { key: "week", items: filtered.filter((n) => n.timeGroup === "week") },
    { key: "earlier", items: filtered.filter((n) => n.timeGroup === "earlier") },
  ].filter((g) => g.items.length > 0);

  const ownerCategories = role === "owner" || role === "both";

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
          {(["all", "bookings", "ratings", ownerCategories && "payouts", "waitlist"].filter(Boolean) as NotifCategory[]).map((cat) => {
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
