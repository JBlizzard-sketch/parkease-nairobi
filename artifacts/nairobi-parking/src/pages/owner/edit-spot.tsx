import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  title: z.string().min(5),
  description: z.string().optional(),
  address: z.string().min(5),
  zone: z.string(),
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
      title: "", description: "", address: "", zone: "Westlands", pricePerHour: 150,
      availableFrom: 7, availableTo: 18, availableDays: ["Mon","Tue","Wed","Thu","Fri"],
      spotType: "driveway", hasCctv: false, hasRoofing: false, hasGate: true,
      accessInstructions: "", isActive: true, photos: "",
    },
  });

  useEffect(() => {
    if (spot) {
      form.reset({
        title: spot.title,
        description: spot.description ?? "",
        address: spot.address,
        zone: spot.zone,
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
    }
  }, [spot, form]);

  const updateSpot = useUpdateSpot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSpotQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListSpotsQueryKey({ ownerId: userId ?? undefined }) });
        toast({ title: "Spot updated!" });
        setLocation("/owner/spots");
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    const photos = values.photos ? values.photos.split("\n").map((p) => p.trim()).filter(Boolean) : [];
    updateSpot.mutate({ id, data: { ...values, photos } as any });
  };

  if (isLoading) return <div className="p-8 animate-pulse text-center">Loading spot...</div>;
  if (!spot) return <div className="p-8 text-center text-muted-foreground">Spot not found.</div>;

  return (
    <div className="container mx-auto p-4 max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner/spots">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Spot</h1>
          <p className="text-muted-foreground">{spot.title}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Spot Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Pricing & Availability</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                <FormItem><FormLabel>Price per Hour (KES)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="availableFrom" render={({ field }) => (
                  <FormItem><FormLabel>From (hour)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="availableTo" render={({ field }) => (
                  <FormItem><FormLabel>Until (hour)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
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
                            <Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              field.onChange(checked ? [...current, day] : current.filter((d) => d !== day));
                            }} />
                          </FormControl>
                          <FormLabel className="font-normal">{day}</FormLabel>
                        </FormItem>
                      )} />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Active (visible to commuters)</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Amenities & Access</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {([["hasCctv", "CCTV Surveillance"], ["hasRoofing", "Covered / Roofed"], ["hasGate", "Gated Access"]] as const).map(([name, label]) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>{label}</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="accessInstructions" render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Instructions</FormLabel>
                  <FormControl><Textarea rows={4} {...field} /></FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Revealed only after confirmed payment</p>
                </FormItem>
              )} />
              <FormField control={form.control} name="photos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo URLs (one per line)</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={updateSpot.isPending} data-testid="button-submit">
            {updateSpot.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
