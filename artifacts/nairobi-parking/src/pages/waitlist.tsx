import { useGetZoneSummary, useListWaitlist, useJoinWaitlist, useLeaveWaitlist, getListWaitlistQueryKey, getGetZoneSummaryQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Clock, Bell, BellOff, Users, MapPin, TrendingUp, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Waitlist() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: zonesData, isLoading: zonesLoading } = useGetZoneSummary({
    query: { queryKey: getGetZoneSummaryQueryKey() }
  });
  const { data: waitlistData } = useListWaitlist(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getListWaitlistQueryKey({ userId: userId ?? 0 }) } }
  );

  const joinWaitlist = useJoinWaitlist();
  const leaveWaitlist = useLeaveWaitlist();

  const handleJoin = (zone: string) => {
    if (!userId) return;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const hour = now.getHours();
    joinWaitlist.mutate({ data: { userId, zone, date: dateStr, startHour: hour, endHour: hour + 2 } as any }, {
      onSuccess: () => {
        toast({ title: "You're on the waitlist!", description: `We'll notify you when a spot in ${zone} opens up.` });
        queryClient.invalidateQueries({ queryKey: getListWaitlistQueryKey({ userId }) });
        queryClient.invalidateQueries({ queryKey: getGetZoneSummaryQueryKey() });
      },
    });
  };

  const handleLeave = (id: number, zone: string) => {
    leaveWaitlist.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Left waitlist", description: `Removed from ${zone} waitlist.` });
        queryClient.invalidateQueries({ queryKey: getListWaitlistQueryKey({ userId: userId ?? 0 }) });
        queryClient.invalidateQueries({ queryKey: getGetZoneSummaryQueryKey() });
      },
    });
  };

  if (!userId) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <Bell className="h-14 w-14 mx-auto text-muted-foreground opacity-30" />
        <h2 className="text-xl font-bold">Sign in to join the waitlist</h2>
        <p className="text-muted-foreground text-sm">Get notified instantly when a spot opens in your zone</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  const activeWaitlistMap = new Map(
    (waitlistData?.entries ?? []).map((e) => [e.zone, e])
  );

  const myWaitlistCount = waitlistData?.entries.length ?? 0;
  const zones = zonesData?.zones ?? [];
  const highDemandZones = zones.filter((z) => z.availableSpots === 0 || z.surgeMultiplier > 1 || z.waitlistCount > 0);
  const normalZones = zones.filter((z) => z.availableSpots > 0 && z.surgeMultiplier <= 1 && z.waitlistCount === 0);

  const ZoneCard = ({ zone }: { zone: typeof zones[number] }) => {
    const entry = activeWaitlistMap.get(zone.zone);
    const isWaiting = !!entry;
    const isFull = zone.availableSpots === 0;
    const isHighDemand = zone.surgeMultiplier > 1 || zone.waitlistCount > 0;

    return (
      <Card className={cn(
        "transition-all",
        isWaiting ? "border-primary/40 bg-primary/5" : isFull ? "border-red-200" : "border-border"
      )}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{zone.zone}</h3>
                {isWaiting && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> On list
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {zone.surgeMultiplier > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                    <Zap className="h-3 w-3" /> Surge ×{zone.surgeMultiplier}
                  </span>
                )}
                {isFull && (
                  <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                    Full
                  </span>
                )}
                {!isFull && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {zone.availableSpots} available
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-primary">KES {zone.avgPricePerHour}/hr</p>
              <p className="text-xs text-muted-foreground">avg</p>
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Occupancy</span>
              <span>{zone.totalSpots > 0 ? Math.round(((zone.totalSpots - zone.availableSpots) / zone.totalSpots) * 100) : 0}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", isFull ? "bg-red-500" : zone.surgeMultiplier > 1 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${zone.totalSpots > 0 ? ((zone.totalSpots - zone.availableSpots) / zone.totalSpots) * 100 : 0}%` }}
              />
            </div>
          </div>

          {zone.waitlistCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{zone.waitlistCount} {zone.waitlistCount === 1 ? "person" : "people"} waiting ahead of you</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {isWaiting ? (
              <>
                <Button
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => handleLeave(entry!.id, zone.zone)}
                  disabled={leaveWaitlist.isPending}
                >
                  <BellOff className="h-3.5 w-3.5" />
                  Leave
                </Button>
                <Button asChild variant="outline" className="gap-1.5">
                  <Link href={`/map?zone=${zone.zone}`}>
                    <MapPin className="h-3.5 w-3.5" />
                    Browse
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="gap-1.5 col-span-2 sm:col-span-1"
                  onClick={() => handleJoin(zone.zone)}
                  disabled={joinWaitlist.isPending}
                >
                  <Bell className="h-3.5 w-3.5" />
                  Notify Me
                </Button>
                <Button asChild variant="outline" className="gap-1.5">
                  <Link href={`/map?zone=${zone.zone}`}>
                    <MapPin className="h-3.5 w-3.5" />
                    Find Spots
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parking Waitlist</h1>
          <p className="text-muted-foreground mt-1">Get instant notifications when spots open in your favourite zones</p>
        </div>
        {myWaitlistCount > 0 && (
          <Badge className="bg-primary text-white text-sm gap-1.5 px-3 py-1.5">
            <Bell className="h-3.5 w-3.5" />
            {myWaitlistCount} active alert{myWaitlistCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* My active waitlist entries */}
      {myWaitlistCount > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <Bell className="h-4 w-4" />
              Your Active Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            {waitlistData?.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2.5 border border-primary/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">{entry.zone}</p>
                    <p className="text-xs text-muted-foreground">Notifying for {entry.date}</p>
                  </div>
                </div>
                <button
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                  onClick={() => handleLeave(entry.id, entry.zone)}
                >
                  Remove
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* High Demand Zones */}
      {!zonesLoading && highDemandZones.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-base">High Demand Zones</h2>
            <Badge variant="outline" className="text-xs">Real-time</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highDemandZones.map((zone) => <ZoneCard key={zone.zone} zone={zone} />)}
          </div>
        </div>
      )}

      {/* All Other Zones */}
      {normalZones.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-base text-muted-foreground">Other Zones</h2>
            <span className="text-xs text-muted-foreground">(availability normal)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {normalZones.map((zone) => <ZoneCard key={zone.zone} zone={zone} />)}
          </div>
        </div>
      )}

      {zonesLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => <Card key={i} className="h-52 animate-pulse bg-muted border-none" />)}
        </div>
      )}

      {!zonesLoading && zones.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No zone data available</p>
        </div>
      )}
    </div>
  );
}
