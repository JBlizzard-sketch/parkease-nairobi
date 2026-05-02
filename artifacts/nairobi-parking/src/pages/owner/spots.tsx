import { useListSpots, useUpdateSpot, useDeleteSpot, getListSpotsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Star, Car, Plus, Pencil, Trash2, Shield } from "lucide-react";

export default function OwnerSpots() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListSpots(
    { ownerId: userId ?? undefined },
    { query: { enabled: !!userId, queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) } }
  );

  const updateSpot = useUpdateSpot({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) }),
    },
  });

  const deleteSpot = useDeleteSpot({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) }),
    },
  });

  const handleToggle = (id: number, isActive: boolean) => {
    updateSpot.mutate({ id, data: { isActive: !isActive } });
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this spot from ParkEase?")) {
      deleteSpot.mutate({ id });
    }
  };

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Please log in as an owner.</div>;

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Spots</h1>
          <p className="text-muted-foreground mt-1">Manage your listed parking spaces</p>
        </div>
        <Link href="/owner/spots/new">
          <Button data-testid="button-add-spot" className="gap-2">
            <Plus className="h-4 w-4" />
            List a Spot
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!data?.spots || data.spots.length === 0) && (
        <div className="text-center py-20 text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No spots listed yet</p>
          <p className="text-sm mt-1">Add your first parking space and start earning</p>
          <Link href="/owner/spots/new">
            <Button className="mt-4">List Your First Spot</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.spots.map((spot) => (
          <Card key={spot.id} data-testid={`card-spot-${spot.id}`} className={`overflow-hidden transition-all ${!spot.isActive ? "opacity-60" : ""}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{spot.title}</CardTitle>
                <Switch
                  data-testid={`switch-spot-active-${spot.id}`}
                  checked={spot.isActive}
                  onCheckedChange={() => handleToggle(spot.id, spot.isActive)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{spot.address}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{spot.zone}</Badge>
                <Badge variant="secondary" className="capitalize">{spot.spotType.replace("_", " ")}</Badge>
                {spot.hasCctv && (
                  <Badge className="gap-1 bg-emerald-600 text-white">
                    <Shield className="h-3 w-3" />
                    CCTV
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-primary">KES {spot.pricePerHour}/hr</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {spot.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {spot.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {spot.totalBookings} bookings
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Link href={`/owner/spots/${spot.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1" data-testid={`button-edit-spot-${spot.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-1"
                  data-testid={`button-delete-spot-${spot.id}`}
                  onClick={() => handleDelete(spot.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
