import { useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const ZONES = ["Westlands", "CBD", "Upperhill", "Kilimani", "Hurlingham", "Parklands", "Karen", "Lavington", "Other"] as const;
const SPOT_TYPES = ["driveway", "compound", "basement", "open_plot", "church", "office"] as const;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

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

export default function OwnerNewSpot() {
  const { userId } = useCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      zone: "Westlands",
      lat: -1.2672,
      lng: 36.8102,
      pricePerHour: 150,
      availableFrom: 7,
      availableTo: 18,
      availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      spotType: "driveway",
      hasCctv: false,
      hasRoofing: false,
      hasGate: true,
      accessInstructions: "",
      photos: "",
    },
  });

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
    createSpot.mutate({
      data: {
        ...values,
        ownerId: userId,
        photos,
      } as any,
    });
  };

  if (!userId) return <div className="p-8 text-center">Please log in as an owner.</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner/spots">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">List a Spot</h1>
          <p className="text-muted-foreground">Turn your empty space into income</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Basic Info</CardTitle></CardHeader>
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea data-testid="input-description" placeholder="Tell commuters about your space..." rows={3} {...field} /></FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-zone"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="spotType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spot Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-spot-type"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPOT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="lat" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl><Input data-testid="input-lat" type="number" step="0.0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lng" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl><Input data-testid="input-lng" type="number" step="0.0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Pricing & Availability</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Hour (KES)</FormLabel>
                  <FormControl><Input data-testid="input-price" type="number" min={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="availableFrom" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available From (hour)</FormLabel>
                    <FormControl><Input data-testid="input-from" type="number" min={0} max={23} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="availableTo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Until (hour)</FormLabel>
                    <FormControl><Input data-testid="input-to" type="number" min={1} max={24} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="availableDays" render={() => (
                <FormItem>
                  <FormLabel>Available Days</FormLabel>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {DAYS.map((day) => (
                      <FormField key={day} control={form.control} name="availableDays" render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              data-testid={`checkbox-day-${day}`}
                              checked={field.value?.includes(day)}
                              onCheckedChange={(checked) => {
                                const current = field.value ?? [];
                                field.onChange(checked ? [...current, day] : current.filter((d) => d !== day));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">{day}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Amenities & Security</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {([["hasCctv", "CCTV Surveillance"], ["hasRoofing", "Covered / Roofed"], ["hasGate", "Gated Access"]] as const).map(([name, label]) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{label}</FormLabel>
                    <FormControl>
                      <Switch data-testid={`switch-${name}`} checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="accessInstructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="input-access"
                      placeholder="How should commuters access your space? (gate codes, guard names, etc.)"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">These are revealed only after confirmed payment</p>
                </FormItem>
              )} />
              <FormField control={form.control} name="photos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo URLs (one per line, optional)</FormLabel>
                  <FormControl>
                    <Textarea data-testid="input-photos" placeholder="https://..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={createSpot.isPending} data-testid="button-submit">
            {createSpot.isPending ? "Listing your spot..." : "List My Spot"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
