import { useState } from "react";
import { useGetMe, useListBookings, useListReviews, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Star, Car, Calendar, Edit2, Check, X } from "lucide-react";
import { Link } from "wouter";

const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Profile() {
  const { userId, role } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const { data: user, isLoading: userLoading } = useGetMe(
    { userId: userId ?? 0 },
    { query: { enabled: !!userId, queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) } }
  );

  const { data: bookingsData } = useListBookings(
    { userId: userId ?? undefined, role: "commuter", limit: 50 },
    { query: { enabled: !!userId } }
  );

  const { data: reviewsData } = useListReviews(
    { revieweeId: userId ?? undefined },
    { query: { enabled: !!userId } }
  );

  const updateMe = useUpdateMe({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey({ userId: userId ?? 0 }) });
        toast({ title: "Profile updated!" });
        setEditing(false);
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const startEdit = () => {
    setEditName(user?.name ?? "");
    setEditPhone(user?.phone ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    if (!userId) return;
    updateMe.mutate({
      params: { userId },
      data: { name: editName, phone: editPhone },
    } as any);
  };

  if (!userId) {
    return (
      <div className="container mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Sign in to view your profile</h2>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl py-8 space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  const avgRating = reviewsData?.reviews.length
    ? reviewsData.reviews.reduce((a, r) => a + r.rating, 0) / reviewsData.reviews.length
    : null;

  const completedCount = bookingsData?.bookings.filter((b) => b.status === "completed").length ?? 0;
  const totalSpend = bookingsData?.bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + b.totalAmount, 0) ?? 0;

  return (
    <div className="container mx-auto p-4 max-w-3xl py-8 space-y-6">
      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-8" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={updateMe.isPending} className="gap-1">
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                    <Badge variant={role === "owner" ? "secondary" : "default"} className="capitalize">{user.role}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-0.5">{user.phone}</p>
                  {user.email && <p className="text-muted-foreground text-sm">{user.email}</p>}
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={startEdit}>
                    <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                </>
              )}
            </div>

            {avgRating !== null && (
              <div className="flex-shrink-0 text-center">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-xl font-bold text-foreground">{avgRating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{reviewsData?.reviews.length} reviews</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{bookingsData?.bookings.length ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">KES {(totalSpend / 1000).toFixed(1)}k</div>
            <div className="text-xs text-muted-foreground mt-1">Total Spent</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bookings">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="bookings">Booking History</TabsTrigger>
          <TabsTrigger value="reviews">Reviews About Me</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4 space-y-3">
          {!bookingsData?.bookings.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No bookings yet</p>
              <Link href="/map"><Button size="sm" className="mt-3">Find Parking</Button></Link>
            </div>
          ) : (
            bookingsData.bookings.map((booking) => (
              <Card key={booking.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm leading-snug">{booking.spotTitle}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {booking.date}
                        </span>
                        <span>{fmtHour(booking.startHour)} – {fmtHour(booking.endHour)}</span>
                      </div>
                      <p className="text-sm font-medium">KES {booking.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] ?? "bg-muted"}`}>
                        {booking.status}
                      </span>
                      <Link href={`/book/${booking.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">View</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          {!reviewsData?.reviews.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No reviews yet</p>
            </div>
          ) : (
            reviewsData.reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {review.reviewerName?.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{review.reviewerName}</span>
                    </div>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground mt-1.5">{review.comment}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
