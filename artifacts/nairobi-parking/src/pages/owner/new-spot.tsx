import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSpot, getListSpotsQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, TrendingUp, Clock, DollarSign, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { MapPicker } from "@/components/map-picker";

const ZONES = ["Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham", "Parklands", "Karen", "Lavington", "Other"] as const;
const SPOT_TYPES = ["driveway", "compound", "basement", "open_plot", "church", "office"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const ZONE_CENTERS: Record<string, [number, number]> = {
  Westlands: [-1.2672, 36.8102], CBD: [-1.2841, 36.8234], Upperhill: [-1.2985, 36.8196],
  Kilimani: [-1.2964, 36.7891], Hurlingham: [-1.3002, 36.7956], Parklands: [-1.2609, 36.8166],
  Karen: [-1.3195, 36.7099], Lavington: [-1.2847, 36.7762], Other: [-1.2921, 36.8219],
};

const ZONE_AVG_PRICES: Record<string, number> = {
  Westlands: 200, CBD: 250, Upperhill: 180, Kilimani: 160,
  Hurlingham: 150, Parklands: 140, Karen: 130, Lavington: 170, Other: 120,
};

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  address: z.string().min(5, "Enter a full address"),
  zone: z.enum(ZONES),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  pricePerHour: z.coerce.number().min(10, "Minimum KES 10/hour"),
  availableFrom: z.coerce.number().min(0).max(23),
  availableTo: z.coerce.number().min(1).max(24),
  availableDays: z.array(z.string()).min(1, "Select at least one day"),
  spotType: z.enum(SPOT_TYPES),
  hasCctv: z.boolean(),
  hasRoofing: z.boolean(),
  hasGate: z.boolean(),
  accessInstructions: z.string().min(10, "Describe how commuters access the space"),
  photos: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const fmtHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

export default function OwnerNewSpot() {
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", address: "",
      zone: "Westlands", lat: -1.2672, lng: 36.8102,
      pricePerHour: 200, availableFrom: 7, availableTo: 18,
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      spotType: "driveway", hasCctv: false, hasRoofing: false, hasGate: true,
      accessInstructions: "", photos: "",
    },
  });

  const watchedPrice = useWatch({ control: form.control, name: "pricePerHour" }) ?? 200;
  const watchedFrom = useWatch({ control: form.control, name: "availableFrom" }) ?? 7;
  const watchedTo = useWatch({ control: form.control, name: "availableTo" }) ?? 18;
  const watchedDays = useWatch({ control: form.control, name: "availableDays" }) ?? [];
  const watchedZone = useWatch({ control: form.control, name: "zone" }) ?? "Westlands";
  const watchedLat = useWatch({ control: form.control, name: "lat" }) ?? -1.2672;
  const watchedLng = useWatch({ control: form.control, name: "lng" }) ?? 36.8102;

  const hoursPerDay = Math.max(0, watchedTo - watchedFrom);
  const daysPerWeek = watchedDays.length;
  const weeklyRevenue = Math.round(watchedPrice * hoursPerDay * daysPerWeek * 0.6 * 0.85);
  const monthlyRevenue = Math.round(weeklyRevenue * 4.3);
  const zoneAvg = ZONE_AVG_PRICES[watchedZone] ?? 150;
  const priceVsZone = Math.round(((watchedPrice - zoneAvg) / zoneAvg) * 100);

  const createSpot = useCreateSpot({
    mutation: {
      onSuccess: (spot) => {
        queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) });
        toast({ title: "Spot listed!", description: `${spot.title} is now live on ParkEase.` });
        setLocation("/owner/spots");
      },
      onError: () => toast({ title: "Failed to create spot", variant: "destructive" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!userId) return;
    const photos = values.photos ? values.photos.split("\n").map((p) => p.trim()).filter(Boolean) : [];
    createSpot.mutate({ data: { ...values, ownerId: userId, photos } as any });
  };

  if (!userId) return <div className="p-8 text-center">Please log in as an owner.</div>;

  return (
    <div className="container mx-auto p-4 max-w-5xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/owner/spots">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">List a New Spot</h1>
          <p className="text-muted-foreground text-sm">Turn your empty space into monthly income</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form — spans 2 cols */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2">📍 Location & Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spot Title</FormLabel>
                      <FormControl><Input data-testid="input-title" placeholder="e.g. Westlands Church Compound" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Textarea data-testid="input-description" placeholder="Tell commuters what makes your space great..." rows={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Input data-testid="input-address" placeholder="e.g. Ring Road Westlands, Near Sarit Centre" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="zone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone</FormLabel>
                        <Select onValueChange={(zone) => { field.onChange(zone); const c = ZONE_CENTERS[zone] ?? [-1.2921, 36.8219]; form.setValue("lat", c[0]); form.setValue("lng", c[1]); }} defaultValue={field.value}>
                          <FormControl><SelectTrigger data-testid="select-zone"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="spotType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spot Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger data-testid="select-spot-type"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{SPOT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium leading-none">Pin Your Spot on the Map</p>
                    <MapPicker
                      lat={watchedLat}
                      lng={watchedLng}
                      onChange={(lat, lng) => {
                        form.setValue("lat", lat, { shouldValidate: true });
                        form.setValue("lng", lng, { shouldValidate: true });
                      }}
                      flyToCenter={ZONE_CENTERS[watchedZone] ?? [-1.2921, 36.8219]}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2">💰 Pricing & Hours</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Price per Hour (KES)</FormLabel>
                        <span className="text-xs text-muted-foreground">Zone avg: KES {zoneAvg}/hr</span>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">KES</span>
                          <Input data-testid="input-price" type="number" min={10} className="pl-12" {...field} />
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
                          <FormControl><SelectTrigger data-testid="input-from"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Array.from({length: 24}, (_, i) => (
                              <SelectItem key={i} value={String(i)}>{fmtHour(i)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="availableTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Close At</FormLabel>
                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                          <FormControl><SelectTrigger data-testid="input-to"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Array.from({length: 24}, (_, i) => i + 1).map((i) => (
                              <SelectItem key={i} value={String(i)}>{fmtHour(i)}</SelectItem>
                            ))}
                          </SelectContent>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2">🔒 Amenities & Access</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {([["hasCctv", "🎥 CCTV", "Surveillance cameras"], ["hasRoofing", "🏠 Covered", "Roofed parking"], ["hasGate", "🚪 Gated", "Secure entry"]] as const).map(([name, emoji, desc]) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`p-3 rounded-xl border text-center transition-all ${field.value ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 text-muted-foreground"}`}
                        >
                          <div className="text-xl mb-1">{emoji.split(" ")[0]}</div>
                          <div className="text-xs font-semibold">{emoji.split(" ")[1]}</div>
                          <div className="text-[10px] mt-0.5">{desc}</div>
                        </button>
                      )} />
                    ))}
                  </div>
                  <FormField control={form.control} name="accessInstructions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-access"
                          placeholder="e.g. Enter through the blue gate, speak to security guard John, show booking confirmation..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Revealed only after confirmed Mpesa payment
                      </p>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="photos" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URLs <span className="text-muted-foreground font-normal">(one per line, optional)</span></FormLabel>
                      <FormControl><Textarea data-testid="input-photos" placeholder="https://..." rows={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={createSpot.isPending} data-testid="button-submit">
                {createSpot.isPending ? "Publishing your spot..." : "🚀 List My Spot on ParkEase"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Earnings Estimator Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-4 border-primary/20 shadow-sm">
            <CardHeader className="pb-3 bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                Earnings Estimator
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground">Est. monthly earnings</p>
                <p className="text-4xl font-bold text-primary mt-1">KES {monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">at ~60% occupancy</p>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{hoursPerDay}h/day × {daysPerWeek} days</span>
                  <span className="font-medium">{hoursPerDay * daysPerWeek}h/week</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />KES {watchedPrice}/hr</span>
                  <span className="font-medium">KES {weeklyRevenue.toLocaleString()}/week</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="text-muted-foreground">Your share (85%)</span>
                  <span className="font-bold text-emerald-600">KES {Math.round(monthlyRevenue).toLocaleString()}</span>
                </div>
              </div>

              {/* Price vs zone */}
              <div className={`p-3 rounded-lg text-sm ${
                Math.abs(priceVsZone) <= 10 ? "bg-emerald-50 border border-emerald-200" :
                priceVsZone > 10 ? "bg-amber-50 border border-amber-200" :
                "bg-blue-50 border border-blue-200"
              }`}>
                <p className="font-medium text-xs mb-0.5">
                  {Math.abs(priceVsZone) <= 10 ? "✅ Competitive price" :
                   priceVsZone > 10 ? "⚡ Above zone average" : "💡 Below zone average"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {watchedZone} avg is KES {zoneAvg}/hr
                  {priceVsZone !== 0 && ` (you're ${Math.abs(priceVsZone)}% ${priceVsZone > 0 ? "above" : "below"})`}
                </p>
              </div>

              {/* Surge potential */}
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Surge Pricing
                </p>
                <p className="text-xs text-muted-foreground">During high demand, ParkEase automatically applies surge multipliers (×1.5–×2) increasing your earnings by up to 100%.</p>
              </div>

              {/* Checklist */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To go live you need</p>
                {[
                  { label: "Spot title & address", done: !!form.watch("title") && !!form.watch("address") },
                  { label: "Price set", done: (form.watch("pricePerHour") ?? 0) >= 10 },
                  { label: "Access instructions", done: (form.watch("accessInstructions")?.length ?? 0) >= 10 },
                  { label: "At least 1 available day", done: (form.watch("availableDays")?.length ?? 0) > 0 },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${done ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                    <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
