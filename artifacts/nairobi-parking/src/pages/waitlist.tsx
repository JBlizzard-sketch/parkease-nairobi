import { useGetZoneSummary, useListWaitlist, useJoinWaitlist, useLeaveWaitlist, getListWaitlistQueryKey, getGetZoneSummaryQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Clock, Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Waitlist() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: zonesData, isLoading: zonesLoading } = useGetZoneSummary();
  const { data: waitlistData, isLoading: waitlistLoading } = useListWaitlist({ userId: userId || 0 }, { query: { enabled: !!userId, queryKey: getListWaitlistQueryKey({ userId: userId || 0 }) } });

  const joinWaitlist = useJoinWaitlist();
  const leaveWaitlist = useLeaveWaitlist();

  const handleJoin = (zone: string) => {
    if (!userId) return;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hour = now.getHours();

    joinWaitlist.mutate({
      data: {
        userId,
        zone,
        date: dateStr,
        startHour: hour,
        endHour: hour + 2
      }
    }, {
      onSuccess: () => {
        toast({ title: "Joined waitlist", description: `You will be notified when a spot in ${zone} is available.` });
        queryClient.invalidateQueries({ queryKey: getListWaitlistQueryKey({ userId }) });
        queryClient.invalidateQueries({ queryKey: getGetZoneSummaryQueryKey() });
      }
    });
  };

  const handleLeave = (id: number) => {
    if (!userId) return;
    leaveWaitlist.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Left waitlist" });
        queryClient.invalidateQueries({ queryKey: getListWaitlistQueryKey({ userId }) });
        queryClient.invalidateQueries({ queryKey: getGetZoneSummaryQueryKey() });
      }
    });
  };

  if (!userId) {
    return <div className="p-8 text-center">Please login to view waitlist.</div>;
  }

  const activeWaitlistZones = new Set(waitlistData?.entries.map(e => e.zone));

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">Parking Waitlist</h1>
        <p className="text-muted-foreground">High-demand zones get full quickly. Join the waitlist to be notified instantly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {zonesLoading ? (
          <Card className="h-32 animate-pulse bg-muted border-none" />
        ) : (
          zonesData?.zones.filter(z => z.availableSpots === 0 || z.surgeMultiplier > 1).map(zone => {
            const isWaiting = activeWaitlistZones.has(zone.zone);
            const entry = waitlistData?.entries.find(e => e.zone === zone.zone);

            return (
              <Card key={zone.zone} className="border-border">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-xl">{zone.zone}</h3>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> {zone.waitlistCount} people waiting
                      </div>
                    </div>
                    {zone.surgeMultiplier > 1 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                        <Zap className="h-3 w-3" /> Surge x{zone.surgeMultiplier}
                      </span>
                    )}
                  </div>
                  
                  {isWaiting && entry ? (
                    <Button 
                      variant="outline" 
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                      onClick={() => handleLeave(entry.id)}
                      disabled={leaveWaitlist.isPending}
                    >
                      Leave Waitlist
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleJoin(zone.zone)}
                      disabled={joinWaitlist.isPending}
                    >
                      <Bell className="h-4 w-4 mr-2" /> Notify Me
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
        {zonesData?.zones.filter(z => z.availableSpots === 0 || z.surgeMultiplier > 1).length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/30 rounded-lg">
            No high-demand zones currently. Lots of parking available!
          </div>
        )}
      </div>
    </div>
  );
}