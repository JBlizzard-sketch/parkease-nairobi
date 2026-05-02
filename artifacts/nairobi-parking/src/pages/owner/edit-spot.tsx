import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetSpot, useUpdateSpot, getGetSpotQueryKey, getListSpotsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, Star, Car, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { MapPicker } from "@/components/map-picker";

const ZONES = ["Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham", "Parklands", "Karen", "Lavington", "Other"] as const;
const SPOT_TYPES = ["driveway", "compound", "basement", "open_plot", "church", "office"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const formSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  address: z.string().min(5),
  zone: z.string(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  pricePerHour: z.coerce.number().min(10),
  availableFrom: z.coerce.number().min(0).max(23),
  availableTo: z.coerce.number().min(1).max(24),
  availableDays: z.array(z.string()).min(1),
  spotType: z.string(),
  hasCctv: z.boolean(),
  hasRoofing: z.boolean(),
  hasGate: z.boolean(),
  accessInstructions: z.string().min(5),
  isActive: z.boolean(),
  photos: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export default function OwnerEditSpot() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: spot, isLoading } = useGetSpot(id, {
    query: { enabled: !!id, queryKey: getGetSpotQueryKey(id) },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", address: "", zone: "Westlands",
      lat: -1.2921, lng: 36.8219,
      pricePerHour: 150,
      availableFrom: 7, availableTo: 18, availableDays: ["Mon","Tue","Wed","Thu","Fri"],
      spotType: "driveway", hasCctv: false, hasRoofing: false, hasGate: true,
      accessInstructions: "", isActive: true, photos: "",
    },
  });

  const [mapKey, setMapKey] = useState("initial");

  useEffect(() => {
    if (spot) {
      form.reset({
        title: spot.title,
        description: spot.description ?? "",
        address: spot.address,
        zone: spot.zone,
        lat: (spot as any).lat ?? -1.2921,
        lng: (spot as any).lng ?? 36.8219,
        pricePerHour: spot.pricePerHour,
        availableFrom: spot.availableFrom,
        availableTo: spot.availableTo,
        availableDays: spot.availableDays,
        spotType: spot.spotType,
        hasCctv: spot.hasCctv,
        hasRoofing: spot.hasRoofing,
        hasGate: spot.hasGate,
        accessInstructions: spot.accessInstructions ?? "",
        isActive: spot.isActive,
        photos: spot.photos.join("\n"),
      });
      setMapKey(`spot-${spot.id}`);
    }
  }, [spot, form]);

  const watchedPrice = useWatch({ control: form.control, name: "pricePerHour" }) ?? 150;
  const watchedFrom = useWatch({ control: form.control, name: "availableFrom" }) ?? 7;
  const watchedTo = useWatch({ control: form.control, name: "availableTo" }) ?? 18;
  const watchedDays = useWatch({ control: form.control, name: "availableDays" }) ?? [];
  const watchedLat = useWatch({ control: form.control, name: "lat" }) ?? -1.2921;
  const watchedLng = useWatch({ control: form.control, name: "lng" }) ?? 36.8219;

  const hoursPerDay = Math.max(0, watchedTo - watchedFrom);
  const monthlyRevenue = Math.round(watchedPrice * hoursPerDay * watchedDays.length * 4.3 * 0.6 * 0.85);

  const updateSpot = useUpdateSpot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) });
        toast({ title: "Spot updated!", description: "Changes are live on ParkEase." });
        setLocation("/owner/spots");
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    const photos = values.photos ? values.photos.split("\n").map((p) => p.trim()).filter(Boolean) : [];
    updateSpot.mutate({ id, data: { ...values, photos } as any });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-5xl py-8 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }
  if (!spot) return <div className="p-8 text-center text-muted-foreground">Spot not found.</div>;

  return (
    <div className="container mx-auto p-4 max-w-5xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/owner/spots">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Edit Spot</h1>
          <p className="text-muted-foreground text-sm truncate">{spot.title}</p>
        </div>
        <Link href={`/spots/${spot.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-4 w-4" /> View Listing
          </Button>
        </Link>
      </div>

      {/* Spot stats banner */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Car className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xl font-bold">{spot.totalBookings}</p>
              <p className="text-xs text-muted-foreground">Total bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xl font-bold">{spot.rating ? spot.rating.toFixed(1) : "—"}</p>
              <p className="text-xs text-muted-foreground">{spot.reviewCount ? `${spot.reviewCount} reviews` : "No reviews yet"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold text-primary">KES {monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Est. monthly (85% share)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">📍 Basic Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Spot Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="zone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="spotType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{SPOT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium leading-none">Pin Location on Map</p>
                    <MapPicker
                      key={mapKey}
                      lat={watchedLat}
                      lng={watchedLng}
                      onChange={(lat, lng) => {
                        form.setValue("lat", lat);
                        form.setValue("lng", lng);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">💰 Pricing & Availability</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Hour (KES)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">KES</span>
                          <Input type="number" className="pl-12" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="availableFrom" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open From</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{Array.from({length: 24}, (_, i) => <SelectItem key={i} value={String(i)}>{fmtHour(i)}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="availableTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Close At</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{Array.from({length: 24}, (_, i) => i + 1).map((i) => <SelectItem key={i} value={String(i)}>{fmtHour(i)}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="availableDays" render={() => (
                    <FormItem>
                      <FormLabel>Available Days</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {DAYS.map((day) => (
                          <FormField key={day} control={form.control} name="availableDays" render={({ field }) => {
                            const checked = field.value?.includes(day);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const current = field.value ?? [];
                                  field.onChange(checked ? current.filter((d) => d !== day) : [...current, day]);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${checked ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                              >
                                {day}
                              </button>
                            );
                          }} />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <FormLabel className="text-sm font-semibold">Spot Active</FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">Visible to commuters searching for parking</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">🔒 Amenities & Access</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {([["hasCctv", "🎥 CCTV"], ["hasRoofing", "🏠 Covered"], ["hasGate", "🚪 Gated"]] as const).map(([name, emoji]) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`p-3 rounded-xl border text-center transition-all ${field.value ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}
                        >
                          <div className="text-xl mb-1">{emoji.split(" ")[0]}</div>
                          <div className="text-xs font-semibold">{emoji.split(" ")[1]}</div>
                        </button>
                      )} />
                    ))}
                  </div>
                  <FormField control={form.control} name="accessInstructions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Instructions</FormLabel>
                      <FormControl><Textarea rows={4} {...field} /></FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Revealed only after confirmed Mpesa payment
                      </p>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="photos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URLs <span className="font-normal text-muted-foreground">(one per line)</span></FormLabel>
                      <FormControl><Textarea rows={2} {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={updateSpot.isPending} data-testid="button-submit">
                {updateSpot.isPending ? "Saving changes..." : "💾 Save Changes"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-4 border-primary/20">
            <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-base text-primary">Spot Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Est. monthly earnings</p>
                <p className="text-3xl font-bold text-primary mt-1">KES {monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">at ~60% occupancy · 85% share</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{hoursPerDay}h/day × {watchedDays.length} days</span>
                  <span className="font-medium">{hoursPerDay * watchedDays.length}h/wk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KES {watchedPrice}/hr</span>
                  <span className="font-medium">KES {Math.round(watchedPrice * hoursPerDay * watchedDays.length * 0.6).toLocaleString()}/wk</span>
                </div>
              </div>

              {spot.rating && spot.reviewCount && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-800">{spot.rating.toFixed(1)} ★ Rating</p>
                    <p className="text-xs text-amber-700">{spot.reviewCount} reviews</p>
                  </div>
                  <div className="flex gap-0.5 mt-1.5">
                    {Array.from({length: 5}).map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.round(spot.rating ?? 0) ? "bg-amber-400" : "bg-amber-200"}`} />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Actions</p>
                <Link href={`/spots/${spot.id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <Eye className="h-3.5 w-3.5" /> Preview listing
                  </Button>
                </Link>
                <Link href="/owner/bookings" className="block">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <Car className="h-3.5 w-3.5" /> View bookings
                  </Button>
                </Link>
                <Link href="/owner/payouts" className="block">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 justify-start">
                    <TrendingUp className="h-3.5 w-3.5" /> Payout history
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
